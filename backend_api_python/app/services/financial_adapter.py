from typing import Dict, Any, List, Optional
from datetime import datetime

# Alias mapping definitions
INCOME_ALIASES = {
    "revenue": ["Total Revenue", "Revenue", "Operating Revenue"],
    "cost_of_revenue": ["Cost Of Revenue", "Reconciled Cost Of Revenue"],
    "gross_profit": ["Gross Profit"],
    "operating_income": ["Operating Income", "Operating Profit", "Total Operating Income As Reported"],
    "net_income": ["Net Income", "Net Income Common Stockholders", "Net Income From Continuing Operation Net Minority Interest"],
    "ebitda": ["EBITDA", "Normalized EBITDA"],
    "ebit": ["EBIT"],
    "interest_expense": ["Interest Expense"],
    "eps_diluted": ["Diluted EPS"]
}

CASH_FLOW_ALIASES = {
    "operating_cash_flow": ["Operating Cash Flow", "Total Cash From Operating Activities"],
    "capex": ["Capital Expenditure", "Capital Expenditures"],
    "free_cash_flow": ["Free Cash Flow"],
    "dividends_paid": ["Cash Dividends Paid", "Dividends Paid"],
    "share_buybacks": ["Repurchase Of Capital Stock", "Repurchase Of Common Stock", "Stock Repurchase"]
}

BALANCE_SHEET_ALIASES = {
    "total_assets": ["Total Assets"],
    "current_assets": ["Current Assets", "Total Current Assets"],
    "cash": ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"],
    "receivables": ["Accounts Receivable", "Receivables"],
    "inventory": ["Inventory"],
    "net_ppe": ["Net PPE", "Property Plant Equipment"],
    "total_liabilities": ["Total Liabilities Net Minority Interest", "Total Liabilities"],
    "total_debt": ["Total Debt"],
    "long_term_debt": ["Long Term Debt"],
    "short_term_debt": ["Current Debt", "Short Long Term Debt"],
    "net_debt": ["Net Debt"],
    "total_equity": ["Stockholders Equity", "Total Equity Gross Minority Interest", "Common Stock Equity"],
    "working_capital": ["Working Capital"]
}

def extract_field(date_data: Dict[str, Any], aliases: List[str]) -> Optional[float]:
    """Safely extracts a numeric field from data given a list of aliases."""
    for alias in aliases:
        if alias in date_data and date_data[alias] is not None:
            try:
                return float(date_data[alias])
            except (ValueError, TypeError):
                continue
    return None

