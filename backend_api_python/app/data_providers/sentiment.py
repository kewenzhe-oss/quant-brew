"""Market sentiment indicator fetchers (VIX, DXY, Fear&Greed, etc.)."""
from __future__ import annotations

import requests
from typing import Any, Dict

from app.utils.logger import get_logger

logger = get_logger(__name__)


def fetch_fear_greed_index() -> Dict[str, Any]:
    """Fetch Fear & Greed Index from CNN with multiple URL fallbacks."""
    CANDIDATE_URLS = [
        "https://production.dataviz.cnn.io/index/fearandgreed/current",   # root-level score/rating
        "https://production.dataviz.cnn.io/index/fearandgreed/graphdata", # wrapped in fear_and_greed{}
    ]
    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://edition.cnn.com/markets/fear-and-greed",
        "Origin": "https://edition.cnn.com",
        "Cache-Control": "no-cache",
    }

    def _parse_ts(raw) -> int:
        try:
            ms = int(float(raw))
            return ms // 1000 if ms > 1_000_000_000_000 else ms
        except (TypeError, ValueError):
            return 0

    for url in CANDIDATE_URLS:
        try:
            logger.debug("Fetching CNN Fear & Greed Index from %s", url)
            resp = requests.get(url, headers=HEADERS, timeout=12)
            resp.raise_for_status()
            data = resp.json()

            # /current: root-level {"score":..., "rating":..., "timestamp":...}
            if "score" in data and "rating" in data:
                value = round(float(data["score"]))
                classification = str(data.get("rating", "Neutral"))
                logger.info("FGI from %s: %d (%s)", url, value, classification)
                return {
                    "value": value,
                    "classification": classification.title(),
                    "timestamp": _parse_ts(data.get("timestamp", 0)),
                    "source": "CNN Business",
                }

            # /graphdata: {"fear_and_greed": {"score":..., "rating":..., "timestamp":...}}
            if "fear_and_greed" in data:
                item = data["fear_and_greed"]
                value = round(float(item.get("score", 50)))
                classification = str(item.get("rating", "Neutral"))
                logger.info("FGI from %s (wrapped): %d (%s)", url, value, classification)
                return {
                    "value": value,
                    "classification": classification.title(),
                    "timestamp": _parse_ts(item.get("timestamp", 0)),
                    "source": "CNN Business",
                }

            logger.warning("CNN FGI unexpected structure at %s: %s", url, list(data.keys()))

        except requests.exceptions.Timeout:
            logger.warning("CNN FGI timeout from %s", url)
        except requests.exceptions.HTTPError as e:
            logger.warning("CNN FGI HTTP %s from %s", e.response.status_code, url)
        except Exception as e:
            logger.warning("CNN FGI failed from %s: %s", url, e)

    logger.error("All CNN Fear & Greed Index sources exhausted")
    return {
        "value": None,
        "classification": "Data Unavailable",
        "timestamp": 0,
        "source": "CNN Business",
        "error": "All fetch attempts failed",
    }

def fetch_vix() -> Dict[str, Any]:
    """Fetch VIX (CBOE Volatility Index) with multiple fallbacks."""
    DEFAULT_VIX = {
        "value": 18, "change": 0, "level": "low",
        "interpretation": "低波动 - 市场稳定",
        "interpretation_en": "Low - Market Stable",
    }

    current = 0.0
    change = 0.0

    try:
        import yfinance as yf
        logger.debug("Fetching VIX from yfinance")
        ticker = yf.Ticker("^VIX")

        try:
            hist = ticker.history(period="5d")
        except Exception as hist_err:
            logger.warning("yfinance VIX failed: %s", hist_err)
            hist = None

        if hist is not None and not hist.empty and len(hist) >= 1:
            current = float(hist["Close"].iloc[-1])
            if current > 0:
                prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
                change = ((current - prev_close) / prev_close) * 100 if prev_close else 0
            else:
                raise ValueError("VIX value is 0")
        else:
            raise ValueError("VIX history empty")

    except Exception as e:
        logger.warning("yfinance VIX failed, trying akshare: %s", e)

        try:
            import akshare as ak
            vix_df = ak.index_vix()
            if vix_df is not None and len(vix_df) > 0:
                current = float(vix_df.iloc[-1]["close"])
                prev_close = float(vix_df.iloc[-2]["close"]) if len(vix_df) >= 2 else current
                change = ((current - prev_close) / prev_close) * 100 if prev_close else 0
                logger.info("VIX from akshare: %.2f", current)
            else:
                raise ValueError("Akshare VIX empty")
        except Exception as ak_err:
            logger.warning("Akshare VIX also failed: %s", ak_err)
            return DEFAULT_VIX

    if current <= 0:
        return DEFAULT_VIX

    if current < 12:
        level, cn, en = "very_low", "极低波动 - 市场极度乐观", "Very Low - Extreme Optimism"
    elif current < 20:
        level, cn, en = "low", "低波动 - 市场稳定", "Low - Market Stable"
    elif current < 25:
        level, cn, en = "moderate", "中等波动 - 正常水平", "Moderate - Normal Level"
    elif current < 30:
        level, cn, en = "high", "高波动 - 市场担忧", "High - Market Concern"
    else:
        level, cn, en = "very_high", "极高波动 - 市场恐慌", "Very High - Market Panic"

    return {
        "value": round(current, 2), "change": round(change, 2),
        "level": level, "interpretation": cn, "interpretation_en": en,
    }


