import json
from app.utils.logger import get_logger
from app.services.llm import LLMService

logger = get_logger(__name__)

class PlanBuilderService:
    def __init__(self):
        self.llm_service = LLMService()
        
    def generate_plan_draft(self, user_id: str, plan_data: dict) -> dict:
        """
        Generate a disciplined investment plan draft based on user input.
        Strictly enforces red-lines (no investment advice, no price prediction, etc.)
        """
        try:
            symbol = plan_data.get("symbol", "")
            asset_type = plan_data.get("asset_type", "")
            plan_type = plan_data.get("plan_type", "")
            total_budget = plan_data.get("total_budget", 0)
            duration = plan_data.get("duration", "")
            frequency = plan_data.get("frequency", "")
            risk_profile = plan_data.get("risk_profile", "")
            thesis = plan_data.get("thesis", "")

            system_prompt = """You are QuantDinger's AI Plan Builder. Your sole purpose is to generate disciplined, structured investment plan drafts (DCA, staged entries, risk control) based on user inputs.

CRITICAL RED LINES (MUST OBEY OR YOU WILL BE TERMINATED):
- DO NOT provide investment advice.
- DO NOT predict price movements.
- DO NOT promise returns or guaranteed profit.
- DO NOT use target prices, expected returns, win rates, or accuracy claims.
- DO NOT output BUY, SELL, or HOLD recommendations.
- Use scenario simulation (Base, Upside, Sideways, Stress) instead of return prediction.
- All output must emphasize DISCIPLINE, RISK MANAGEMENT, and SYSTEMATIC execution.

ASSET-AWARE LOGIC:
- Stock: Emphasize single-stock concentration risk. Mention checking revenue, margins, free cash flow, competitive moat. Caution against using it as the sole core DCA asset.
- ETF: Treat as a core DCA candidate. Mention tracking error, expense ratio, top holdings, sector concentration.
- Crypto: Emphasize extreme volatility, protocol/regulatory risks, custody. Allocate a higher cash reserve and smaller entry chunks. Remind users it is generally not suitable as the main core DCA asset for average investors.

BUDGET ALLOCATION LOGIC:
Do not blindly divide the total_budget. Split the total_budget into:
1. base_dca_pool: Regular interval buys.
2. opportunity_reserve: Capital held for buying during significant pullbacks without breaking thesis.
3. cash_buffer: Emergency cash to avoid forced liquidation of the asset.
Adjust percentages based on risk_profile:
- Conservative: Larger cash buffer and opportunity reserve.
- Balanced: Typically ~70% base, ~20% reserve, ~10% cash buffer.
- Aggressive: Larger base DCA pool, but still keep a reserve.

Output EXACTLY this JSON structure:
{
  "plan_summary": "Brief 2-3 sentence summary of the execution strategy.",
  "budget_allocation": {
    "base_dca_pool": {
      "amount": numeric_amount,
      "percentage": numeric_percentage,
      "explanation": "Why this amount?"
    },
    "opportunity_reserve": {
      "amount": numeric_amount,
      "percentage": numeric_percentage,
      "explanation": "Why this amount?"
    },
    "cash_buffer": {
      "amount": numeric_amount,
      "percentage": numeric_percentage,
      "explanation": "Why this amount?"
    }
  },
  "budget_schedule": [
    {
      "period": "e.g., Monthly/Weekly",
      "amount": numeric_amount,
      "note": "brief note"
    }
  ],
  "dca_cadence": "Explanation of the DCA or staged entry timing.",
  "action_rules": {
    "continue_when": ["Rule 1", "Rule 2"],
    "pause_when": ["Rule 1", "Rule 2"],
    "review_when": ["Rule 1", "Rule 2"],
    "use_reserve_when": ["Rule 1", "Rule 2"]
  },
  "staged_entry_rules": ["Rule 1", "Rule 2"],
  "cash_reserve_suggestion": "Explanation of how much cash to keep aside and why.",
  "invalidation_conditions": ["Condition 1", "Condition 2 that would stop this plan"],
  "asset_specific_checklist": ["Checklist item 1", "Checklist item 2"],
  "review_frequency": "e.g., Quarterly or after major earnings",
  "risk_notes": ["Risk 1", "Risk 2"],
  "scenario_simulation": {
    "base_case": "What happens, what to review, how cadence changes.",
    "upside_or_fast_rise_case": "What happens, what to review, how cadence changes.",
    "sideways_case": "What happens, what to review, how cadence changes.",
    "stress_case": "What happens, what to review, how cadence changes."
  },
  "disclaimer": "本计划为 AI 生成的纪律化草案，不构成投资建议，不预测价格走势，也不承诺收益。"
}

If user input is incomplete or nonsensical, return a highly conservative, generalized educational plan adhering to the JSON structure. Respond entirely in Simplified Chinese. Output ONLY valid JSON."""

            user_prompt = f"""Please generate an investment plan draft based on the following parameters:
- Symbol: {symbol}
- Asset Type: {asset_type}
- Plan Type: {plan_type}
- Total Budget: {total_budget}
- Duration: {duration}
- Frequency: {frequency}
- Risk Profile: {risk_profile}
- Optional Thesis: {thesis}

Generate the strict JSON output."""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            response_text = self.llm_service.call_llm_api(
                messages=messages,
                model="openai/gpt-4o",
                use_json_mode=False  # Disabled: third-party proxy APIs may not support response_format
            )

            # Robust JSON extraction — handles ```json fences, plain JSON, and embedded JSON
            response_text = response_text.strip()

            # Strip markdown code fences
            if response_text.startswith("```"):
                first_newline = response_text.find("\n")
                if first_newline != -1:
                    response_text = response_text[first_newline + 1:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()

            # If still not starting with '{', find the first JSON object boundary
            if not response_text.startswith("{"):
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                if start >= 0 and end > start:
                    response_text = response_text[start:end]
            
            plan_json = json.loads(response_text)
            
            return {
                "success": True,
                "data": plan_json
            }

        except Exception as e:
            logger.error(f"PlanBuilderService generate_plan_draft failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
