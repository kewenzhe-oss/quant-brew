"""
LLM prompt construction and response parsing for AI experiment pipeline.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from app.services.indicator_params import IndicatorParamsParser
from app.utils.logger import get_logger

logger = get_logger(__name__)

SYSTEM_PROMPT = """You are a quantitative trading strategy optimization expert.
Your task is to propose parameter combinations for backtesting a trading indicator.
You MUST return ONLY valid JSON — no explanations, no markdown fences.
The JSON must be an array of objects."""

_ROUND_TEMPLATE = """\
## Indicator Code
```python
{indicator_code}
```

## Tunable Indicator Parameters (extracted from @param annotations)
{indicator_params_block}

## Risk / Position Parameters (always tunable)
- stopLossPct: stop-loss as a fraction of price (0 = disabled, typical 0.01-0.10)
- takeProfitPct: take-profit as a fraction of price (0 = disabled, typical 0.02-0.20)
- entryPct: position size as fraction of capital (0.1-1.0)
- leverage: leverage multiplier (1-10, integer)
- trailingStop.enabled: true/false
- trailingStop.pct: trailing stop distance as fraction (0.005-0.05)
- trailingStop.activationPct: trailing activation threshold (0.01-0.10)

## Market Regime
{regime_block}

## Previous Round Results
{previous_results_block}

## Task
Generate exactly {n_candidates} diverse parameter sets.
Each set MUST contain both indicatorParams and riskParams.
{learning_instruction}

