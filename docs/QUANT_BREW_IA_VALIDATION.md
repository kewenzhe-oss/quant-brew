# Quant-Brew IA Feasibility Validation

## Executive Verdict

The proposed four-tab IA (Home / Macro / Research / Watchlist) is **feasible on the current QuantDinger backend** with moderate new work. The backend already has working, production-grade modules for macro data aggregation, AI asset analysis, K-line/indicator charting, watchlist CRUD, and multi-market symbol search. These are not stubs — they are full implementations with caching, error recovery, and multi-source fallbacks.

However, three critical gaps exist:

1. **No briefing generation pipeline.** Home requires a scheduled or on-demand AI narrative synthesis layer that does not exist. The raw data sources are there; the orchestration to produce a briefing is not.
2. **AI output schema is hardcoded to BUY/SELL/HOLD.** The `FastAnalysisService` prompt and JSON output schema (`decision`, `entry_price`, `stop_loss`, `take_profit`, `position_size_pct`) are structurally trading-oriented. Reframing to research-style output requires prompt and schema changes — but the data collection, LLM orchestration, and memory/history infrastructure can be reused wholesale.
3. **Frontend source is absent.** All frontend validation is blocked. We cannot confirm page layouts, component reusability, routing structure, or how the existing AI Asset Analysis or Indicator IDE pages actually work. This is the single largest unknown.

**Net assessment**: The backend can support this IA. The missing pieces are well-scoped and sit on top of existing infrastructure rather than requiring new foundation work. The frontend is a blank slate — which is both a risk (no reuse validation) and an opportunity (no retrofitting).

---

## IA Fit by Navigation Section

### Home

**Proposed role**: Morning/evening briefing, narrative-first reading surface, "what happened today."

**Backend support status**: Partial — data available, orchestration missing.

**What exists today**:
- `GET /api/global-market/overview` — fetches indices, forex, crypto, commodities in parallel with 30s cache. Returns structured price/change data for all major asset classes. (`routes/global_market.py` lines 56-110)
- `GET /api/global-market/sentiment` — fetches Fear & Greed, VIX, DXY, yield curve, VXN, GVZ, put/call proxy in parallel. 6-hour cache. (`routes/global_market.py` lines 173-229)
- `GET /api/global-market/news` — fetches financial news via `SearchService` with CN and EN query rotations, deduplication, 3-minute cache. (`data_providers/news.py`)
- `GET /api/global-market/calendar` — economic calendar (but currently **synthetic/template-based**, not live data)
- `MarketDataCollector.collect_all()` — can gather macro + news + Polymarket + OHLC + indicators + fundamentals for any symbol, in a single call. (`services/market_data_collector.py`)
- `LLMService.safe_call_llm()` — multi-provider LLM abstraction with JSON output, fallback, error recovery. (`services/llm.py`)

**What is missing**:
- **Briefing generation service**: No `BriefingService` exists. Nothing currently takes the `overview` + `sentiment` + `news` data and asks an LLM to write a coherent Chinese-language market narrative. This is the core missing piece for Home.
- **Briefing persistence**: No `qd_briefings` table exists. Briefings need to be stored, versioned (morning vs evening), and served to the frontend.
- **Scheduled generation**: No cron/scheduler mechanism exists in the backend. The current worker model is daemon threads started in `create_app()`. A briefing worker would follow the same pattern (env-gated daemon thread on a timer).
- **"Stocks worth watching today" selection logic**: No automated mechanism identifies which 2-3 stocks deserve mention in the briefing. Would need to combine watchlist popularity, notable movers from `overview`, and news relevance scoring.

**Effort estimate**: Medium. The hardest part is prompt engineering for quality Chinese-language market narratives. The plumbing (data collection, LLM call, DB persistence, REST endpoint) can be assembled from existing patterns in ~2-3 days of backend work.

**Verdict**: Home is feasible. Build a `BriefingService` on top of existing `global_market` data providers + `LLMService`. Add a `qd_briefings` table and a `/api/briefing/*` route.

---

### Macro

**Proposed role**: Market environment dashboard — VIX, DXY, US10Y, S&P, Nasdaq, sector heatmap, economic calendar, AI macro narrative.

**Backend support status**: **Strong.** This is the best-covered section.

