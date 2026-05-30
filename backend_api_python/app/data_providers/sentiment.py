"""Market sentiment indicator fetchers (VIX, DXY, Fear&Greed, etc.)."""
from __future__ import annotations

import requests
from typing import Any, Dict
from datetime import datetime, timezone

from app.utils.logger import get_logger
from app.data_providers.fallback import resolve_metric_value

logger = get_logger(__name__)


def fetch_fear_greed_index(old_snap=None) -> Dict[str, Any]:
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

    def _fetch():
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

        raise ValueError("All CNN Fear & Greed Index sources exhausted")

    resolved = resolve_metric_value(
        metric_key="fear_greed",
        section_name="sentiment",
        primary_fetcher=_fetch,
        default_source="CNN Business",
        old_snap=old_snap
    )
    
    # Ensure classification is populated on error/cached scenarios
    if resolved.get("value") is None:
        resolved["classification"] = "Data Unavailable"
    elif "classification" not in resolved:
        resolved["classification"] = "Neutral"
        
    return resolved


def fetch_vix(old_snap=None) -> Dict[str, Any]:
    """Fetch VIX (CBOE Volatility Index) with multiple fallbacks."""
    
    def _fetch_primary():
        import yfinance as yf
        logger.debug("Fetching VIX from yfinance")
        ticker = yf.Ticker("^VIX")
        hist = ticker.history(period="5d")

        if hist is not None and not hist.empty and len(hist) >= 1:
            current = float(hist["Close"].iloc[-1])
            if current > 0:
                prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
                change = ((current - prev_close) / prev_close) * 100 if prev_close else 0
                return {
                    "value": current,
                    "change": change,
                    "source": "Yahoo Finance"
                }
        raise ValueError("VIX history empty from yfinance")

    def _fetch_fallback():
        import akshare as ak
        logger.debug("Fetching VIX from akshare")
        vix_df = ak.index_vix()
        if vix_df is not None and len(vix_df) > 0:
            current = float(vix_df.iloc[-1]["close"])
            prev_close = float(vix_df.iloc[-2]["close"]) if len(vix_df) >= 2 else current
            change = ((current - prev_close) / prev_close) * 100 if prev_close else 0
            if current > 0:
                return {
                    "value": current,
                    "change": change,
                    "source": "AkShare"
                }
        raise ValueError("VIX empty from akshare")

    resolved = resolve_metric_value(
        metric_key="vix",
        section_name="sentiment",
        primary_fetcher=_fetch_primary,
        fallback_fetcher=_fetch_fallback,
        default_source="Yahoo Finance",
        old_snap=old_snap
    )

    current = resolved.get("value")
    if current is not None and current > 0:
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
            
        resolved["value"] = round(current, 2)
        resolved["change"] = round(resolved.get("change") or 0, 2)
        resolved["level"] = level
        resolved["interpretation"] = cn
        resolved["interpretation_en"] = en
    else:
        resolved["value"] = 18.0
        resolved["change"] = 0.0
        resolved["level"] = "low"
        resolved["interpretation"] = "低波动 - 市场稳定"
        resolved["interpretation_en"] = "Low - Market Stable"

    return resolved


