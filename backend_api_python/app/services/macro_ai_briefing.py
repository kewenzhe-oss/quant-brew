import json
import os
import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.utils.logger import get_logger
from app.services.macro_snapshot import read_macro_snapshot
from app.utils.cache import CacheManager
from app.services.macro_regime import classify_macro_regime

logger = get_logger(__name__)

MACRO_BRIEFING_KEY = "macro:briefing:latest"
MACRO_BRIEFING_TTL = 86400 * 2  # Keep 2 days

def build_macro_briefing_prompt(metrics: Dict[str, Any], previous_briefing: Optional[Dict[str, Any]], regime: Dict[str, Any]) -> str:
    """Build the strict prompt for the LLM."""
    prompt = """You are a macro research assistant for QuantDinger 2.0.

Your task is to generate a daily macro briefing for ordinary long-term investors.

You must strictly adhere to these rules:
1. You must only use the provided macro data. Do not invent data.
2. Do not give trading instructions. Do not use BUY / SELL / HOLD.
3. Do not provide target prices, expected returns, win rates, or guarantees.
4. Keep the tone objective and institutional. Use labels like "regime", "scenario", "risk asset implication", "watch points", "data-based drivers".
5. Base your overall tone on the provided rule-based regime classifications.
6. If a metric is missing, do not guess it. Acknowledge the missing data.

Input Data:
"""
    prompt += f"\n- Today's Metrics: {json.dumps(metrics, ensure_ascii=False)}"
    prompt += f"\n- Today's Rule-based Regime: {json.dumps(regime, ensure_ascii=False)}"
    if previous_briefing:
        prompt += f"\n- Previous Briefing Context available for comparison."
    
    prompt += """

Output must be valid JSON matching exactly this schema:
{
  "date": "YYYY-MM-DD",
  "generatedAt": "ISO-8601",
  "dataAsOf": "ISO-8601",
  "overall": {
    "tone": "String (e.g. Defensive, Risk Aversion, Neutral)",
    "confidence": "Low | Medium | High",
    "summary": "1-2 sentences overall summary",
    "riskAssetImplication": "What this means for risk assets broadly"
  },
  "sections": {
    "liquidity": {
      "tone": "String", "statusLabel": "String", "summary": "String", "riskAssetImplication": "String",
      "supportiveFactors": ["String"], "suppressiveFactors": ["String"],
      "keyCatalysts": [{"title": "String", "description": "String"}]
    },
    "economy": {
      "tone": "String", "statusLabel": "String", "summary": "String", "riskAssetImplication": "String",
      "supportiveFactors": ["String"], "suppressiveFactors": ["String"],
      "keyCatalysts": [{"title": "String", "description": "String"}]
    },
    "inflationRates": {
      "tone": "String", "statusLabel": "String", "summary": "String", "riskAssetImplication": "String",
      "supportiveFactors": ["String"], "suppressiveFactors": ["String"],
      "keyCatalysts": [{"title": "String", "description": "String"}]
    },
    "sentiment": {
      "tone": "String", "statusLabel": "String", "summary": "String", "riskAssetImplication": "String",
      "supportiveFactors": ["String"], "suppressiveFactors": ["String"],
      "keyCatalysts": [{"title": "String", "description": "String"}]
    }
  },
  "drivers": {
    "supportive": [{"text": "String", "metricIds": ["String"], "direction": "supportive"}],
    "suppressive": [{"text": "String", "metricIds": ["String"], "direction": "suppressive"}]
  },
  "whatChanged": [{"title": "String", "description": "String", "metricIds": ["String"], "significance": "low|medium|high"}],
  "whatToWatch": [{"title": "String", "description": "String", "metricIds": ["String"], "triggerCondition": "String"}]
}
"""
    return prompt