**What exists today**:
- `GET /api/global-market/overview` — indices (S&P 500 `^GSPC`, Dow `^DJI`, Nasdaq `^IXIC`, DAX, FTSE, Nikkei, KOSPI, ASX, Sensex), forex (major pairs), crypto (top coins), commodities (gold, silver, WTI, Brent, copper, nat gas). All with price + daily change. (`data_providers/indices.py`, `commodities.py`, `forex.py`, `crypto.py`)
- `GET /api/global-market/sentiment` — Fear & Greed (alternative.me), VIX (yfinance `^VIX`), DXY (yfinance `DX-Y.NYB`), yield curve (yfinance `^TNX` with spread proxy), VXN, GVZ, VIX term structure.
- `GET /api/global-market/heatmap` — heatmap data across crypto, stock sectors, forex, indices. (`data_providers/heatmap.py`)
- `GET /api/global-market/calendar` — economic calendar (currently synthetic, not live)
- `GET /api/global-market/opportunities` — cross-market scanner for notable movers in Crypto, USStock, CNStock, HKStock, Forex.
- `MarketRegimeService` in `services/experiment/regime.py` — market regime detection (trend, volatility state). Currently used for strategy experiments, but the regime classification logic is domain-agnostic and reusable for macro context.

**What is missing**:
- **AI macro narrative synthesis**: No endpoint currently takes the `overview` + `sentiment` data and generates a narrative paragraph. Same gap as Home, but focused on macro interpretation rather than daily story.
- **Live economic calendar**: `get_economic_calendar()` in `data_providers/news.py` returns **template-based synthetic events** (NFP, Fed meetings, CPI with hardcoded dates and placeholder actuals). This is not a real data feed. Needs replacement with a live source (Finnhub calendar API, Trading Economics, or similar).
- **Sector-level detail**: The heatmap is sector-level, but there's no endpoint for drilling into a specific sector's constituents or performance.

**Effort estimate**: Low for initial version. The `global_market` endpoints already return 90% of what the Macro page needs. Add an AI narrative endpoint (reuse `LLMService` + the existing data), fix the economic calendar to use real data (Finnhub has `economic_calendar` in its API, and the `finnhub` SDK is already a dependency), and the Macro page is backend-ready.

**Verdict**: Macro is well-supported. Lowest-effort section to implement.

---

### Research

**Proposed role**: The main asset research workspace. Contains AI Asset Analysis as the default view and Indicator IDE / Chart Lab as a secondary deeper view. Supports both stocks and crypto.

**Backend support status**: **Strong for AI Analysis. Strong for Chart Lab data. Prompt/output schema needs reframing.**

#### AI Asset Analysis (default view)

**What exists today**:
- `POST /api/fast-analysis/analyze` — the primary analysis endpoint. Accepts `market` (USStock, Crypto, Forex, etc.), `symbol`, `language` (zh-CN supported), `model` (user can select), `timeframe`. Returns a structured analysis. (`routes/fast_analysis.py`)
- `FastAnalysisService.analyze()` — the full pipeline:
  1. Calls `MarketDataCollector.collect_all()` for OHLC, indicators, fundamentals, company profile, macro, news, Polymarket
  2. Calculates objective consensus scores across multiple timeframes
  3. Builds a rich prompt with all collected data
  4. Calls LLM via `safe_call_llm()` for structured JSON output
  5. Applies consensus override logic, quality multipliers, confidence calibration
  6. Stores in `qd_analysis_memory` with full indicator snapshot
- `GET /api/fast-analysis/history` — per-symbol analysis history
- `GET /api/fast-analysis/history/all` — paginated user history
- `GET /api/fast-analysis/similar-patterns` — finds similar historical patterns from memory
- `POST /api/fast-analysis/feedback` — user feedback on analysis quality
- `MarketDataCollector._get_us_fundamental()` — Finnhub basic financials (PE, PB, PS, market cap, dividend yield, beta, 52w high/low, ROE, EPS, revenue growth, profit margin) + yfinance financial statements (balance sheet, income statement, cash flow)
- `MarketDataCollector._get_earnings_data()` — quarterly earnings from income statement, earnings calendar
- `MarketDataCollector._get_company()` — Finnhub company profile (name, industry, country, exchange, IPO date, market cap, website)
- `SearchService.search_stock_news()` / `search_stock_events()` — web search for stock-specific news and events

