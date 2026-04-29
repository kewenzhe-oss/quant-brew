from typing import Dict, Any, Optional

def classify_macro_regime(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """
    Classify the macro regime based on the latest snapshot data.
    Returns structured regimes for liquidity, economy, inflation_rates, sentiment, and overall.
    """
    
    # Extract raw data safely
    liq_data = snapshot.get("liquidity") or {}
    eco_data = snapshot.get("economy") or {}
    inf_data = snapshot.get("inflation_rates") or {}
    sent_data = snapshot.get("sentiment") or {}
    
    # Extract values
    fgi_val = _get_val(sent_data.get("fear_greed"))
    vix_val = _get_val(sent_data.get("vix"))
    nfci_val = _get_val(liq_data.get("nfci"))
    gdp_val = _get_val(eco_data.get("gdp_growth"))
    us10y_val = _get_val(inf_data.get("us10y_yield"))
    
    # 1. Sentiment Regime
    sentiment_regime = _classify_sentiment(fgi_val, vix_val)
    
    # 2. Liquidity Regime
    liquidity_regime = _classify_liquidity(nfci_val)
    
    # 3. Economy Regime
    economy_regime = _classify_economy(gdp_val)
    
    # 4. Inflation/Rates Regime
    inflation_regime = _classify_inflation_rates(us10y_val)
    
    # 5. Overall Tone
    overall_regime = _classify_overall(fgi_val, vix_val)
    
    return {
        "overall": overall_regime,
        "sentiment": sentiment_regime,
        "liquidity": liquidity_regime,
        "economy": economy_regime,
        "inflation_rates": inflation_regime
    }

def _get_val(metric_obj: Any) -> Optional[float]:
    if isinstance(metric_obj, dict) and "value" in metric_obj:
        v = metric_obj["value"]
        if v is not None:
            try:
                return float(v)
            except (ValueError, TypeError):
                return None
    return None

def _classify_sentiment(fgi: Optional[float], vix: Optional[float]) -> Dict[str, str]:
    if fgi is not None:
        if fgi >= 75:
            return {"labelZh": "极度贪婪", "labelEn": "Extreme Greed", "tone": "risk"}
        elif fgi > 55:
            return {"labelZh": "偏向贪婪", "labelEn": "Greedy", "tone": "supportive"}
        elif fgi <= 25:
            return {"labelZh": "极度恐慌", "labelEn": "Extreme Fear", "tone": "risk"}
        elif fgi < 45:
            return {"labelZh": "偏向恐慌", "labelEn": "Fearful", "tone": "caution"}
        else:
            return {"labelZh": "情绪中性", "labelEn": "Neutral", "tone": "neutral"}
    elif vix is not None:
        if vix > 30:
            return {"labelZh": "恐慌飙升", "labelEn": "Panic Surge", "tone": "risk"}
        elif vix > 20:
            return {"labelZh": "波动抬升", "labelEn": "Elevated Volatility", "tone": "caution"}
        else:
            return {"labelZh": "情绪平稳", "labelEn": "Calm", "tone": "supportive"}
    return {"labelZh": "数据缺失", "labelEn": "Missing Data", "tone": "neutral"}

def _classify_liquidity(nfci: Optional[float]) -> Dict[str, str]:
    if nfci is not None:
        if nfci < -0.3:
            return {"labelZh": "偏宽松", "labelEn": "Loose", "tone": "supportive"}
        elif nfci > 0:
            return {"labelZh": "实质收紧", "labelEn": "Tightening", "tone": "caution"}
        else:
            return {"labelZh": "中性水平", "labelEn": "Neutral", "tone": "neutral"}
    return {"labelZh": "数据缺失", "labelEn": "Missing Data", "tone": "neutral"}

def _classify_economy(gdp: Optional[float]) -> Dict[str, str]:
    if gdp is not None:
        if gdp > 2.0:
            return {"labelZh": "强劲扩张", "labelEn": "Expanding", "tone": "supportive"}
        elif gdp > 0:
            return {"labelZh": "放缓但未失速", "labelEn": "Slowing but resilient", "tone": "neutral"}
        else:
            return {"labelZh": "经济萎缩", "labelEn": "Contracting", "tone": "risk"}
    return {"labelZh": "数据缺失", "labelEn": "Missing Data", "tone": "neutral"}

def _classify_inflation_rates(us10y: Optional[float]) -> Dict[str, str]:
    if us10y is not None:
        if us10y > 4.3:
            return {"labelZh": "高利率压制", "labelEn": "High yield pressure", "tone": "caution"}
        elif us10y < 3.8:
            return {"labelZh": "流动性宽松预期", "labelEn": "Easing expectations", "tone": "supportive"}
        else:
            return {"labelZh": "利率区间震荡", "labelEn": "Range-bound yields", "tone": "neutral"}
    return {"labelZh": "数据缺失", "labelEn": "Missing Data", "tone": "neutral"}

def _classify_overall(fgi: Optional[float], vix: Optional[float]) -> Dict[str, str]:
    if fgi is not None:
        if fgi >= 75:
            return {"labelZh": "防守反击", "labelEn": "Defensive", "tone": "risk"}
        elif fgi > 55:
            return {"labelZh": "偏向进攻", "labelEn": "Offensive", "tone": "supportive"}
        elif fgi <= 25:
            return {"labelZh": "左侧吸筹", "labelEn": "Left-side Accumulation", "tone": "risk"}
        elif fgi < 45:
            return {"labelZh": "动态防御", "labelEn": "Dynamic Defense", "tone": "caution"}
        else:
            return {"labelZh": "中性博弈", "labelEn": "Neutral Play", "tone": "neutral"}
    elif vix is not None:
        if vix > 30:
            return {"labelZh": "风险规避", "labelEn": "Risk Aversion", "tone": "risk"}
        elif vix > 20:
            return {"labelZh": "中性偏谨慎", "labelEn": "Cautious", "tone": "caution"}
        else:
            return {"labelZh": "正常波动", "labelEn": "Normal Volatility", "tone": "supportive"}
    return {"labelZh": "判断降级", "labelEn": "Degraded", "tone": "neutral"}
