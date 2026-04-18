"""
Fed balance sheet liquidity fetcher.

Fetches WALCL, TGA (WTREGEN), and RRP (RRPONTSYD) from FRED via yfinance.
Computes net US liquidity: WALCL - TGA - RRP

All three series are weekly (Wednesday), reported in billions USD.
FRED ticker mappings:
  WALCL    = Fed total assets (billions USD)
  WTREGEN  = Treasury General Account at Federal Reserve (billions USD)
  RRPONTSYD = Overnight Reverse Repurchase Agreements (billions USD)
"""

from __future__ import annotations

import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

# yfinance FRED tickers
_WALCL_TICKER    = "WALCL"
_TGA_TICKER      = "WTREGEN"
_RRP_TICKER      = "RRPONTSYD"


def _fetch_fred_series(ticker_symbol: str, label: str) -> float | None:
    """Fetch the latest value of a FRED series via yfinance. Returns None on failure."""
    try:
        import yfinance as yf
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period="30d")  # FRED weekly — need recent window
        if hist is not None and not hist.empty:
            value = float(hist["Close"].iloc[-1])
            logger.info("FRED %s (%s): %.2f B", ticker_symbol, label, value)
            return value
        else:
            logger.warning("FRED %s (%s): empty history", ticker_symbol, label)
            return None
    except Exception as e:
        logger.error("FRED %s (%s) fetch failed: %s", ticker_symbol, label, e)
        return None


def fetch_fed_liquidity() -> Dict[str, Any]:
    """
    Fetch WALCL, TGA, RRP and compute net US liquidity.

    Returns a dict with:
      walcl        : float | None   (billions USD)
      tga          : float | None   (billions USD)
      rrp          : float | None   (billions USD)
      net_liquidity: float | None   (WALCL - TGA - RRP, billions USD)
      data_quality : 'real' | 'partial' | 'unavailable'
      source       : str
    """
    walcl = _fetch_fred_series(_WALCL_TICKER, "Fed Assets")
    tga   = _fetch_fred_series(_TGA_TICKER,   "Treasury General Account")
    rrp   = _fetch_fred_series(_RRP_TICKER,   "Overnight RRP")

    available = sum(x is not None for x in [walcl, tga, rrp])

    if available == 3:
        net = walcl - tga - rrp
        quality = "real"
    elif available > 0:
        # Partial: compute net with available components, mark missing as 0
        net = (walcl or 0.0) - (tga or 0.0) - (rrp or 0.0)
        quality = "partial"
    else:
        net = None
        quality = "unavailable"

    logger.info(
        "Fed liquidity: WALCL=%.1f, TGA=%.1f, RRP=%.1f → Net=%.1f (%s)",
        walcl or 0, tga or 0, rrp or 0, net or 0, quality,
    )

    return {
        "walcl":         round(walcl, 1) if walcl is not None else None,
        "tga":           round(tga,   1) if tga   is not None else None,
        "rrp":           round(rrp,   1) if rrp   is not None else None,
        "net_liquidity": round(net,   1) if net   is not None else None,
        "data_quality":  quality,
        "source":        "FRED via yfinance (WALCL, WTREGEN, RRPONTSYD)",
    }