**What must change (AI output reframing)**:

The current LLM prompt and output schema are hardcoded to trading:

```
Current output schema (from fast_analysis.py lines 655-674):
{
  "decision": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "entry_price": number,
  "stop_loss": number,
  "take_profit": number,
  "position_size_pct": 1-100,
  "key_reasons": [...],
  "risks": [...],
  "analysis": { "technical", "fundamental", "sentiment" },
  "technical_score": 0-100,
  "fundamental_score": 0-100,
  "sentiment_score": 0-100
}
```

The proposed IA wants:
- Bullish factors / bearish factors (not "BUY" / "SELL")
- Key watch levels (not "entry_price" / "stop_loss" / "take_profit")
- Position zone / observation zone / risk zone (not "position_size_pct")
- Narrative-style summary (not "executive summary with trading recommendation")

**This is a prompt and schema change, not a pipeline change.** The data collection (`_collect_market_data`), multi-timeframe consensus (`_calculate_objective_score`), ensemble logic, calibration, and memory persistence are all reusable. You need to:

1. Create a new prompt template that asks for research-style output instead of trading recommendations
2. Define a new JSON output schema with `bullish_factors`, `bearish_factors`, `watch_levels`, `position_zone`, `narrative_summary` instead of `decision`, `entry_price`, `stop_loss`, `take_profit`
3. Either fork `FastAnalysisService` into a `ResearchAnalysisService`, or add a `mode` parameter that switches prompts

The system prompt alone is ~130 lines of trading-specific instruction (lines 562-691 in `fast_analysis.py`). Rewriting it for research framing is the primary work item. The surrounding 2,000+ lines of data collection, scoring, validation, and memory logic remain intact.

**Structural note**: The current prompt already contains research-quality content — it instructs the LLM to analyze technical, fundamental, and sentiment dimensions, to consider macro impact, to assess news and events, and to weigh multiple factors. The framing is trading-oriented, but the analytical structure is research-compatible.

#### Indicator IDE / Chart Lab (secondary view)

**What exists today**:
- `GET /api/indicator/kline` — K-line data for any market/symbol/timeframe. Supports USStock, Crypto, Forex, Futures, CNStock, HKStock. (`routes/kline.py`)
- `GET /api/indicator/price` — latest price for any symbol
- `MarketDataCollector._calculate_indicators()` (via `collect_all`) — RSI, MACD, moving averages (5/10/20), support/resistance levels, Bollinger bands, ATR, volume ratio, pivot points. All pre-computed server-side.
- `POST /api/indicator/callIndicator` — executes user-defined indicator code against K-line data, returns a DataFrame with computed columns. (`routes/indicator.py` line 1225)
- `GET /api/indicator/getIndicators` — lists user's saved indicators (Python code stored in `qd_indicator_codes`)
- `POST /api/indicator/saveIndicator` — save indicator code
- `POST /api/indicator/verifyCode` — validate indicator Python code
- `POST /api/indicator/aiGenerate` — AI code generation for indicators (natural language to Python)
- `POST /api/indicator/backtest` — backtest an indicator/strategy against historical data
- `POST /api/indicator/backtest/aiAnalyze` — AI analysis of backtest results

The backend fully supports chart data, indicator computation, and even user-defined indicators executed server-side. The Chart Lab / Indicator IDE backend is complete.

**The question is frontend, not backend.** The existing QuantDinger frontend has a full Indicator IDE with KLineCharts integration, indicator overlays, and backtest visualization — but we cannot see or validate this code because the Vue source is in a separate repository. The `frontend/dist/` contains only minified bundles.

#### Mixed stock + crypto support

**The current backend already supports this cleanly.** The `DataSourceFactory` dispatches to different data sources based on `market` parameter:

- `market="USStock"` → `USStockDataSource` (yfinance + Finnhub)
- `market="Crypto"` → `CryptoDataSource` (CCXT)
- `market="Forex"` → `ForexDataSource` (Twelve Data + Tiingo + yfinance)
- `market="CNStock"` → `CNStockDataSource`
- `market="HKStock"` → `HKStockDataSource`

Every API endpoint (`/api/fast-analysis/analyze`, `/api/indicator/kline`, `/api/market/watchlist/*`, `/api/market/symbols/search`) accepts a `market` parameter. The backend is already multi-asset by design. No changes needed for mixed stock + crypto research.