def fetch_dollar_index() -> Dict[str, Any]:
    """Fetch US Dollar Index (DXY)."""

    current = 0.0
    change = 0.0

    try:
        import yfinance as yf
        logger.debug("Fetching DXY from yfinance")
        ticker = yf.Ticker("DX-Y.NYB")

        try:
            hist = ticker.history(period="5d")
        except Exception as hist_err:
            logger.warning("yfinance DXY failed: %s", hist_err)
            hist = None

        if hist is not None and not hist.empty and len(hist) >= 1:
            current = float(hist["Close"].iloc[-1])
            if current > 0:
                prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
                change = ((current - prev_close) / prev_close) * 100 if prev_close else 0
                logger.info("DXY from yfinance: %.2f", current)
            else:
                raise ValueError("DXY value is 0")
        else:
            raise ValueError("DXY history empty")

    except Exception as e:
        logger.warning("Failed to fetch DXY: %s", e)
        return {
            "value": None, "change": None,
            "level": "unknown", "interpretation": "数据获取失败",
            "interpretation_en": "Data fetch failed", "error": str(e)
        }

    if current <= 0:
        return {
            "value": None, "change": None,
            "level": "unknown", "interpretation": "数据获取异常",
            "interpretation_en": "Data fetch abnormal", "error": "Zero value"
        }

    if current > 105:
        level, cn, en = "strong", "美元强势 - 利空大宗商品/新兴市场", "Strong USD - Bearish commodities/EM"
    elif current > 100:
        level, cn, en = "moderate_strong", "美元偏强 - 关注资金流向", "Moderately Strong - Watch capital flows"
    elif current > 95:
        level, cn, en = "neutral", "美元中性 - 市场均衡", "Neutral - Market balanced"
    elif current > 90:
        level, cn, en = "moderate_weak", "美元偏弱 - 利多风险资产", "Moderately Weak - Bullish risk assets"
    else:
        level, cn, en = "weak", "美元疲软 - 利多黄金/大宗商品", "Weak USD - Bullish gold/commodities"

    logger.info("DXY fetched: %.2f (%s)", current, level)
    return {
        "value": round(current, 2), "change": round(change, 2),
        "level": level, "interpretation": cn, "interpretation_en": en,
    }


def fetch_yield_curve() -> Dict[str, Any]:
    """Fetch 10Y Treasury Yield. (2Y and spread are fetched via FRED in inflation.py)"""
    try:
        import yfinance as yf
        logger.debug("Fetching 10Y Treasury Yield from yfinance")

        tnx = yf.Ticker("^TNX")
        tnx_hist = tnx.history(period="5d")

        if tnx_hist is None or tnx_hist.empty:
            raise ValueError("TNX history is empty")

        yield_10y = tnx_hist["Close"].iloc[-1]
        
        logger.info("Yield Curve (10Y only): %.2f%%", yield_10y)
        return {
            "yield_10y": round(yield_10y, 2), "yield_2y": None,
            "spread": None, "change": 0,
            "level": "unknown", "signal": "neutral", "interpretation": "10Y Yield", "interpretation_en": "10Y Yield",
        }
    except Exception as e:
        logger.error("Failed to fetch 10Y Yield: %s", e, exc_info=True)
        return {
            "yield_10y": None, "yield_2y": None, "spread": None, "change": 0,
            "level": "unknown", "signal": "neutral",
            "interpretation": "数据获取失败", "interpretation_en": "Data fetch failed", "error": str(e)
        }


def fetch_vxn() -> Dict[str, Any]:
    """Fetch NASDAQ Volatility Index (VXN)."""
    try:
        import yfinance as yf
        logger.debug("Fetching VXN from yfinance")
        ticker = yf.Ticker("^VXN")
        hist = ticker.history(period="5d")

        if len(hist) >= 2:
            prev_close = hist["Close"].iloc[-2]
            current = hist["Close"].iloc[-1]
            change = ((current - prev_close) / prev_close) * 100
        elif len(hist) == 1:
            current = hist["Close"].iloc[-1]
            change = 0
        else:
            current = change = 0

        if current < 15:
            level, cn, en = "very_low", "科技股极低波动 - 市场乐观", "Very Low Tech Volatility - Optimistic"
        elif current < 22:
            level, cn, en = "low", "科技股低波动 - 稳定", "Low Tech Volatility - Stable"
        elif current < 28:
            level, cn, en = "moderate", "科技股中等波动 - 正常", "Moderate Tech Volatility - Normal"
        elif current < 35:
            level, cn, en = "high", "科技股高波动 - 谨慎", "High Tech Volatility - Caution"
        else:
            level, cn, en = "very_high", "科技股极高波动 - 恐慌", "Very High Tech Volatility - Panic"

        logger.info("VXN fetched: %.2f (%s)", current, level)
        return {"value": round(current, 2), "change": round(change, 2), "level": level, "interpretation": cn, "interpretation_en": en}
    except Exception as e:
        logger.error("Failed to fetch VXN: %s", e, exc_info=True)
        return {"value": 0, "change": 0, "level": "unknown", "interpretation": "数据获取失败", "interpretation_en": "Data fetch failed"}