Return a JSON array:
[
  {{
    "name": "short descriptive name",
    "reasoning": "1 sentence why this combination should perform well",
    "indicatorParams": {{ ... }},
    "riskParams": {{
      "stopLossPct": <float>,
      "takeProfitPct": <float>,
      "entryPct": <float>,
      "leverage": <int>,
      "trailingStop": {{ "enabled": <bool>, "pct": <float>, "activationPct": <float> }}
    }}
  }}
]"""


def infer_indicator_params(code: str) -> List[Dict[str, Any]]:
    """Scan indicator code to heuristically detect tunable periods or windows."""
    params = []
    seen_names = set()
    
    # 1. Look for typical parameter variable assignments
    # e.g., fast_period = 9, slow_period = 21, rolling_window = 14
    assign_pattern = r'\b(\w*period\w*|\w*window\w*|\w*length\w*|\w*span\w*)\s*=\s*(\d+)\b'
    for match in re.finditer(assign_pattern, code or '', re.IGNORECASE):
        name = match.group(1)
        val_str = match.group(2)
        if name.lower() not in seen_names:
            seen_names.add(name.lower())
            try:
                val = int(val_str)
                params.append({
                    "name": name,
                    "type": "int",
                    "default": val,
                    "description": f"Inferred period variable: {name}",
                    "inferred": True
                })
            except ValueError:
                continue

    # 2. Look for literal numbers inside common rolling/ewm function calls
    patterns = [
        (r'span\s*=\s*(\d+)', 'int', 'EWM span'),
        (r'window\s*=\s*(\d+)', 'int', 'rolling window'),
        (r'rolling\(\s*(\d+)\s*\)', 'int', 'rolling window'),
        (r'period\s*=\s*(\d+)', 'int', 'indicator period'),
        (r'length\s*=\s*(\d+)', 'int', 'indicator length'),
    ]

    seen_defaults = set(p['default'] for p in params)
    for pattern, p_type, desc in patterns:
        for match in re.finditer(pattern, code or '', re.IGNORECASE):
            val_str = match.group(1)
            try:
                val = int(val_str) if p_type == 'int' else float(val_str)
            except ValueError:
                continue
            
            if val in seen_defaults:
                continue

            seen_defaults.add(val)
            name = f"inferred_param_{len(params) + 1}"
            params.append({
                "name": name,
                "type": p_type,
                "default": val,
                "description": f"Inferred {desc}",
                "inferred": True
            })
            
    return params


def extract_indicator_params(code: str) -> List[Dict[str, Any]]:
    """Parse @param declarations from indicator code, falling back to inference if none."""
    params = IndicatorParamsParser.parse_params(code or '')
    if not params:
        params = infer_indicator_params(code or '')
    return params


def _format_indicator_params(params: List[Dict[str, Any]]) -> str:
    if not params:
        return "(No tunable params found — indicator has no tunable params)"
    lines = []
    for p in params:
        tag = " [Inferred]" if p.get('inferred') else ""
        line = f"- {p['name']} ({p['type']}): default={p['default']}{tag}"
        if p.get('description'):
            line += f"  — {p['description']}"
        lines.append(line)
    return "\n".join(lines)


def _format_regime(regime: Optional[Dict[str, Any]]) -> str:
    if not regime:
        return "Not available."
    features = regime.get('features') or {}
    parts = [
        f"Regime: {regime.get('label') or regime.get('regime', 'unknown')}",
        f"Confidence: {regime.get('confidence', 0):.0%}",
    ]
    if features:
        parts.append(f"Price change: {features.get('priceChangePct', 0):.2f}%")
        parts.append(f"Volatility: {features.get('realizedVolPct', 0):.2f}%")
        parts.append(f"ATR%: {features.get('atrPct', 0):.2f}%")
        parts.append(f"Efficiency: {features.get('directionalEfficiency', 0):.2f}")
    return " | ".join(parts)


def _format_previous_results(results: Optional[List[Dict[str, Any]]]) -> str:
    if not results:
        return "This is Round 1 — no previous results."
    lines = []
    for r in results:
        score = (r.get('score') or {})
        result = (r.get('result') or {})
        line = (
            f"- {r.get('name', '?')}: "
            f"score={score.get('overallScore', 0):.1f} "
            f"grade={score.get('grade', '?')} "
            f"return={result.get('totalReturn', 0):.2f}% "
            f"drawdown={result.get('maxDrawdown', 0):.2f}% "
            f"sharpe={result.get('sharpeRatio', 0):.2f} "
            f"trades={result.get('totalTrades', 0)}"
        )
        lines.append(line)
    return "\n".join(lines)


def build_round_prompt(
    *,
    indicator_code: str,
    indicator_params: List[Dict[str, Any]],
    regime: Optional[Dict[str, Any]],
    previous_results: Optional[List[Dict[str, Any]]],
    round_number: int,
    n_candidates: int = 5,
) -> str:
    """Build the user-message prompt for one optimization round."""
    if previous_results:
        learning = (
            "Analyze the previous results carefully. "
            "Identify patterns: which parameter ranges yielded high scores vs low scores. "
            "Propose parameters that explore promising directions while also trying novel approaches."
        )
    else:
        learning = (
            "Since this is the first round, propose a diverse spread of parameters: "
            "some conservative (tight stops, smaller positions), some moderate, some aggressive."
        )

    return _ROUND_TEMPLATE.format(
        indicator_code=indicator_code[:4000],
        indicator_params_block=_format_indicator_params(indicator_params),
        regime_block=_format_regime(regime),
        previous_results_block=_format_previous_results(previous_results),
        n_candidates=n_candidates,
        learning_instruction=learning,
    )


def parse_llm_candidates(raw_text: str) -> List[Dict[str, Any]]:
    """Parse LLM response into a list of candidate parameter dicts with robust auto-recovery."""
    text = raw_text.strip()
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl != -1:
            text = text[first_nl + 1:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    # Try direct parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return [_normalize_candidate(c) for c in parsed if isinstance(c, dict)]
        if isinstance(parsed, dict) and 'candidates' in parsed:
            return [_normalize_candidate(c) for c in parsed['candidates'] if isinstance(c, dict)]
        if isinstance(parsed, dict):
            return [_normalize_candidate(parsed)]
    except json.JSONDecodeError:
        pass

    # Suffix recovery array list if JSON was truncated by provider
    recovery_suffixes = [
        ']', '}', '}]', '}]}', '"}', '"}]', '"}]}', 
        '"riskParams": {}}]',
        '"riskParams": {"stopLossPct": 0.02}}]',
        '"riskParams": {"stopLossPct": 0.02, "takeProfitPct": 0.05}}]}',
        '"riskParams": {"stopLossPct": 0.02, "takeProfitPct": 0.05, "entryPct": 0.5, "leverage": 1, "trailingStop": {"enabled": false, "pct": 0.02, "activationPct": 0.01}}}]'
    ]
    for suffix in recovery_suffixes:
        try:
            parsed = json.loads(text + suffix)
            if isinstance(parsed, list):
                return [_normalize_candidate(c) for c in parsed if isinstance(c, dict)]
            if isinstance(parsed, dict) and 'candidates' in parsed:
                return [_normalize_candidate(c) for c in parsed['candidates'] if isinstance(c, dict)]
        except json.JSONDecodeError:
            continue

    # Fallback: extract JSON array substring
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        try:
            arr = json.loads(match.group())
            return [_normalize_candidate(c) for c in arr if isinstance(c, dict)]
        except json.JSONDecodeError:
            pass

    logger.warning("Failed to parse LLM candidates from response")
    return []


def _normalize_candidate(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure candidate has the expected structure."""
    indicator_params = raw.get('indicatorParams') or raw.get('indicator_params') or {}
    risk_raw = raw.get('riskParams') or raw.get('risk_params') or {}
    trailing_raw = risk_raw.get('trailingStop') or risk_raw.get('trailing_stop') or {}

    return {
        'name': str(raw.get('name') or 'unnamed'),
        'reasoning': str(raw.get('reasoning') or ''),
        'indicatorParams': indicator_params,
        'riskParams': {
            'stopLossPct': _clamp(float(risk_raw.get('stopLossPct', 0)), 0, 1),
            'takeProfitPct': _clamp(float(risk_raw.get('takeProfitPct', 0)), 0, 5),
            'entryPct': _clamp(float(risk_raw.get('entryPct', 0.5)), 0.01, 1),
            'leverage': max(1, int(risk_raw.get('leverage', 1))),
            'trailingStop': {
                'enabled': bool(trailing_raw.get('enabled', False)),
                'pct': _clamp(float(trailing_raw.get('pct', 0.02)), 0, 0.5),
                'activationPct': _clamp(float(trailing_raw.get('activationPct', 0.01)), 0, 0.5),
            },
        },
    }


def _clamp(value: float, lo: float, hi: float) -> float:
    try:
        return max(lo, min(hi, float(value)))
    except (TypeError, ValueError):
        return lo