The only caution: `FastAnalysisService._build_analysis_prompt()` has crypto-specific blocks (derivatives, funding rates, OI, exchange netflow — lines 548-560) and stock-specific blocks (fundamentals, valuation — handled via `_get_us_fundamental`). The prompt correctly adapts based on `market` type. This dual-mode behavior carries over naturally to any research-reframed prompt.

**Verdict**: Research page is feasible. AI Asset Analysis needs a prompt/schema rewrite but no infrastructure change. Chart Lab / Indicator IDE backend is complete. Mixed stock + crypto works out of the box.

---

### Watchlist

**Proposed role**: User's tracked assets with daily changes and one-line AI summary per asset.

**Backend support status**: **Good for core CRUD and pricing. AI summary is new.**

**What exists today**:
- `GET /api/market/watchlist/get` — returns user's watchlist items (id, market, symbol, name) with automatic name backfill via `resolve_symbol_name()`. (`routes/market.py` lines 255-296)
- `POST /api/market/watchlist/add` — add symbol to watchlist with name resolution. Supports upsert (PostgreSQL `ON CONFLICT`). (`routes/market.py` lines 298-335)
- `POST /api/market/watchlist/remove` — remove symbol from watchlist. (`routes/market.py` lines 337-360)
- `GET /api/market/watchlist/prices` — batch price fetch for all watchlist items, using `ThreadPoolExecutor` with timeout protection. Returns `price`, `change`, `changePercent` per item. (`routes/market.py` lines 388-473)
- `GET /api/market/symbols/search` — search symbols by keyword across all market types. For crypto, falls back to live exchange search via CCXT if seed DB yields few results. (`routes/market.py` lines 163-187)
- `GET /api/market/symbols/hot` — curated hot symbols per market. (`routes/market.py` lines 243-253)

**What is missing**:
- **One-line AI summary per watchlist item**: Nothing currently generates a short text summary per symbol for the watchlist view. Two implementation paths:
  - **Lightweight**: For each watchlist item, pull the most recent `qd_analysis_memory` row (if user has run analysis before) and extract the `summary` field. No new LLM call needed — just surface existing data.
  - **Rich**: Run a batch mini-analysis for all watchlist items on a schedule (or on page load), generating a one-liner per symbol. This costs LLM tokens but provides fresh content.
  - **Hybrid**: Show the most recent analysis summary if fresh (< 24h); otherwise show price change + a template sentence ("AAPL 上涨 2.3%，接近52周高点").
- **No P&L columns**: The `qd_watchlist` table has only `user_id`, `market`, `symbol`, `name`, timestamps. No position size, entry price, or P&L fields. This is correct for Quant-Brew — the schema already aligns with a research-only watchlist.

**Effort estimate**: Low. The CRUD and pricing infrastructure is complete. The AI summary feature is a small addition on top of existing analysis history or a lightweight LLM call.

**Verdict**: Watchlist is well-supported. Minor addition for AI summaries.

---

## Research Page Feasibility

The Research page is the most complex proposed view. Validation of its two sub-views:

### AI Asset Analysis — can it work as the default Research view?

**Yes.** The `FastAnalysisService.analyze()` pipeline is a single, end-to-end analysis generator. For a given `(market, symbol, timeframe)`, it:

1. Collects all data (price, kline, indicators, fundamentals, company, macro, news, polymarket) — **10-30 seconds** depending on data source latency
2. Calculates objective scores across multiple timeframes
3. Generates a structured LLM analysis in the user's language
4. Stores the result in memory for history and similar-pattern matching

The output already includes `analysis.technical`, `analysis.fundamental`, `analysis.sentiment`, `key_reasons`, and `risks` — which map naturally to a research view's sections. The primary change is removing `decision` (BUY/SELL/HOLD), `entry_price`, `stop_loss`, `take_profit`, and `position_size_pct` from the output schema and replacing them with research-style fields.

The `analyze_legacy_format()` method in `FastAnalysisService` shows the service already supports multiple output shapes — adding a research-mode output is architecturally consistent.

### Indicator IDE / Chart Lab — can it work as a secondary view inside Research?

**Backend: yes. Frontend: unvalidatable.**