def normalize_financials(raw_data: Dict[str, Any], symbol: str, period: str) -> Dict[str, Any]:
    """
    Normalizes raw financial data into a structured output.
    """
    field_status = {}
    
    def track_status(field: str, val: Any, method: str = "connected"):
        if val is not None:
            field_status[field] = method
        elif field not in field_status or field_status[field] == "missing":
            field_status[field] = "missing"

    raw_inc = raw_data.get('income_statement', {})
    raw_cf = raw_data.get('cash_flow', {})
    raw_bs = raw_data.get('balance_sheet', {})
    
    # Extract all distinct dates across all statements
    all_dates = set(list(raw_inc.keys()) + list(raw_cf.keys()) + list(raw_bs.keys()))
    # Sort dates descending (newest first)
    sorted_dates = sorted(list(all_dates), reverse=True)
    
    normalized_inc = []
    normalized_cf = []
    normalized_bs = []
    normalized_ratios = []
    
    # Process each date
    for date_str in sorted_dates:
        inc_data = raw_inc.get(date_str, {})
        cf_data = raw_cf.get(date_str, {})
        bs_data = raw_bs.get(date_str, {})
        
        # --- Income Statement ---
        inc_row = {"date": date_str}
        for field, aliases in INCOME_ALIASES.items():
            val = extract_field(inc_data, aliases)
            inc_row[field] = val
            track_status(field, val)
            
        # Computed Income
        rev = inc_row.get("revenue")
        
        gross_profit = inc_row.get("gross_profit")
        if rev and rev != 0 and gross_profit is not None:
            inc_row["gross_margin"] = gross_profit / rev
            track_status("gross_margin", inc_row["gross_margin"], "computed")
        else:
            inc_row["gross_margin"] = None
            track_status("gross_margin", None)
            
        op_inc = inc_row.get("operating_income")
        if rev and rev != 0 and op_inc is not None:
            inc_row["operating_margin"] = op_inc / rev
            track_status("operating_margin", inc_row["operating_margin"], "computed")
        else:
            inc_row["operating_margin"] = None
            track_status("operating_margin", None)
            
        net_inc = inc_row.get("net_income")
        if rev and rev != 0 and net_inc is not None:
            inc_row["net_margin"] = net_inc / rev
            track_status("net_margin", inc_row["net_margin"], "computed")
        else:
            inc_row["net_margin"] = None
            track_status("net_margin", None)
            
        normalized_inc.append(inc_row)
        
        # --- Cash Flow ---
        cf_row = {"date": date_str}
        for field, aliases in CASH_FLOW_ALIASES.items():
            val = extract_field(cf_data, aliases)
            cf_row[field] = val
            track_status(field, val)
            
        # Computed CF
        op_cf = cf_row.get("operating_cash_flow")
        capex = cf_row.get("capex")
        fcf = cf_row.get("free_cash_flow")
        
        if fcf is None and op_cf is not None and capex is not None:
            # CAPEX is usually reported as negative in yfinance, so add it
            if capex < 0:
                fcf = op_cf + capex
            else:
                fcf = op_cf - capex
            cf_row["free_cash_flow"] = fcf
            track_status("free_cash_flow", fcf, "computed")
            
        if rev and rev != 0 and fcf is not None:
            cf_row["fcf_margin"] = fcf / rev
            track_status("fcf_margin", cf_row["fcf_margin"], "computed")
        else:
            cf_row["fcf_margin"] = None
            track_status("fcf_margin", None)
            
        if rev and rev != 0 and capex is not None:
            cf_row["capex_to_revenue"] = abs(capex) / rev
            track_status("capex_to_revenue", cf_row["capex_to_revenue"], "computed")
        else:
            cf_row["capex_to_revenue"] = None
            track_status("capex_to_revenue", None)
            
        normalized_cf.append(cf_row)
        
        # --- Balance Sheet ---
        bs_row = {"date": date_str}
        for field, aliases in BALANCE_SHEET_ALIASES.items():
            val = extract_field(bs_data, aliases)
            bs_row[field] = val
            track_status(field, val)
            
        normalized_bs.append(bs_row)
        
        # --- Ratios ---
        ratios_row = {"date": date_str}
        
        cur_assets = bs_row.get("current_assets")
        cur_liab = extract_field(bs_data, ["Current Liabilities", "Total Current Liabilities"])
        if cur_assets is not None and cur_liab is not None and cur_liab != 0:
            ratios_row["current_ratio"] = cur_assets / cur_liab
            track_status("current_ratio", ratios_row["current_ratio"], "computed")
        else:
            ratios_row["current_ratio"] = None
            track_status("current_ratio", None)
            
        inventory = bs_row.get("inventory")
        if cur_assets is not None and cur_liab is not None and cur_liab != 0 and inventory is not None:
            ratios_row["quick_ratio"] = (cur_assets - inventory) / cur_liab
            track_status("quick_ratio", ratios_row["quick_ratio"], "computed")
        else:
            ratios_row["quick_ratio"] = None
            track_status("quick_ratio", None)
            
        tot_debt = bs_row.get("total_debt")
        tot_eq = bs_row.get("total_equity")
        if tot_debt is not None and tot_eq is not None and tot_eq != 0:
            ratios_row["debt_to_equity"] = tot_debt / tot_eq
            track_status("debt_to_equity", ratios_row["debt_to_equity"], "computed")
        else:
            ratios_row["debt_to_equity"] = None
            track_status("debt_to_equity", None)
            
        tot_assets = bs_row.get("total_assets")
        if tot_debt is not None and tot_assets is not None and tot_assets != 0:
            ratios_row["debt_to_assets"] = tot_debt / tot_assets
            track_status("debt_to_assets", ratios_row["debt_to_assets"], "computed")
        else:
            ratios_row["debt_to_assets"] = None
            track_status("debt_to_assets", None)
            
        if net_inc is not None and tot_eq is not None and tot_eq != 0:
            ratios_row["roe"] = net_inc / tot_eq
            track_status("roe", ratios_row["roe"], "computed")
        else:
            ratios_row["roe"] = None
            track_status("roe", None)
            
        if net_inc is not None and tot_assets is not None and tot_assets != 0:
            ratios_row["roa"] = net_inc / tot_assets
            track_status("roa", ratios_row["roa"], "computed")
        else:
            ratios_row["roa"] = None
            track_status("roa", None)
            
        asset_turnover = None
        if rev is not None and tot_assets is not None and tot_assets != 0:
            asset_turnover = rev / tot_assets
            ratios_row["asset_turnover"] = asset_turnover
            track_status("asset_turnover", asset_turnover, "computed")
        else:
            ratios_row["asset_turnover"] = None
            track_status("asset_turnover", None)
            
        equity_multiplier = None
        if tot_assets is not None and tot_eq is not None and tot_eq != 0:
            equity_multiplier = tot_assets / tot_eq
            ratios_row["equity_multiplier"] = equity_multiplier
            track_status("equity_multiplier", equity_multiplier, "computed")
        else:
            ratios_row["equity_multiplier"] = None
            track_status("equity_multiplier", None)
            
        net_margin = inc_row.get("net_margin")
        if net_margin is not None and asset_turnover is not None and equity_multiplier is not None:
            ratios_row["dupont_roe"] = net_margin * asset_turnover * equity_multiplier
            track_status("dupont_roe", ratios_row["dupont_roe"], "computed")
        else:
            ratios_row["dupont_roe"] = None
            track_status("dupont_roe", None)
            
        # Invested Capital for ROIC
        cash = bs_row.get("cash") or 0
        inv_cap = None
        if tot_eq is not None and tot_debt is not None:
            inv_cap = tot_eq + tot_debt - cash
            
        if op_inc is not None and inv_cap is not None and inv_cap != 0:
            # using effective tax rate approximation or simply NOPAT ~ OpInc * 0.75
            ratios_row["roic"] = (op_inc * 0.75) / inv_cap
            track_status("roic", ratios_row["roic"], "computed")
        else:
            ratios_row["roic"] = None
            track_status("roic", None)
            
        normalized_ratios.append(ratios_row)

    # --- Summary KPIs ---
    summary = {}
    if len(normalized_inc) > 0:
        latest_inc = normalized_inc[0]
        prev_inc = normalized_inc[1] if len(normalized_inc) > 1 else {}
        
        summary["latest_revenue"] = latest_inc.get("revenue")
        summary["latest_gross_profit"] = latest_inc.get("gross_profit")
        summary["latest_operating_income"] = latest_inc.get("operating_income")
        summary["latest_net_income"] = latest_inc.get("net_income")
        summary["latest_ebitda"] = latest_inc.get("ebitda")
        
        summary["gross_margin"] = latest_inc.get("gross_margin")
        summary["operating_margin"] = latest_inc.get("operating_margin")
        summary["net_margin"] = latest_inc.get("net_margin")
        
        rev_now = summary["latest_revenue"]
        rev_prev = prev_inc.get("revenue")
        if rev_now is not None and rev_prev is not None and rev_prev != 0:
            summary["revenue_growth_yoy"] = (rev_now - rev_prev) / abs(rev_prev)
        else:
            summary["revenue_growth_yoy"] = None
            
        net_now = summary["latest_net_income"]
        net_prev = prev_inc.get("net_income")
        if net_now is not None and net_prev is not None and net_prev != 0:
            summary["net_income_growth_yoy"] = (net_now - net_prev) / abs(net_prev)
        else:
            summary["net_income_growth_yoy"] = None

    if len(normalized_cf) > 0:
        latest_cf = normalized_cf[0]
        summary["latest_fcf"] = latest_cf.get("free_cash_flow")
        summary["fcf_margin"] = latest_cf.get("fcf_margin")
        
    if len(normalized_ratios) > 0:
        latest_ratios = normalized_ratios[0]
        summary["roe"] = latest_ratios.get("roe")
        summary["roa"] = latest_ratios.get("roa")
        summary["roic"] = latest_ratios.get("roic")
        summary["current_ratio"] = latest_ratios.get("current_ratio")
        summary["quick_ratio"] = latest_ratios.get("quick_ratio")
        summary["debt_to_equity"] = latest_ratios.get("debt_to_equity")
        summary["debt_to_assets"] = latest_ratios.get("debt_to_assets")
        
    # --- Final Output ---
    return {
        "success": True,
        "data": {
            "symbol": symbol,
            "period": period,
            "currency": "USD", # Default, can be refined if we pull from yf info
            "source": "yfinance",
            "last_updated": datetime.now().isoformat() + "Z",
            "dates": sorted_dates,
            "summary": summary,
            "normalized": {
                "income": normalized_inc,
                "cash_flow": normalized_cf,
                "balance_sheet": normalized_bs,
                "ratios": normalized_ratios
            },
            "raw": {
                "income_statement": raw_inc,
                "cash_flow": raw_cf,
                "balance_sheet": raw_bs
            },
            "field_status": field_status
        }
    }