def fetch_dollar_index(old_snap=None) -> Dict[str, Any]:
    """Fetch US Dollar Index (DXY)."""

    def _fetch_primary():
        import yfinance as yf
        logger.debug("Fetching DXY from yfinance")
        ticker = yf.Ticker("DX-Y.NYB")
        hist = ticker.history(period="5d")

        if hist is not None and not hist.empty and len(hist) >= 1:
            current = float(hist["Close"].iloc[-1])
            if current > 0:
                prev_close = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else current
                change = ((current - prev_close) / prev_close) * 100 if prev_close else 0
                return {
                    "value": current,
                    "change": change,
                    "source": "Yahoo Finance"
                }
        raise ValueError("DXY empty from yfinance")

    def _fetch_fallback():
        from app.utils.fred import fetch_fred_series
        logger.debug("Fetching DXY fallback from FRED (DTWEXBGS)")
        res = fetch_fred_series("DTWEXBGS")
        if res and res.get("status") == "ok" and res.get("value") is not None:
            return {
                "value": res["value"],
                "source": "FRED (DTWEXBGS)"
            }
        raise ValueError("DXY fallback FRED failed")

    resolved = resolve_metric_value(
        metric_key="dxy",
        section_name="sentiment",
        primary_fetcher=_fetch_primary,
        fallback_fetcher=_fetch_fallback,
        default_source="Yahoo Finance",
        old_snap=old_snap
    )

    current = resolved.get("value")
    if current is not None and current > 0:
        if current > 105:
            level, cn, en = "strong", "美元强势 - 利空大宗商品/新兴 market", "Strong USD - Bearish commodities/EM"
        elif current > 100:
            level, cn, en = "moderate_strong", "美元偏强 - 关注资金流向", "Moderately Strong - Watch capital flows"
        elif current > 95:
            level, cn, en = "neutral", "美元中性 - 市场均衡", "Neutral - Market balanced"
        elif current > 90:
            level, cn, en = "moderate_weak", "美元偏弱 - 利多风险资产", "Moderately Weak - Bullish risk assets"
        else:
            level, cn, en = "weak", "美元疲软 - 利多黄金/大宗商品", "Weak USD - Bullish gold/commodities"
            
        resolved["value"] = round(current, 2)
        resolved["change"] = round(resolved.get("change") or 0, 2)
        resolved["level"] = level
        resolved["interpretation"] = cn
        resolved["interpretation_en"] = en
        logger.info("DXY resolved: %.2f (%s)", current, level)
    else:
        resolved["value"] = None
        resolved["change"] = None
        resolved["level"] = "unknown"
        resolved["interpretation"] = "数据获取失败"
        resolved["interpretation_en"] = "Data fetch failed"

    return resolved


def fetch_yield_curve(old_snap=None) -> Dict[str, Any]:
    """Fetch 10Y Treasury Yield. (2Y and spread are fetched via FRED in inflation.py)"""
    
    def _fetch_primary():
        import yfinance as yf
        logger.debug("Fetching 10Y Treasury Yield from yfinance")
        tnx = yf.Ticker("^TNX")
        tnx_hist = tnx.history(period="5d")

        if tnx_hist is not None and not tnx_hist.empty:
            yield_10y = tnx_hist["Close"].iloc[-1]
            return {
                "value": yield_10y,
                "source": "Yahoo Finance"
            }
        raise ValueError("TNX history empty")

    def _fetch_fallback():
        from app.utils.fred import fetch_fred_series
        logger.debug("Fetching 10Y Treasury Yield from FRED (DGS10)")
        res = fetch_fred_series("DGS10")
        if res and res.get("status") == "ok" and res.get("value") is not None:
            return {
                "value": res["value"],
                "source": "FRED"
            }
        raise ValueError("FRED DGS10 failed")

    resolved = resolve_metric_value(
        metric_key="yield_curve",
        section_name="sentiment",
        primary_fetcher=_fetch_primary,
        fallback_fetcher=_fetch_fallback,
        default_source="Yahoo Finance",
        old_snap=old_snap
    )

    val = resolved.get("value")
    resolved["yield_10y"] = round(val, 2) if val is not None else None
    resolved["yield_2y"] = None
    resolved["spread"] = None
    resolved["change"] = 0
    resolved["level"] = resolved.get("level", "unknown")
    resolved["signal"] = resolved.get("signal", "neutral")
    resolved["interpretation"] = resolved.get("interpretation", "10Y Yield")
    resolved["interpretation_en"] = resolved.get("interpretation_en", "10Y Yield")
    
    return resolved


def fetch_vxn(old_snap=None) -> Dict[str, Any]:
    """Fetch NASDAQ Volatility Index (VXN)."""
    
    def _fetch_primary():
        import yfinance as yf
        logger.debug("Fetching VXN from yfinance")
        ticker = yf.Ticker("^VXN")
        hist = ticker.history(period="5d")

        if hist is not None and len(hist) >= 1:
            current = hist["Close"].iloc[-1]
            prev_close = hist["Close"].iloc[-2] if len(hist) >= 2 else current
            change = ((current - prev_close) / prev_close) * 100
            return {
                "value": current,
                "change": change,
                "source": "Yahoo Finance"
            }
        raise ValueError("VXN history empty")

    resolved = resolve_metric_value(
        metric_key="vxn",
        section_name="sentiment",
        primary_fetcher=_fetch_primary,
        default_source="Yahoo Finance",
        old_snap=old_snap
    )

    current = resolved.get("value")
    if current is not None:
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

        resolved["value"] = round(current, 2)
        resolved["change"] = round(resolved.get("change") or 0, 2)
        resolved["level"] = level
        resolved["interpretation"] = cn
        resolved["interpretation_en"] = en
        logger.info("VXN resolved: %.2f (%s)", current, level)
    else:
        resolved["value"] = 0
        resolved["change"] = 0
        resolved["level"] = "unknown"
        resolved["interpretation"] = "数据获取失败"
        resolved["interpretation_en"] = "Data fetch failed"

    return resolved