The backend provides everything the Chart Lab needs:
- K-line data at any timeframe (`/api/indicator/kline`)
- Pre-computed technical indicators (RSI, MACD, MAs, Bollinger, ATR, support/resistance, pivot)
- User-defined indicator execution (`/api/indicator/callIndicator`)
- Indicator save/load/verify/AI-generate
- Backtest execution and AI analysis of results

The frontend is the unknown. The existing QuantDinger frontend has a full Indicator IDE with:
- KLineCharts for professional chart rendering
- Indicator overlay support
- Code editor (likely Monaco or CodeMirror)
- Backtest visualization

But all of this is in `frontend/dist/` as minified JS, or in the private QuantDinger-Vue repo. We cannot validate:
- Whether the Indicator IDE component is extractable from the full QuantDinger Vue app
- What props/state it requires
- How tightly it's coupled to other pages (strategy, backtest, quick trade)
- Whether it can be embedded within a Research page rather than as a standalone page

---

## Reusable Current Modules

| Module | Path | Quant-Brew Role | Reuse Quality |
|--------|------|-----------------|---------------|
| **LLMService** | `services/llm.py` | Powers all AI synthesis (briefings, research, macro narratives, watchlist summaries) | Direct reuse, no changes |
| **MarketDataCollector** | `services/market_data_collector.py` | Core data engine for Research page analysis + briefing generation | Direct reuse, no changes |
| **DataSourceFactory** + data sources | `data_sources/*.py` | K-line, price, fundamentals for all markets | Direct reuse |
| **data_providers** (indices, commodities, sentiment, news) | `data_providers/*.py` | Powers Macro page and top strip | Direct reuse |
| **global_market route** | `routes/global_market.py` | Backend for Macro page (overview, sentiment, heatmap, news, calendar) | Direct reuse |
| **KlineService** | `services/kline.py` | Chart data for Research Chart Lab | Direct reuse |
| **SearchService** | `services/search.py` | News discovery, event search, grounding for AI | Direct reuse |
| **fast_analysis route** | `routes/fast_analysis.py` | Analysis trigger, history, similar patterns, feedback | Reuse with prompt/schema modification |
| **FastAnalysisService** (data collection + orchestration) | `services/fast_analysis.py` | Analysis pipeline engine | Reuse pipeline; replace prompt + output schema |
| **AnalysisMemory** | `services/analysis_memory.py` | History, similar patterns, feedback, performance tracking | Reuse; schema may need columns for research-mode fields |
| **Watchlist CRUD + batch pricing** | `routes/market.py` | Watchlist page backend | Direct reuse |
| **Symbol search + name resolution** | `routes/market.py` + `services/symbol_name.py` | Search bar, display names | Direct reuse |
| **Auth stack** | `routes/auth.py`, `utils/auth.py`, `services/user_service.py` | Login, JWT, OAuth | Direct reuse |
| **CacheManager + Redis** | `utils/cache.py` | Caching across all endpoints | Direct reuse |
| **SignalNotifier** | `services/signal_notifier.py` | Briefing delivery via Telegram/email | Direct reuse |
| **MarketRegimeService** | `services/experiment/regime.py` | Macro page regime classification ("risk-on"/"risk-off") | Extract and reuse |
| **AICalibrationService + ReflectionService** | `services/ai_calibration.py`, `services/reflection.py` | AI quality improvement over time | Reuse; calibration logic needs reframing from BUY/SELL accuracy to research quality |
| **indicator route** (getIndicators, saveIndicator, verifyCode, aiGenerate, callIndicator) | `routes/indicator.py` | Chart Lab indicator management | Direct reuse |
| **kline route** | `routes/kline.py` | Chart data endpoint | Direct reuse |
| **backtest route** (if Chart Lab includes backtest) | `routes/backtest.py` | Secondary: test an indicator hypothesis | Direct reuse; demoted from primary nav |

---

## Structural Conflicts