def fetch_gvz() -> Dict[str, Any]:
    """Fetch Gold Volatility Index (GVZ)."""
    try:
        import yfinance as yf
        logger.debug("Fetching GVZ from yfinance")
        ticker = yf.Ticker("^GVZ")
        hist = ticker.history(period="5d")

        if len(hist) >= 2:
            prev_close = hist["Close"].iloc[-2]
            current = hist["Close"].iloc[-1]
            change = ((current - prev_close) / prev_close) * 100
        elif len(hist) == 1:
            current = hist["Close"].iloc[-1]
            change = 0
        else:
            current = change = 0

        if current < 12:
            level, cn, en = "very_low", "黄金低波动 - 避险需求低", "Low Gold Vol - Low safe haven demand"
        elif current < 16:
            level, cn, en = "low", "黄金稳定 - 市场平静", "Gold Stable - Market calm"
        elif current < 20:
            level, cn, en = "moderate", "黄金中等波动 - 关注避险情绪", "Moderate Gold Vol - Watch safe haven"
        elif current < 25:
            level, cn, en = "high", "黄金高波动 - 避险需求上升", "High Gold Vol - Rising safe haven demand"
        else:
            level, cn, en = "very_high", "黄金极高波动 - 市场避险", "Very High Gold Vol - Flight to safety"

        logger.info("GVZ fetched: %.2f (%s)", current, level)
        return {"value": round(current, 2), "change": round(change, 2), "level": level, "interpretation": cn, "interpretation_en": en}
    except Exception as e:
        logger.error("Failed to fetch GVZ: %s", e, exc_info=True)
        return {"value": 0, "change": 0, "level": "unknown", "interpretation": "数据获取失败", "interpretation_en": "Data fetch failed"}


def fetch_put_call_ratio() -> Dict[str, Any]:
    """Calculate Put/Call Ratio proxy using VIX term structure."""
    try:
        import yfinance as yf
        logger.debug("Calculating Put/Call Ratio proxy")

        vix = yf.Ticker("^VIX")
        vix3m = yf.Ticker("^VIX3M")

        vix_hist = vix.history(period="5d")
        vix3m_hist = vix3m.history(period="5d")

        vix_val = vix3m_val = 0.0

        if len(vix_hist) >= 1 and len(vix3m_hist) >= 1:
            vix_val = vix_hist["Close"].iloc[-1]
            vix3m_val = vix3m_hist["Close"].iloc[-1]
            ratio = vix_val / vix3m_val if vix3m_val > 0 else 1.0

            if len(vix_hist) >= 2 and len(vix3m_hist) >= 2:
                prev_ratio = vix_hist["Close"].iloc[-2] / vix3m_hist["Close"].iloc[-2] if vix3m_hist["Close"].iloc[-2] > 0 else 1.0
                change = ((ratio - prev_ratio) / prev_ratio) * 100
            else:
                change = 0
        else:
            ratio = 1.0
            change = 0

        if ratio > 1.15:
            level, cn, en, signal = "high_fear", "VIX倒挂 - 短期恐慌情绪高涨", "VIX Backwardation - High short-term fear", "bearish"
        elif ratio > 1.0:
            level, cn, en, signal = "elevated", "轻度倒挂 - 市场谨慎", "Slight Backwardation - Market cautious", "neutral"
        elif ratio > 0.9:
            level, cn, en, signal = "normal", "正常结构 - 市场稳定", "Normal Structure - Market stable", "neutral"
        elif ratio > 0.8:
            level, cn, en, signal = "complacent", "深度正价差 - 市场自满", "Deep Contango - Market complacent", "bullish"
        else:
            level, cn, en, signal = "extreme_complacency", "极度自满 - 警惕反转", "Extreme Complacency - Watch for reversal", "neutral"

        logger.info("VIX Term Structure: ratio=%.3f (%s)", ratio, level)
        return {
            "value": round(ratio, 3), "vix": round(vix_val, 2), "vix3m": round(vix3m_val, 2),
            "change": round(change, 2), "level": level, "signal": signal,
            "interpretation": cn, "interpretation_en": en,
        }
    except Exception as e:
        logger.error("Failed to calculate Put/Call proxy: %s", e, exc_info=True)
        return {
            "value": 1.0, "vix": 0, "vix3m": 0, "change": 0,
            "level": "unknown", "signal": "neutral",
            "interpretation": "数据获取失败", "interpretation_en": "Data fetch failed",
        }
