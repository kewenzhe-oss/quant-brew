import json
from datetime import datetime, timezone

try:
    import redis
    r = redis.Redis(host='127.0.0.1', port=6379, db=0)
    r.ping()
    
    mock_response = {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataAsOf": datetime.now(timezone.utc).isoformat(),
        "overall": {
            "tone": "偏向进攻 / 顺势而为",
            "confidence": "High",
            "summary": "风险资产动能维持强势，流动性环境与市场情绪均支持估值进一步扩张。",
            "riskAssetImplication": "在没有破坏性黑天鹅的情况下，做空大盘风险极高，建议保持合理的风险敞口。"
        },
        "sections": {
            "liquidity": {
                "tone": "宽松", "statusLabel": "Loose", "summary": "金融条件维持宽松区间", "riskAssetImplication": "Supportive",
                "supportiveFactors": ["NFCI indicates loose conditions"], "suppressiveFactors": [], "keyCatalysts": []
            },
            "economy": {
                "tone": "温和", "statusLabel": "Slowing", "summary": "经济温和扩张", "riskAssetImplication": "Neutral",
                "supportiveFactors": ["GDP expansion intact"], "suppressiveFactors": [], "keyCatalysts": []
            },
            "inflationRates": {
                "tone": "高压", "statusLabel": "High Yield", "summary": "美债收益率高企", "riskAssetImplication": "Suppressive",
                "supportiveFactors": [], "suppressiveFactors": ["US10Y elevated"], "keyCatalysts": []
            },
            "sentiment": {
                "tone": "贪婪", "statusLabel": "Greed", "summary": "市场情绪热烈", "riskAssetImplication": "Neutral",
                "supportiveFactors": [], "suppressiveFactors": [], "keyCatalysts": []
            }
        },
        "drivers": {
            "supportive": [
                {"text": "流动性泛滥支撑美股估值", "metricIds": ["nfci"]}
            ],
            "suppressive": [
                {"text": "长端利率处于高压区，科技股承压", "metricIds": ["us10y"]}
            ]
        },
        "whatChanged": [
            {"title": "波动率降至新低", "description": "VIX跌破18，市场情绪进入极度自满区间。", "metricIds": ["vix"], "significance": "high"}
        ],
        "whatToWatch": [
            {"title": "逆回购见底", "description": "RRP接近枯竭，关注流动性缩量风险。", "metricIds": ["rrp"], "triggerCondition": "RRP < 0.5"}
        ]
    }
    
    r.setex("macro:briefing:latest", 86400, json.dumps(mock_response))
    print("Successfully wrote mock briefing to Redis at key: macro:briefing:latest")
except Exception as e:
    print(f"Error: {e}")