def fetch_gvz(old_snap=None) -> Dict[str, Any]:
    """Fetch Gold Volatility Index (GVZ)."""
    
    def _fetch_primary():
        import yfinance as yf
        logger.debug("Fetching GVZ from yfinance")
        ticker = yf.Ticker("^GVZ")
        hist = ticker.history(period="5d")

        if hist is not None and len(hist) >= 1:
            current = hist["Close"].iloc[-1]
            prev_close = hist["Close"].iloc[-2] if len(hist) >= 2 else current
            change = ((current - prev_close) / prev_close) * 100
            return {
                "value": current,
                "change": change,
                "source": "Yahoo Finance"
            }
        raise ValueError("GVZ history empty")

    resolved = resolve_metric_value(
        metric_key="gvz",
        section_name="sentiment",
        primary_fetcher=_fetch_primary,
        default_source="Yahoo Finance",
        old_snap=old_snap
    )

    current = resolved.get("value")
    if current is not None:
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

        resolved["value"] = round(current, 2)
        resolved["change"] = round(resolved.get("change") or 0, 2)
        resolved["level"] = level
        resolved["interpretation"] = cn
        resolved["interpretation_en"] = en
        logger.info("GVZ resolved: %.2f (%s)", current, level)
    else:
        resolved["value"] = 0
        resolved["change"] = 0
        resolved["level"] = "unknown"
        resolved["interpretation"] = "数据获取失败"
        resolved["interpretation_en"] = "Data fetch failed"

    return resolved


def fetch_put_call_ratio(old_snap=None) -> Dict[str, Any]:
    """Calculate Put/Call Ratio proxy using VIX term structure."""
    
    def _fetch_primary():
        import yfinance as yf
        logger.debug("Calculating Put/Call Ratio proxy")
        vix = yf.Ticker("^VIX")
        vix3m = yf.Ticker("^VIX3M")

        vix_hist = vix.history(period="5d")
        vix3m_hist = vix3m.history(period="5d")

        if vix_hist is not None and vix3m_hist is not None and len(vix_hist) >= 1 and len(vix3m_hist) >= 1:
            vix_val = vix_hist["Close"].iloc[-1]
            vix3m_val = vix3m_hist["Close"].iloc[-1]
            ratio = vix_val / vix3m_val if vix3m_val > 0 else 1.0

            prev_ratio = vix_hist["Close"].iloc[-2] / vix3m_hist["Close"].iloc[-2] if len(vix_hist) >= 2 and len(vix3m_hist) >= 2 and vix3m_hist["Close"].iloc[-2] > 0 else ratio
            change = ((ratio - prev_ratio) / prev_ratio) * 100
            
            return {
                "value": ratio,
                "vix": vix_val,
                "vix3m": vix3m_val,
                "change": change,
                "source": "Yahoo Finance"
            }
        raise ValueError("VIX or VIX3M history empty")

    resolved = resolve_metric_value(
        metric_key="vix_term",
        section_name="sentiment",
        primary_fetcher=_fetch_primary,
        default_source="Yahoo Finance",
        old_snap=old_snap
    )

    ratio = resolved.get("value")
    if ratio is not None:
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

        resolved["value"] = round(ratio, 3)
        resolved["vix"] = round(resolved.get("vix") or 0, 2)
        resolved["vix3m"] = round(resolved.get("vix3m") or 0, 2)
        resolved["change"] = round(resolved.get("change") or 0, 2)
        resolved["level"] = level
        resolved["signal"] = signal
        resolved["interpretation"] = cn
        resolved["interpretation_en"] = en
        logger.info("VIX Term Structure: ratio=%.3f (%s)", ratio, level)
    else:
        resolved["value"] = 1.0
        resolved["vix"] = 0
        resolved["vix3m"] = 0
        resolved["change"] = 0
        resolved["level"] = "unknown"
        resolved["signal"] = "neutral"
        resolved["interpretation"] = "数据获取失败"
        resolved["interpretation_en"] = "Data fetch failed"

    return resolved