| Module | Path | Conflict | Resolution |
|--------|------|----------|------------|
| **FastAnalysisService prompt** | `services/fast_analysis.py` lines 486-691 | ~200 lines of trading-specific instructions: BUY/SELL/HOLD decision rules, entry/stop-loss/take-profit price bounds, position sizing, short-selling guidance | Replace with research-mode prompt. Fork the method or add a `mode` parameter. |
| **FastAnalysisService output schema** | `services/fast_analysis.py` lines 655-674 | JSON schema hardcodes `decision`, `entry_price`, `stop_loss`, `take_profit`, `position_size_pct` | Define new research output schema |
| **Consensus override logic** | `services/fast_analysis.py` (post-LLM) | Override sets `decision` to BUY/SELL based on consensus score thresholds | Reframe: consensus score still useful, but maps to "bullish/bearish tilt" instead of "buy/sell" |
| **`_build_decision_guidance()`** | `services/fast_analysis.py` | Builds RSI/MACD-based BUY/SELL/HOLD guidance text for the prompt | Replace with "bullish/bearish factor" guidance |
| **`_build_trend_outlook_summary()`** | `services/fast_analysis.py` lines 42-73 | Uses 看多/看空/震荡 (BUY/SELL/HOLD labels) in trend outlook | Reframe to 偏多/偏空/中性 (bullish-leaning / bearish-leaning / neutral) |
| **TradingExecutor auto-start** | `app/__init__.py` | `restore_running_strategies()` called in `create_app()` — starts trading workers on boot | Already env-gated (`DISABLE_RESTORE_RUNNING_STRATEGIES`). Set to disabled in Quant-Brew config. |
| **PendingOrderWorker auto-start** | `app/__init__.py` | Started in `create_app()` | Already env-gated (`ENABLE_PENDING_ORDER_WORKER`). Default off is fine. |
| **Trading routes registration** | `routes/__init__.py` | `quick_trade_bp`, `ibkr_bp`, `mt5_bp`, `credentials_bp` registered unconditionally | Add env-gate: only register if `ENABLE_TRADING_MODE=true`. ~10 lines of code. |
| **AnalysisMemory schema** | `migrations/init.sql` (`qd_analysis_memory`) | Columns named `decision`, `confidence`, `consensus_score` — all trading-oriented | Can coexist. Add new columns (`bullish_factors`, `bearish_factors`, `position_zone`) alongside existing ones. Old columns become nullable / unused for research-mode entries. |
| **Billing integration in fast_analysis route** | `routes/fast_analysis.py` | Credits check before analysis | Keep as infrastructure. Credits can gate research analysis in a subscription model. No conflict with research framing. |

---

## Missing Code / Missing Context

### Critical (blocks frontend validation entirely)

1. **Frontend Vue source code** — The entire Vue application source lives in a separate private repository (`QuantDinger-Vue`). `frontend/dist/` contains only minified JS bundles with hashed numeric chunk names (e.g., `509.a317710b.js`). We cannot inspect:
   - Route definitions (which URLs map to which pages)
   - AI Asset Analysis page component structure
   - Indicator IDE page component structure (KLineCharts integration, code editor, overlay system)
   - Watchlist page layout and behavior
   - Global Market overview page layout
   - Dashboard page structure
   - Component hierarchy, state management (Vuex/Pinia), API call patterns
   - How the current app navigates between analysis → chart → trade

2. **No route manifest or sitemap** — `frontend/dist/` has no `manifest.json`, no `asset-manifest.json`, and `index.html` contains no route table. The ~30 numeric JS chunks (11, 18, 22, 45, 61, 109, 119, 125, 164, 179, 334, 362, 374, 375, 402, 506, 509, 527, 593, 613, 668, 714, 727, 737, 824, 878, 912, 919) cannot be mapped to page names without the source.

### Moderate (limits validation depth but doesn't block)

3. **AI prompt templates are inline, not configurable** — The entire system prompt for `FastAnalysisService` is a Python f-string inside `_build_analysis_prompt()` (~130 lines). It's not externalized to a config file or template. This means reframing the prompt requires editing the Python service file directly. Not a blocker, but means prompt iteration requires code deployments.

4. **Economic calendar is synthetic** — `data_providers/news.py`'s `get_economic_calendar()` generates template events with synthetic dates. We don't know if Finnhub's `economic_calendar` endpoint (available in the SDK, which is already a dependency) would be sufficient, or if a separate provider is needed.

5. **`_calculate_indicators()` dead code** — `FastAnalysisService._calculate_indicators()` references `self.tools.calculate_technical_indicators()` but `self.tools` is never assigned. The live path uses `MarketDataCollector`'s indicator calculation instead. This is confusing but not a blocker — just means the method is dead code.

