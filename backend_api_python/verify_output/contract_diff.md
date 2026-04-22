# Phase 0.5 — Runtime Contract Diff Report
> Generated: 2026-04-19 20:55:46

---

## 1. GET /api/global-market/overview

### Issues (frontend normalizer will silently break)
- 🔴 FIELD NAME MISMATCH — indices[].name: FE expects 'name', BE returns 'name_cn'=标普500 / 'name_en'=S&P 500
- 🔴 FIELD NAME MISMATCH — indices[].change_percent: FE expects 'change_percent', BE returns 'change'=1.2 (this IS the % value per source code)
- 🔴 STRUCTURE MISMATCH — FE expects us_indices[] + global_indices[], BE returns flat 'indices[]' with 10 items. Regions present: {'US', 'IN', 'AU', 'KR', 'JP', 'EU'}
- 🔴 CRYPTO MISSING — crypto[].change not in response
- 🔴 CRYPTO MISSING — crypto[].change_percent not in response
- 🔴 FOREX MISSING — forex[].change_percent not in response

### Notes
- normalizer findIndex() searches item.name → will always miss, returns undefined
- normalizer indexToTicker() reads item.change_percent → undefined → NaN in UI
- normalizer normalizeMarketSnapshot() calls overview.us_indices → undefined → no US indices shown

### Raw sample — indices[0]
```json
{
  "symbol": "^GSPC",
  "name_cn": "\u6807\u666e500",
  "name_en": "S&P 500",
  "price": 7126.06,
  "change": 1.2,
  "region": "US",
  "flag": "\ud83c\uddfa\ud83c\uddf8",
  "lat": 40.7,
  "lng": -74.0,
  "category": "index"
}
```

---

## 2. GET /api/global-market/sentiment

### Issues (frontend SentimentData assumptions that are wrong)
- 🔴 vix.change_percent: FE expects this key, BE has: ['value', 'change', 'level', 'interpretation', 'interpretation_en']
- 🔴 vix.status: FE expects this key, BE has: ['value', 'change', 'level', 'interpretation', 'interpretation_en']
- 🔴 fear_greed.label: FE expects 'label', BE has 'classification'=Fear
- 🔴 fear_greed.previous: FE expects 'previous', BE has 'previous'=⛔ MISSING
- 🔴 dxy.change_percent: FE expects this key, BE has: ['value', 'change', 'level', 'interpretation', 'interpretation_en']
- 🔴 yield_curve.status: FE expects 'status', BE has: ['yield_10y', 'yield_2y', 'spread', 'change', 'level', 'signal', 'interpretation', 'interpretation_en'] (BE uses 'level'/'signal' instead of 'status')
- 🔴 us10y: FE SentimentData requires 'us10y: {value, change}' — this field is NOT returned by backend /sentiment. assess.ts and normalizer will fall back to undefined for all 10Y logic.
- 🔴 put_call_ratio: FE expects sentiment root key 'put_call_ratio' with {value, status}. BE returns key 'vix_term' with {value, level, signal}. Key name mismatch: vix_term ≠ put_call_ratio, 'level' ≠ 'status'.

### Notes
- assess.ts assessLiquidity() checks s?.us10y — will always be undefined from real API. Also assessInflationRates() checks s?.us10y → placeholderDimension() always runs.

---

## 3. POST /api/fast-analysis/analyze

> ⚠️ Stub run (no LLM key). Market data collected. LLM-generated text fields are placeholders.

### Issues (contract violations)
- ✅ No structural issues found

### Trading-only fields (present in raw response, adapter must block)
- 🔴 `decision`
- 🔴 `trading_plan`
- 🔴 `trading_plan.entry_price`
- 🔴 `trading_plan.stop_loss`
- 🔴 `trading_plan.take_profit`
- 🔴 `trading_plan.position_size_pct`

### Notes
- researchAdapter.ts cleanNarrative() regex patterns strip: 建议BUY/SELL/HOLD, entry_price, stop_loss, take_profit, position_size. Actual payload trading noise: decision, trading_plan, trading_plan.entry_price, trading_plan.stop_loss, trading_plan.take_profit, trading_plan.position_size_pct

---

## Recommended Immediate Actions

These are normalization gaps, NOT code rewrites:

1. **overview normalizer** — map `indices[].name_cn` → `name`, `indices[].change` → `change_percent`; split `indices[]` into `us_indices` vs `global_indices` by `region`
2. **sentiment normalizer** — map `fear_greed.classification` → `label`; add `us10y` by fetching `^TNX` (it's in yield_curve already as `yield_10y`); map `yield_curve.level` → `status`; rename `vix_term` → `put_call_ratio`
3. **fast_analysis adapter** — current regex approach is fragile; consider moving to field-whitelist approach in `mapToResearchDisplay()`

---

**STOP — verification only, no code changes until this report is reviewed.**