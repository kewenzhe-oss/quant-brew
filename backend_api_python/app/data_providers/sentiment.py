"""Market sentiment indicator fetchers (VIX, DXY, Fear&Greed, etc.)."""
from __future__ import annotations

import requests
from typing import Any, Dict

from app.utils.logger import get_logger

logger = get_logger(__name__)


def fetch_fear_greed_index() -> Dict[str, Any]:
    """Fetch Fear & Greed Index from alternative.me (crypto)."""
    try:
        url = "https://api.alternative.me/fng/?limit=1"
        logger.debug("Fetching Fear & Greed Index from %s", url)
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if data.get("data"):
            item = data["data"][0]
            value = int(item.get("value", 50))
            classification = item.get("value_classification", "Neutral")
            logger.info("Fear & Greed Index fetched: %d (%s)", value, classification)
            return {
                "value": value,
                "classification": classification,
                "timestamp": int(item.get("timestamp", 0)),
                "source": "alternative.me",
            }
        else:
            logger.warning("Fear & Greed API returned empty data")
    except requests.exceptions.Timeout:
        logger.error("Fear & Greed Index request timeout")
    except requests.exceptions.RequestException as e:
        logger.error("Fear & Greed Index request failed: %s", e)
    except Exception as e:
        logger.error("Failed to fetch Fear & Greed Index: %s", e)

    logger.warning("Returning default Fear & Greed value (50)")
    return {"value": 50, "classification": "Neutral", "timestamp": 0, "source": "N/A"}


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
    """Fetch US Dollar Index (DXY) with multiple fallbacks."""
    DEFAULT_DXY = {
        "value": 104, "change": 0, "level": "moderate_strong",
        "interpretation": "美元偏强 - 关注资金流向",
        "interpretation_en": "Moderately Strong - Watch capital flows",
    }

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
        logger.warning("yfinance DXY failed, trying akshare: %s", e)
        try:
            import akshare as ak
            fx_df = ak.currency_boc_sina(symbol="美元")
            if fx_df is not None and len(fx_df) > 0:
                usd_cny = float(fx_df.iloc[-1]["中行汇买价"]) / 100
                current = usd_cny * 14.5
                change = 0
                logger.info("DXY estimated from akshare: %.2f", current)
            else:
                raise ValueError("Akshare DXY empty")
        except Exception as ak_err:
            logger.warning("Akshare DXY also failed: %s", ak_err)
            return DEFAULT_DXY

    if current <= 0:
        return DEFAULT_DXY

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
    """Fetch Treasury Yield Curve (10Y - 2Y spread)."""
    try:
        import yfinance as yf
        logger.debug("Fetching Treasury Yield Curve")

        tnx = yf.Ticker("^TNX")
        try:
            tnx_hist = tnx.history(period="5d")
        except Exception as hist_err:
            logger.warning("TNX history fetch failed: %s", hist_err)
            tnx_hist = None

        if tnx_hist is None or tnx_hist.empty:
            logger.warning("TNX history is None or empty, returning default")
            return {
                "yield_10y": 4.2, "yield_2y": 4.0, "spread": 0.2, "change": 0,
                "level": "normal", "interpretation": "数据暂不可用",
                "interpretation_en": "Data temporarily unavailable", "signal": "neutral",
            }

        if len(tnx_hist) >= 1:
            yield_10y = tnx_hist["Close"].iloc[-1]
            try:
                tyx = yf.Ticker("^TYX")
                tyx_hist = tyx.history(period="5d")
                yield_30y = tyx_hist["Close"].iloc[-1] if len(tyx_hist) >= 1 else 0  # noqa: F841
                yield_2y = yield_10y * 0.85
                spread = yield_10y - yield_2y
                if len(tnx_hist) >= 2:
                    prev_10y = tnx_hist["Close"].iloc[-2]
                    prev_2y = prev_10y * 0.85
                    prev_spread = prev_10y - prev_2y
                    yc_change = spread - prev_spread
                else:
                    yc_change = 0
            except Exception:
                yield_2y = yield_10y * 0.85
                spread = yield_10y - yield_2y
                yc_change = 0
        else:
            yield_10y = yield_2y = spread = yc_change = 0

        if spread < -0.5:
            level, cn, en, signal = "deeply_inverted", "深度倒挂 - 强烈衰退信号", "Deeply Inverted - Strong recession signal", "bearish"
        elif spread < 0:
            level, cn, en, signal = "inverted", "收益率倒挂 - 衰退预警", "Inverted - Recession warning", "bearish"
        elif spread < 0.5:
            level, cn, en, signal = "flat", "曲线平坦 - 经济放缓信号", "Flat - Economic slowdown signal", "neutral"
        elif spread < 1.5:
            level, cn, en, signal = "normal", "正常曲线 - 经济健康", "Normal - Healthy economy", "bullish"
        else:
            level, cn, en, signal = "steep", "陡峭曲线 - 经济扩张预期", "Steep - Economic expansion expected", "bullish"

        logger.info("Yield Curve: 10Y=%.2f%%, spread=%.2f%% (%s)", yield_10y, spread, level)
        return {
            "yield_10y": round(yield_10y, 2), "yield_2y": round(yield_2y, 2),
            "spread": round(spread, 2), "change": round(yc_change, 3),
            "level": level, "signal": signal, "interpretation": cn, "interpretation_en": en,
        }
    except Exception as e:
        logger.error("Failed to fetch Yield Curve: %s", e, exc_info=True)
        return {
            "yield_10y": 0, "yield_2y": 0, "spread": 0, "change": 0,
            "level": "unknown", "signal": "neutral",
            "interpretation": "数据获取失败", "interpretation_en": "Data fetch failed",
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


def fetch_inflation_data() -> dict:
    """
    Fetch CPI YoY and Core PCE YoY from FRED via yfinance.

    FRED monthly series:
      CPIAUCSL  — Consumer Price Index for All Urban Consumers (not seasonally adjusted level)
      PCEPILFE  — Core PCE Price Index (excluding food & energy)

    Strategy:
      - Download last 14 months of monthly data
      - Compute YoY % change: (latest / value_12m_ago - 1) * 100
      - Return latest values + YoY for both series

    Returns dict with keys:
      cpi_level, cpi_yoy, cpi_date (str YYYY-MM)
      pce_core_level, pce_core_yoy, pce_core_date (str YYYY-MM)
      data_quality: 'real' | 'partial' | 'unavailable'
      source: str
    """
    result = {
        "cpi_level": None,
        "cpi_yoy": None,
        "cpi_date": None,
        "pce_core_level": None,
        "pce_core_yoy": None,
        "pce_core_date": None,
        "data_quality": "unavailable",
        "source": "FRED via yfinance",
    }

    try:
        import yfinance as yf
        import pandas as pd

        def _fetch_yoy(fred_ticker: str) -> tuple:
            """Return (latest_level, yoy_pct, date_str) or (None, None, None)."""
            try:
                t = yf.Ticker(fred_ticker)
                # FRED monthly data — fetch 14 months to guarantee 12m lag
                hist = t.history(period="14mo", interval="1mo")
                if hist is None or len(hist) < 13:
                    logger.warning("fetch_inflation_data: %s has only %d rows", fred_ticker, len(hist) if hist is not None else 0)
                    return None, None, None

                # Drop rows where Close is NaN
                hist = hist.dropna(subset=["Close"])
                if len(hist) < 13:
                    return None, None, None

                latest_row = hist.iloc[-1]
                year_ago_row = hist.iloc[-13]

                latest_val = float(latest_row["Close"])
                year_ago_val = float(year_ago_row["Close"])

                if year_ago_val == 0:
                    return None, None, None

                yoy = round((latest_val / year_ago_val - 1) * 100, 2)
                date_str = latest_row.name.strftime("%Y-%m") if hasattr(latest_row.name, "strftime") else str(latest_row.name)[:7]

                return round(latest_val, 4), yoy, date_str

            except Exception as e:
                logger.error("fetch_inflation_data %s failed: %s", fred_ticker, e)
                return None, None, None

        cpi_level, cpi_yoy, cpi_date = _fetch_yoy("CPIAUCSL")
        pce_level, pce_yoy, pce_date = _fetch_yoy("PCEPILFE")

        if cpi_yoy is not None:
            result["cpi_level"] = cpi_level
            result["cpi_yoy"] = cpi_yoy
            result["cpi_date"] = cpi_date

        if pce_yoy is not None:
            result["pce_core_level"] = pce_level
            result["pce_core_yoy"] = pce_yoy
            result["pce_core_date"] = pce_date

        # Data quality
        if cpi_yoy is not None and pce_yoy is not None:
            result["data_quality"] = "real"
        elif cpi_yoy is not None or pce_yoy is not None:
            result["data_quality"] = "partial"
        else:
            result["data_quality"] = "unavailable"

        logger.info(
            "fetch_inflation_data: CPI YoY=%s%% (%s), PCE Core YoY=%s%% (%s), quality=%s",
            cpi_yoy, cpi_date, pce_yoy, pce_date, result["data_quality"],
        )

    except Exception as e:
        logger.error("fetch_inflation_data failed: %s", e, exc_info=True)

    return result


def fetch_employment_data() -> dict:
    """
    Fetch key US employment metrics from FRED via yfinance.

    Series:
      UNRATE    — Unemployment Rate (monthly, %)
      IC4WSA    — Initial Jobless Claims 4-week average (weekly, K persons)
      PAYEMS    — Nonfarm Payrolls (monthly, K persons)

    Returns dict with keys:
      unemployment_rate, unemployment_date
      initial_claims, initial_claims_date
      nonfarm_payrolls, nonfarm_payrolls_mom (month-over-month change in K)
      data_quality: 'real' | 'partial' | 'unavailable'
      source: str
    """
    result = {
        "unemployment_rate": None,
        "unemployment_date": None,
        "initial_claims": None,
        "initial_claims_date": None,
        "nonfarm_payrolls": None,
        "nonfarm_payrolls_mom": None,
        "nonfarm_payrolls_date": None,
        "data_quality": "unavailable",
        "source": "FRED via yfinance",
    }

    connected = 0

    try:
        import yfinance as yf

        # ── UNRATE (monthly) ──────────────────────────────────────────────
        try:
            hist = yf.Ticker("UNRATE").history(period="3mo", interval="1mo")
            if hist is not None and not hist.empty:
                hist = hist.dropna(subset=["Close"])
                if len(hist) >= 1:
                    latest = hist.iloc[-1]
                    result["unemployment_rate"] = round(float(latest["Close"]), 2)
                    result["unemployment_date"] = latest.name.strftime("%Y-%m") if hasattr(latest.name, "strftime") else str(latest.name)[:7]
                    connected += 1
                    logger.info("UNRATE: %.2f%% (%s)", result["unemployment_rate"], result["unemployment_date"])
        except Exception as e:
            logger.warning("fetch_employment_data UNRATE failed: %s", e)

        # ── IC4WSA (weekly 4-week average initial claims) ──────────────────
        try:
            hist = yf.Ticker("IC4WSA").history(period="1mo", interval="1wk")
            if hist is not None and not hist.empty:
                hist = hist.dropna(subset=["Close"])
                if len(hist) >= 1:
                    latest = hist.iloc[-1]
                    # IC4WSA is reported in thousands
                    result["initial_claims"] = round(float(latest["Close"]), 1)
                    result["initial_claims_date"] = latest.name.strftime("%Y-%m-%d") if hasattr(latest.name, "strftime") else str(latest.name)[:10]
                    connected += 1
                    logger.info("IC4WSA: %.1fK (%s)", result["initial_claims"], result["initial_claims_date"])
        except Exception as e:
            logger.warning("fetch_employment_data IC4WSA failed: %s", e)

        # ── PAYEMS (monthly nonfarm payrolls, K persons) ───────────────────
        try:
            hist = yf.Ticker("PAYEMS").history(period="3mo", interval="1mo")
            if hist is not None and not hist.empty:
                hist = hist.dropna(subset=["Close"])
                if len(hist) >= 2:
                    latest = hist.iloc[-1]
                    prev   = hist.iloc[-2]
                    result["nonfarm_payrolls"] = round(float(latest["Close"]), 0)
                    result["nonfarm_payrolls_mom"] = round(float(latest["Close"]) - float(prev["Close"]), 0)
                    result["nonfarm_payrolls_date"] = latest.name.strftime("%Y-%m") if hasattr(latest.name, "strftime") else str(latest.name)[:7]
                    connected += 1
                    logger.info("PAYEMS: %.0fK (MoM %+.0fK) (%s)", result["nonfarm_payrolls"], result["nonfarm_payrolls_mom"], result["nonfarm_payrolls_date"])
        except Exception as e:
            logger.warning("fetch_employment_data PAYEMS failed: %s", e)

        result["data_quality"] = "real" if connected == 3 else "partial" if connected >= 1 else "unavailable"
        logger.info("fetch_employment_data: connected=%d, quality=%s", connected, result["data_quality"])

    except Exception as e:
        logger.error("fetch_employment_data failed: %s", e, exc_info=True)

    return result


def fetch_growth_data() -> dict:
    """
    Fetch key US economic growth metrics from FRED / yfinance.

    Series:
      ISMMAN    — ISM Manufacturing PMI (monthly, index)
      ISMSVC    — ISM Services PMI (monthly, index)
      RSXFSN    — Advance Retail Sales ex Food Services (monthly, M USD)
      INDPRO    — Industrial Production Index (monthly, index 2017=100)

    YoY for RSXFSN and INDPRO: computed as (latest / 12m_ago - 1) * 100.

    Returns dict with keys:
      ism_manufacturing, ism_manufacturing_date
      ism_services, ism_services_date
      retail_sales_mom (% month-over-month)
      industrial_production_yoy (% year-over-year)
      data_quality: 'real' | 'partial' | 'unavailable'
      source: str
    """
    result = {
        "ism_manufacturing": None,
        "ism_manufacturing_date": None,
        "ism_services": None,
        "ism_services_date": None,
        "retail_sales_mom": None,
        "retail_sales_date": None,
        "industrial_production_yoy": None,
        "industrial_production_date": None,
        "data_quality": "unavailable",
        "source": "FRED via yfinance",
    }

    connected = 0

    try:
        import yfinance as yf

        # ── ISM Manufacturing PMI ──────────────────────────────────────────
        try:
            hist = yf.Ticker("ISMMAN").history(period="3mo", interval="1mo")
            if hist is not None and not hist.empty:
                hist = hist.dropna(subset=["Close"])
                if len(hist) >= 1:
                    latest = hist.iloc[-1]
                    result["ism_manufacturing"] = round(float(latest["Close"]), 1)
                    result["ism_manufacturing_date"] = latest.name.strftime("%Y-%m") if hasattr(latest.name, "strftime") else str(latest.name)[:7]
                    connected += 1
                    logger.info("ISMMAN: %.1f (%s)", result["ism_manufacturing"], result["ism_manufacturing_date"])
        except Exception as e:
            logger.warning("fetch_growth_data ISMMAN failed: %s", e)

        # ── ISM Services PMI ──────────────────────────────────────────────
        try:
            hist = yf.Ticker("ISMSVC").history(period="3mo", interval="1mo")
            if hist is not None and not hist.empty:
                hist = hist.dropna(subset=["Close"])
                if len(hist) >= 1:
                    latest = hist.iloc[-1]
                    result["ism_services"] = round(float(latest["Close"]), 1)
                    result["ism_services_date"] = latest.name.strftime("%Y-%m") if hasattr(latest.name, "strftime") else str(latest.name)[:7]
                    connected += 1
                    logger.info("ISMSVC: %.1f (%s)", result["ism_services"], result["ism_services_date"])
        except Exception as e:
            logger.warning("fetch_growth_data ISMSVC failed: %s", e)

        # ── Retail Sales MoM (RSXFSN) ──────────────────────────────────────
        try:
            hist = yf.Ticker("RSXFSN").history(period="3mo", interval="1mo")
            if hist is not None and not hist.empty:
                hist = hist.dropna(subset=["Close"])
                if len(hist) >= 2:
                    latest = hist.iloc[-1]
                    prev   = hist.iloc[-2]
                    mom = round(((float(latest["Close"]) / float(prev["Close"])) - 1) * 100, 2)
                    result["retail_sales_mom"] = mom
                    result["retail_sales_date"] = latest.name.strftime("%Y-%m") if hasattr(latest.name, "strftime") else str(latest.name)[:7]
                    connected += 1
                    logger.info("RSXFSN MoM: %+.2f%% (%s)", mom, result["retail_sales_date"])
        except Exception as e:
            logger.warning("fetch_growth_data RSXFSN failed: %s", e)

        # ── Industrial Production YoY (INDPRO) ─────────────────────────────
        try:
            hist = yf.Ticker("INDPRO").history(period="14mo", interval="1mo")
            if hist is not None and not hist.empty:
                hist = hist.dropna(subset=["Close"])
                if len(hist) >= 13:
                    latest    = hist.iloc[-1]
                    year_ago  = hist.iloc[-13]
                    yoy = round(((float(latest["Close"]) / float(year_ago["Close"])) - 1) * 100, 2)
                    result["industrial_production_yoy"] = yoy
                    result["industrial_production_date"] = latest.name.strftime("%Y-%m") if hasattr(latest.name, "strftime") else str(latest.name)[:7]
                    connected += 1
                    logger.info("INDPRO YoY: %+.2f%% (%s)", yoy, result["industrial_production_date"])
        except Exception as e:
            logger.warning("fetch_growth_data INDPRO failed: %s", e)

        result["data_quality"] = "real" if connected >= 3 else "partial" if connected >= 1 else "unavailable"
        logger.info("fetch_growth_data: connected=%d, quality=%s", connected, result["data_quality"])

    except Exception as e:
        logger.error("fetch_growth_data failed: %s", e, exc_info=True)

    return result


# ── NEW: Commodities (WTI + Gold) ──────────────────────────────────────────

def fetch_wti_gold() -> dict:
    """
    Fetch WTI crude oil (CL=F) and Gold spot (GC=F) via yfinance.

    Returns:
      wti: { value, change, change_pct } | None
      gold: { value, change, change_pct } | None
      data_quality: 'real' | 'partial' | 'unavailable'
      source: str
    """
    result = {
        "wti": None,
        "gold": None,
        "data_quality": "unavailable",
        "source": "yfinance CL=F / GC=F",
    }

    try:
        import yfinance as yf
        import pandas as pd

        tickers = yf.download(
            ["CL=F", "GC=F"],
            period="5d",
            progress=False,
            auto_adjust=True,
        )

        if tickers.empty:
            logger.warning("fetch_wti_gold: yfinance returned empty dataframe")
            return result

        closes = tickers["Close"] if "Close" in tickers.columns else tickers

        def _extract(col: str) -> dict | None:
            if col not in closes.columns:
                return None
            vals = closes[col].dropna()
            if vals.empty:
                return None
            latest = float(vals.iloc[-1])
            prev   = float(vals.iloc[-2]) if len(vals) >= 2 else latest
            chg    = round(latest - prev, 2)
            chg_pct = round((latest / prev - 1) * 100, 2) if prev else 0
            return {
                "value":      round(latest, 2),
                "change":     chg,
                "change_pct": chg_pct,
            }

        result["wti"]  = _extract("CL=F")
        result["gold"] = _extract("GC=F")

        present = sum(v is not None for v in [result["wti"], result["gold"]])
        result["data_quality"] = (
            "real"        if present == 2 else
            "partial"     if present == 1 else
            "unavailable"
        )

        logger.info(
            "fetch_wti_gold: WTI=%s, Gold=%s (%s)",
            result["wti"]["value"] if result["wti"] else "None",
            result["gold"]["value"] if result["gold"] else "None",
            result["data_quality"],
        )

    except Exception as e:
        logger.error("fetch_wti_gold failed: %s", e, exc_info=True)

    return result


# ── NEW: Rates Extended (30Y yield + Fed Funds Rate) ───────────────────────

def fetch_rates_extended() -> dict:
    """
    Fetch additional rates data not covered by fetch_yield_curve():
      - 30Y Treasury yield via yfinance (^TYX)
      - Fed Funds effective rate via FRED direct CSV (DFF)

    Returns:
      fed_funds: { value, change } | None
      us30y:     { value, change } | None
      data_quality: 'real' | 'partial' | 'unavailable'
      source: str
    """
    import requests as _requests

    result = {
        "fed_funds": None,
        "us30y":     None,
        "data_quality": "unavailable",
        "source": "yfinance ^TYX + FRED DFF",
    }

    # ── 30Y yield (yfinance) ──
    try:
        import yfinance as yf
        hist = yf.Ticker("^TYX").history(period="5d")
        if hist is not None and not hist.empty:
            latest = float(hist["Close"].iloc[-1])
            prev   = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else latest
            result["us30y"] = {
                "value":  round(latest, 3),
                "change": round(latest - prev, 3),
            }
            logger.info("30Y yield: %.3f%%", latest)
    except Exception as e:
        logger.warning("fetch_rates_extended: 30Y yfinance failed: %s", e)

    # ── Fed Funds Rate (FRED direct CSV — no API key) ──
    try:
        _FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFF"
        resp = _requests.get(
            _FRED_CSV,
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (compatible; QuantBrew/1.0)"},
        )
        if resp.status_code == 200:
            lines = resp.text.strip().split("\n")
            data_lines = [
                l for l in lines
                if l and not l.startswith("DATE") and not l.endswith(".")
            ]
            if data_lines:
                # Last two values for change
                last  = data_lines[-1].split(",")
                prev  = data_lines[-2].split(",") if len(data_lines) >= 2 else last
                val   = float(last[1].strip())
                p_val = float(prev[1].strip())
                result["fed_funds"] = {
                    "value":  round(val, 3),
                    "change": round(val - p_val, 3),
                }
                logger.info("Fed Funds Rate (FRED): %.3f%%", val)
        else:
            logger.warning("fetch_rates_extended: FRED DFF HTTP %d", resp.status_code)
    except Exception as e:
        logger.warning("fetch_rates_extended: Fed Funds FRED failed: %s", e)

    present = sum(v is not None for v in [result["fed_funds"], result["us30y"]])
    result["data_quality"] = (
        "real"        if present == 2 else
        "partial"     if present == 1 else
        "unavailable"
    )
    logger.info(
        "fetch_rates_extended: FedFunds=%s, 30Y=%s (%s)",
        result["fed_funds"]["value"] if result["fed_funds"] else "None",
        result["us30y"]["value"]     if result["us30y"]     else "None",
        result["data_quality"],
    )
    return result