def generate_daily_briefing() -> Dict[str, Any]:
    """
    Cron entrypoint:
    1. Reads latest snapshot
    2. Builds prompt
    3. Calls LLM (or mock if no key)
    4. Saves to cache/DB
    """
    logger.info("[MacroBriefing] Starting daily briefing generation...")
    snapshot = read_macro_snapshot()
    if not snapshot or snapshot.get("status") == "pending":
        raise ValueError("Macro snapshot is not ready. Cannot generate briefing.")
    
    regime = snapshot.get("regime", {})
    if not regime:
        regime = classify_macro_regime(snapshot)
    
    cm = CacheManager()
    previous_briefing = cm.get(MACRO_BRIEFING_KEY)
    
    # Extract only necessary metrics for the LLM to save tokens
    metrics = _extract_core_metrics(snapshot)
    
    prompt = build_macro_briefing_prompt(metrics, previous_briefing, regime)
    
    # Call LLM
    try:
        briefing_json_str = _call_llm(prompt)
        briefing_data = json.loads(briefing_json_str)
        # Add metadata
        briefing_data["dataQuality"] = {
            "warnings": [f for f in snapshot.get("meta", {}).get("sources_failed", [])]
        }
        
        # Save to DB/Cache
        cm.set(MACRO_BRIEFING_KEY, briefing_data, ttl=MACRO_BRIEFING_TTL)
        logger.info("[MacroBriefing] Generation successful.")
        return briefing_data
    except Exception as e:
        logger.error("[MacroBriefing] AI Generation failed: %s", e)
        raise

def _extract_core_metrics(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    sent = snapshot.get("sentiment") or {}
    liq = snapshot.get("liquidity") or {}
    eco = snapshot.get("economy") or {}
    inf = snapshot.get("inflation_rates") or {}
    
    return {
        "fgi": sent.get("fear_greed", {}).get("value") if isinstance(sent.get("fear_greed"), dict) else None,
        "vix": sent.get("vix", {}).get("value") if isinstance(sent.get("vix"), dict) else None,
        "dxy": sent.get("dxy", {}).get("value") if isinstance(sent.get("dxy"), dict) else None,
        "us10y": inf.get("us10y_yield", {}).get("value") if isinstance(inf.get("us10y_yield"), dict) else None,
        "rrp": liq.get("rrp_balance", {}).get("value") if isinstance(liq.get("rrp_balance"), dict) else None,
        "nfci": liq.get("nfci", {}).get("value") if isinstance(liq.get("nfci"), dict) else None,
        "gdp": eco.get("gdp_growth", {}).get("value") if isinstance(eco.get("gdp_growth"), dict) else None,
        "cpi": inf.get("cpi_yoy", {}).get("value") if isinstance(inf.get("cpi_yoy"), dict) else None,
    }

def _call_llm(prompt: str) -> str:
    """Mock LLM call. In production, use OpenAI/Anthropic SDK."""
    mock_response = {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataAsOf": datetime.now(timezone.utc).isoformat(),
        "overall": {
            "tone": "Neutral Play",
            "confidence": "Medium",
            "summary": "AI summary generation is currently in fallback mode. The macro environment presents mixed signals across liquidity and inflation.",
            "riskAssetImplication": "Maintain balanced exposure while awaiting clearer directional signals from rates."
        },
        "sections": {
            "liquidity": {
                "tone": "Neutral", "statusLabel": "Stable", "summary": "Liquidity remains adequate.", "riskAssetImplication": "Supportive",
                "supportiveFactors": ["NFCI indicates loose conditions"], "suppressiveFactors": [], "keyCatalysts": []
            },
            "economy": {
                "tone": "Neutral", "statusLabel": "Resilient", "summary": "Growth indicators show resilience.", "riskAssetImplication": "Neutral",
                "supportiveFactors": ["GDP expansion intact"], "suppressiveFactors": [], "keyCatalysts": []
            },
            "inflationRates": {
                "tone": "Caution", "statusLabel": "Elevated", "summary": "Yields remain a pressure point.", "riskAssetImplication": "Suppressive",
                "supportiveFactors": [], "suppressiveFactors": ["US10Y elevated above 4.3%"], "keyCatalysts": []
            },
            "sentiment": {
                "tone": "Neutral", "statusLabel": "Range-bound", "summary": "Market sentiment lacks extreme fear or greed.", "riskAssetImplication": "Neutral",
                "supportiveFactors": [], "suppressiveFactors": [], "keyCatalysts": []
            }
        },
        "drivers": {"supportive": [], "suppressive": []},
        "whatChanged": [],
        "whatToWatch": []
    }
    return json.dumps(mock_response)