### Low (nice to validate but not required)

6. **Locale bundles** — `frontend/dist/js/lang-zh-CN.10166109.js` exists but is minified. We can't confirm which UI strings exist for the current Chinese localization.

7. **Current fast-analysis output shape in practice** — The `analyze_legacy_format()` method maps fast-analysis output to a "multi-section" format for the current frontend. We can't see what the frontend actually displays because we don't have the Vue source.

---

## What Additional Code Should Be Provided Next

In priority order:

### Must-have (unblocks 80% of remaining validation)

1. **QuantDinger-Vue repository** (or at minimum the `src/router/` directory and the `src/views/` or `src/pages/` directory). This reveals:
   - Complete route table → confirms which pages exist and how they're organized
   - Page component files → confirms what data each page fetches and how it renders
   - Whether AI Asset Analysis and Indicator IDE are separate pages or tabs within one page

2. **AI Asset Analysis page component** — the Vue component that calls `/api/fast-analysis/analyze` and renders the result. This shows:
   - What fields from the analysis output are displayed
   - How the analysis is laid out (sections, cards, charts)
   - Whether it already has a research-compatible structure that just needs BUY/SELL labels removed

3. **Indicator IDE / Chart page component** — the Vue component that integrates KLineCharts. This shows:
   - How indicators are overlaid
   - Whether the chart component is self-contained (extractable) or tightly coupled to surrounding pages
   - What toolbar/controls exist

### Nice-to-have (refines validation)

4. **Watchlist page component** — confirms current layout, whether it shows P&L (it probably does given portfolio features), and what can be simplified.

5. **Global Market overview page component** — confirms how macro data is displayed, whether the current layout is close to what Quant-Brew Macro needs.

6. **Vuex/Pinia store files** — reveals shared state management, which would affect how deeply pages are coupled.

---

## Recommendation: Same Codebase First vs New Chatroom / External Repos

**Recommendation: Option 2 — Provide the frontend source from QuantDinger-Vue before continuing.**

Justification:

- **The backend validation is essentially complete.** Every route, service, and data source relevant to the four-tab IA has been read and assessed. The backend can support this IA. The gaps (briefing service, prompt reframing, calendar fix) are well-scoped and sit on existing infrastructure.

- **The frontend is the entire remaining unknown.** We cannot answer the most important implementation questions without the Vue source:
  - Can the AI Asset Analysis component be reframed in-place, or must it be rebuilt?
  - Can the KLineCharts/Indicator IDE component be extracted and embedded in a Research page?
  - How is the current app structured — is it 10 clean page components, or a tangle of shared state?
  - What is the actual user flow between analysis and chart today?

- **Continuing to validate backend details has diminishing returns.** The backend modules are well-documented, well-structured, and clearly mappable to Quant-Brew's IA. Reading more backend code won't change the recommendation.

- **A separate session for external repos is unnecessary.** The only external repo that matters is QuantDinger-Vue, and it's the same project — just a different repository within the same product ecosystem. Providing its source into this workspace (or key directories from it) is the natural next step.

**What to provide**: At minimum, the `src/router/`, `src/views/`, and `src/store/` directories from QuantDinger-Vue. Ideally the full `src/` tree so component imports can be traced.

---

## Final Decision

The proposed IA (Home / Macro / Research / Watchlist) is **architecturally sound and backend-feasible**.

| Section | Backend Readiness | Frontend Readiness | Blocking Issue |
|---------|------------------|--------------------|----------------|
| **Home** | 70% — data sources exist, briefing service missing | 0% — no source | Build `BriefingService` |
| **Macro** | 90% — `global_market` endpoints cover nearly all needs | 0% — no source | Fix economic calendar, add AI narrative |
| **Research (AI Analysis)** | 85% — full pipeline exists, prompt/schema needs reframing | 0% — no source | Rewrite prompt + output schema |
| **Research (Chart Lab)** | 95% — kline, indicators, indicator execution all working | 0% — no source | Unknown: component extractability |
| **Watchlist** | 90% — CRUD + batch pricing complete | 0% — no source | Add AI one-liner per item |

**The path forward is clear**: provide the QuantDinger-Vue frontend source to validate the component-level feasibility, then begin implementation with the Macro page (lowest-effort, highest backend coverage) as the proving ground for the new IA shell.
