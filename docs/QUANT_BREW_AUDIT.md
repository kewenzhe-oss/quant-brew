# QuantDinger → Quant-Brew Audit

## Executive Summary

QuantDinger is a full-stack, self-hosted AI quantitative trading platform built on Flask + PostgreSQL + Redis (backend) with a prebuilt Vue/Ant Design Pro frontend served via Nginx. Its architecture is oriented around a **trading-operator lifecycle**: strategy code → backtest → live execution → monitoring → billing. The codebase is substantial (~23 route blueprints, ~40+ service modules, ~15 data source/provider files, ~30 DB tables) and is heavily weighted toward crypto exchange execution, Python strategy scripting, and bot operations.

**Quant-Brew requires a fundamentally different product gravity**: from "execute trades" to "read, research, synthesize." The good news is that QuantDinger contains a solid data-fetching and AI-analysis pipeline underneath the trading layers. The bad news is that the frontend source is not in this repository (only prebuilt `dist/`), and the backend's route/service hierarchy treats execution as the first-class citizen everywhere.

**Verdict**: QuantDinger is a viable base for Quant-Brew, but only under aggressive carve-out surgery. Approximately **40% of the backend surface area should be removed or demoted**, the frontend must be rebuilt from scratch (the Vue source lives in a separate private repo), and new domain models for narrative content, briefings, and contextual research UX must be created. The data and AI infrastructure layers are genuinely reusable and represent months of saved effort.

---

## Current Architecture Snapshot

### High-Level Project Structure

```
QuantDinger/
├── backend_api_python/          # Flask API (open source, Apache 2.0)
│   ├── app/
│   │   ├── __init__.py          # App factory, worker startup, executor singletons
│   │   ├── routes/              # 23 Flask blueprints
│   │   ├── services/            # ~40+ modules: AI, trading, billing, experiment
│   │   ├── data_sources/        # Market data adapters (crypto, US/CN/HK stock, forex, futures)
│   │   ├── data_providers/      # Dashboard-level aggregators (indices, commodities, news, sentiment)
│   │   ├── config/              # settings, database, API keys, data source config
│   │   ├── utils/               # DB, cache, auth, crypto, logging, safe_exec
│   │   └── data/                # Seed data, strategy templates
│   ├── migrations/init.sql      # Full PostgreSQL schema (~30 tables)
│   ├── scripts/                 # Calibration, reflection, simulation runners
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                    # Prebuilt Vue SPA only (no source)
│   ├── dist/                    # ~92 files: JS chunks, CSS, locale bundles, maps
│   ├── Dockerfile               # Nginx image
│   └── nginx.conf
├── docs/                        # Strategy guides, deployment, changelog
├── scripts/                     # Secret gen, frontend sync, i18n tooling
├── docker-compose.yml           # postgres, redis, backend, frontend
└── .env.example                 # Compose-level port/image overrides
```

### Frontend Framework and App Structure

| Aspect | Detail |
|--------|--------|
| Framework | **Vue.js** (vue-antd-pro template), Ant Design Vue, KLineCharts, ECharts |
| Build | Webpack code-splitting; modern + legacy (`nomodule`) bundles |
| Source | **Not in this repo**. Lives in private [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) repo |
| i18n | 9 locale bundles (zh-CN, zh-TW, ja-JP, ko-KR, de-DE, fr-FR, ar-SA, th-TH, vi-VN) |
| Routing | SPA with code-split numeric chunks (~30 routes); no route manifest exposed |
| Mobile | Capacitor mentioned in ecosystem; responsive media queries in loading screen |

**Key implication**: We cannot incrementally refactor the frontend in-place from this repo. A Quant-Brew frontend must either fork QuantDinger-Vue or be rebuilt on a new stack.

### Backend Framework and Service Structure

| Aspect | Detail |
|--------|--------|
| Framework | Flask 2.3.3, Gunicorn (threaded), CORS |
| Language | Python 3.10+ (Docker: 3.12) |
| Database | PostgreSQL 16 via SQLAlchemy 2.x / psycopg2-binary |
| Cache | Redis 7 (LRU 128MB), `CacheManager` abstraction |
| Auth | JWT (PyJWT), bcrypt, Fernet credential encryption, OAuth (Google/GitHub) |
| Workers | TradingExecutor, PendingOrderWorker, PortfolioMonitor, UsdtOrderWorker, CalibrationWorker, ReflectionWorker — all daemon threads started in `create_app()` |

### Key Module Map

| Domain | Routes | Services | Data Sources/Providers | DB Tables |
|--------|--------|----------|----------------------|-----------|
| **Market Data** | `kline`, `market`, `global_market` | `KlineService`, `MarketDataCollector`, `symbol_name` | `us_stock`, `cn_stock`, `hk_stock`, `crypto`, `forex`, `futures`, `tencent`, `polymarket` + `indices`, `commodities`, `forex`, `crypto`, `news`, `sentiment`, `heatmap`, `opportunities` | `qd_market_symbols`, `qd_watchlist` |
| **AI Analysis** | `fast_analysis`, `ai_chat` (stub), parts of `backtest`, `indicator`, `strategy`, `experiment` | `FastAnalysisService`, `LLMService`, `AnalysisMemory`, `SearchService`, `AICalibrationService`, `ReflectionService`, `PolymarketAnalyzer` | — | `qd_analysis_tasks`, `qd_analysis_memory`, `qd_polymarket_ai_analysis` |
| **Strategy Gen** | `strategy` (ai-generate), `indicator` (aiGenerate), `experiment` (ai-optimize) | `StrategyCompiler`, `StrategySnapshotResolver`, `ExperimentRunnerService`, `StrategyEvolutionService`, `MarketRegimeService` | — | `qd_strategies_trading`, `qd_indicator_codes` |
| **Backtesting** | `backtest`, `strategy` (backtest*) | `BacktestService`, `StrategyScoringService` | — | `qd_backtest_runs`, `qd_backtest_trades`, `qd_backtest_equity_points` |
| **Live Trading** | `strategy` (start/stop, trades), `quick_trade`, `ibkr`, `mt5`, `credentials` | `TradingExecutor`, `PendingOrderWorker`, `ExchangeExecution`, `live_trading/` (12+ exchange clients), `IBKRClient`, MT5 client | — | `qd_strategy_positions`, `qd_strategy_trades`, `pending_orders`, `qd_quick_trades`, `qd_exchange_credentials` |
| **User/Auth** | `auth`, `user` | `UserService`, `SecurityService`, `OAuthService`, `EmailService` | — | `qd_users`, `qd_verification_codes`, `qd_login_attempts`, `qd_oauth_links`, `qd_security_logs` |
| **Notifications** | parts of `user`, `strategy` | `SignalNotifier` (browser/Telegram/email/Discord/webhook), `PortfolioMonitor` | — | `qd_strategy_notifications` |
| **Billing/Admin** | `billing`, parts of `user` | `BillingService`, `UsdtPaymentService` | — | `qd_credits_log`, `qd_membership_orders`, `qd_usdt_orders` |
| **Community** | `community` | `CommunityService` | — | `qd_indicator_codes` (community fields), `qd_indicator_purchases`, `qd_indicator_comments` |
| **Portfolio** | `portfolio` | `PortfolioMonitor` | — | `qd_manual_positions`, `qd_position_alerts`, `qd_position_monitors` |

### Coupling Assessment

**Tightly coupled**:
- `TradingExecutor` ↔ `StrategyService` ↔ `StrategyCompiler` ↔ `BacktestService` — the strategy lifecycle is deeply intertwined
- `FastAnalysisService` ↔ `MarketDataCollector` ↔ `DataSourceFactory` ↔ `KlineService` — the AI pipeline has hard dependencies on the data layer
- `create_app()` ↔ all workers (TradingExecutor, PendingOrderWorker, PortfolioMonitor, UsdtOrderWorker, CalibrationWorker, ReflectionWorker) — workers are started unconditionally (or gated by env) at boot

**Loosely coupled**:
- `LLMService` — clean multi-provider abstraction with fallback; no domain entanglement
- `SearchService` — standalone web search with provider rotation
- `data_providers/*` — pure data aggregators with cache, no side effects
- `SignalNotifier` — channel-agnostic notification dispatch
- `BillingService` / `UsdtPaymentService` — can be disabled via env flags
- `IBKRClient` / MT5 client — isolated broker adapters

---

## Reuse vs Remove Matrix

### Keep as Infrastructure

| Module | Why | Dependency Risk | Product Risk if Unchanged |
|--------|-----|-----------------|--------------------------|
| `LLMService` (`services/llm.py`) | Clean multi-provider LLM abstraction. Supports OpenRouter, OpenAI, Gemini, DeepSeek, Grok. Auto-detection, fallback, JSON parsing. | Low — standalone, env-driven | Low — fits Quant-Brew perfectly |
| `SearchService` (`services/search.py`) | Multi-provider web search (Tavily, SerpAPI, Google CSE, Bing, DuckDuckGo) with failover. Essential for news grounding. | Low — standalone | Low |
| `MarketDataCollector` (`services/market_data_collector.py`) | Unified data collection: OHLC, fundamentals, company profiles, macro sentiment, news, technical indicators. | Medium — depends on DataSourceFactory, KlineService | Low — core to Quant-Brew's stock intelligence |
| `DataSourceFactory` + `us_stock.py` + `cn_stock.py` | Pluggable market data with yfinance, Finnhub, Twelve Data, AkShare, Tencent | Low — clean factory pattern | Low — essential data layer |
| `data_providers/*` (indices, commodities, news, sentiment) | Dashboard-level macro aggregators (VIX, DXY, yields, Fear&Greed, global indices, commodities) | Low — pure functions + cache | Low — directly maps to "macro tone" layer |
| `global_market` route + handler | Overview, sentiment, news, calendar, heatmap — perfect for macro dashboard | Low | Low — already aligned with Quant-Brew |
| `CacheManager` / Redis infrastructure | TTL caching, rate limiting, circuit breaker | Low | Low |
| Auth stack (`auth.py`, `UserService`, `SecurityService`, JWT, OAuth) | User system, roles, login, OAuth | Low | Low — needed as-is |
| PostgreSQL schema (partial) | `qd_users`, `qd_watchlist`, `qd_market_symbols`, `qd_analysis_tasks`, `qd_analysis_memory` | Low | Low |
| `symbol_name.py` | Human-readable symbol resolution | Low | Low — UX essential |
| `SignalNotifier` | Multi-channel notifications (Telegram, email, Discord, webhook) | Low | Low — useful for briefing delivery |
| Docker Compose infrastructure | postgres, redis, backend, frontend orchestration | Low | Low |

### Keep but Demote

| Module | Why | Dependency Risk | Product Risk if Unchanged |
|--------|-----|-----------------|--------------------------|
| `FastAnalysisService` (`services/fast_analysis.py`) | Core AI analysis pipeline with consensus, ensemble, calibration. But it's built around BUY/SELL/HOLD trading decisions, not narrative synthesis. Needs refactoring toward research summaries. | High — tightly coupled to MarketDataCollector, AnalysisMemory, trading-centric prompts | **High** — if left as-is, Quant-Brew becomes a trading signal app, not a research product |
| `AnalysisMemory` (`services/analysis_memory.py`) | Stores analysis history and feedback. Good foundation but schema is trading-decision-centric (decision, confidence, consensus scores). | Medium — tied to fast_analysis flow | Medium — needs schema evolution for narrative provenance |
| `AICalibrationService` + `ReflectionService` | Quality governance for AI outputs. Currently calibrates BUY/SELL thresholds. Concept is good; implementation is trading-specific. | Low — env-gated workers | Medium — needs reframing for research quality |
| `PortfolioMonitor` | AI-driven position analysis + reporting + notification. The "AI digest + multi-channel delivery" pattern is useful; the position-tracking framing is not. | Medium — depends on fast_analysis, KlineService | Medium — repurpose for watchlist briefings |
| `BacktestService` | Backtesting engine. Not homepage-level for Quant-Brew, but useful as an advanced feature for users who want to test hypotheses. | Medium — tied to strategy snapshot system | Low if demoted — keep as power-user feature |
| `KlineService` | K-line and price data wrapper. Essential for charts but should not be the product's center of gravity. | Low | Low |
| `ExperimentRunnerService` | Strategy experiment + parameter search + regime detection. Regime detection is useful for macro; rest is strategy-specific. | High — pulls in BacktestService, StrategyEvolution, Scoring | Medium — extract regime detection, demote rest |
| Community system (`community` route, `CommunityService`) | Indicator marketplace. Could become research content sharing, but current implementation is indicator-trading specific. | Low — self-contained | Medium — needs product rethinking |
| Billing stack | Credits, membership, USDT payments. Keep as admin infrastructure but don't make it product-visible for v1. | Low — env-gated | Low if demoted |

### Remove from Main Product Surface

| Module | Why | Dependency Risk | Product Risk if Kept |
|--------|-----|-----------------|---------------------|
| `TradingExecutor` + `PendingOrderWorker` | Core live trading engine. Restores running strategies on boot, manages execution lifecycle. **Antithetical to Quant-Brew's research-first identity.** | High — deeply coupled to strategy lifecycle; started in `create_app()` | **Critical** — keeping this prominent makes Quant-Brew look like a renamed trading bot |
| `live_trading/` (12+ exchange clients) | Binance, OKX, Bybit, Bitget, Gate, Kraken, KuCoin, Coinbase, HTX, Deepcoin adapters | Low per module — but collectively large surface | High — crypto execution focus contradicts US equities research |
| `quick_trade` route + logic | "Go from analysis to trade" — exactly the workflow Quant-Brew must NOT optimize for | Medium — touches credentials, exchange execution | **Critical** — this is the anti-pattern |
| `ibkr` route + `IBKRClient` | IBKR broker integration for US stock execution. Not needed for research product. | Low — self-contained | Medium — creates execution-path confusion |
| `mt5` route + MT5 client | MetaTrader5 forex execution | Low — self-contained, Windows-only optional | Low — just remove |
| `credentials` route | Exchange API key management for live trading | Low | Medium — signals "connect your broker" |
| `strategy` route (execution parts) | start/stop, trades, positions, equity — all live-execution endpoints | High — interleaved with strategy CRUD that might be kept | High — must surgically separate research from execution |
| `PolymarketDataSource` + `polymarket` route + workers | Prediction market research. Not US equities focused. | Low — self-contained | Medium — scope creep |
| `ExchangeExecution` | Order placement from signals | Medium | High |
| `UsdtPaymentService` + TronGrid integration | Crypto-native payment flow. Not relevant to a luxury research product. | Low — env-gated | Low if removed |
| DB tables: `pending_orders`, `qd_quick_trades`, `qd_exchange_credentials`, `qd_strategy_positions`, `qd_strategy_trades`, `qd_polymarket_*` | Execution-centric schema | Low — can leave dormant | Low — just don't surface |

### Must Rebuild from Scratch

| Component | Why |
|-----------|-----|
| **Frontend** | No source code in this repo. Current UI is a trading terminal (Indicator IDE, bot workspace, quick trade panels). Quant-Brew's "Luxury Tech Archive" layout (narrative left / context right / macro top) requires a completely different IA, component library, and design system. |
| **Morning/Evening Briefing System** | Does not exist. Need: scheduled content generation pipeline, editorial template system, briefing persistence, delivery channels. |
| **Macro Narrative Synthesis** | `global_market` provides raw data. Need: AI narrative generation layer that turns indices/sentiment/yields/news into coherent Chinese-language market stories. |
| **Stock Research Page** | Does not exist as a unified experience. Need: company profile + financials + AI interpretation + related signals + news context, all in one research view. |
| **Financial Statement Interpretation** | `MarketDataCollector` can fetch basic fundamentals and earnings. Need: structured financial statement display, AI commentary, period-over-period analysis, transcript parsing. |
| **Context Panel (right-side)** | No equivalent. Need: a new component architecture for contextual sidebars that surface related signals, AI-filtered research, similar patterns. |
| **Content/Narrative Data Model** | No tables for briefings, narratives, editorial content, research notes, or reading history. Must be designed from scratch. |

---

## Frontend IA Refactor Map

### Current IA (inferred from routes, screenshots, and dist analysis)

The current frontend is organized around a trading-operator workflow:

1. **Indicator IDE** — code editor, chart, backtest, quick trade (primary workspace)
2. **AI Asset Analysis** — fast analysis results, opportunity radar
3. **Trading Bot Workspace** — strategy list, automation templates, bot management
4. **Strategy Live Operations** — running bots, performance, trade history, positions
5. **Global Market Overview** — indices, sentiment, heatmap, news, calendar
6. **Portfolio** — manual positions, alerts, monitors
7. **Dashboard** — summary metrics (strategies running, pending orders, P&L)
8. **Settings** — LLM config, system settings
9. **Admin** — user management, billing, credits
10. **Community** — indicator marketplace

### Alignment with Quant-Brew

| Current Page/View | Quant-Brew Alignment | Action |
|-------------------|---------------------|--------|
| Indicator IDE | **Conflicts** — code-editor-first UX is wrong gravity | Remove from primary nav; maybe keep as advanced tool |
| AI Asset Analysis | **Partially aligned** — analysis output is useful, but BUY/SELL framing conflicts | Rebuild as "Stock Intelligence" with research framing |
| Trading Bot Workspace | **Conflicts** — antithetical to research product | Remove entirely |
| Strategy Live Ops | **Conflicts** — execution monitoring | Remove entirely |
| Global Market Overview | **Aligned** — maps to "macro tone" layer | Keep and elevate to top-level |
| Portfolio | **Partially aligned** — watchlist concept useful, execution monitoring not | Rebuild as "Watchlist / Research List" |
| Dashboard | **Conflicts** — strategy-count and P&L metrics | Rebuild as briefing homepage |
| Settings | **Neutral** — keep as infrastructure | Keep |
| Admin | **Neutral** — keep as infrastructure | Keep, demote visibility |
| Community | **Partially aligned** — could become research sharing | Rebuild concept if at all |

### Proposed Quant-Brew IA

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR: Market Tone Strip                              │
│  [S&P ▲0.4%] [DXY 104.2] [VIX 14.8] [US10Y 4.35%]    │
│  [Fear&Greed: 62 Greed] [Regime: Risk-On]               │
├────────────────────────┬────────────────────────────────┤
│                        │                                │
│  LEFT: Narrative       │  RIGHT: Context Panel          │
│                        │                                │
│  Morning Brief         │  Related Signals               │
│  ┌──────────────────┐  │  AI-Filtered News              │
│  │ Today's Story     │  │  Similar Patterns              │
│  │ Key Moves          │  │  Financial Highlights          │
│  │ What Changed       │  │  Earnings Calendar             │
│  │ AI Synthesis       │  │  Sector Heatmap                │
│  └──────────────────┘  │  Macro Context                 │
│                        │                                │
│  Stock Research        │  [contextual to what's          │
│  ┌──────────────────┐  │   selected on left]             │
│  │ AAPL Profile      │  │                                │
│  │ AI Interpretation  │  │                                │
│  │ Financials         │  │                                │
│  │ News & Events      │  │                                │
│  └──────────────────┘  │                                │
│                        │                                │
├────────────────────────┴────────────────────────────────┤
│  NAV: Home | Macro | Research | Watchlist | [Settings]   │
└─────────────────────────────────────────────────────────┘
```

**Primary views**:
1. **Home / Dashboard** → Morning/Evening briefing feed, market story, AI synthesis
2. **Macro** → Global overview (indices, sentiment, yields, commodities, calendar, heatmap)
3. **Stock Research** → Per-stock deep dive (profile, AI analysis, financials, news, charts)
4. **Watchlist** → User's tracked symbols with summary intelligence

**Demoted/secondary**:
- Strategy/Backtest tools (accessible but not primary nav)
- Admin/Billing (settings area)

### Likely Reusable vs Misleading Components

**Reusable** (assuming access to Vue source):
- KLineCharts integration — price chart rendering
- ECharts components — heatmap, gauge, sentiment visualizations
- i18n infrastructure — locale framework, zh-CN bundle
- Auth flow components — login, register, OAuth
- Settings/admin pages — mostly infrastructure

**Misleading** (will create wrong product impression if reused):
- Indicator code editor / IDE workspace
- Strategy list / bot cards / automation templates
- Quick trade panel / order forms
- Position monitoring / P&L displays
- Backtest result views (as primary feature)
- Dashboard summary cards (strategy count, pending orders)

---

## Data Model and API Fit

### Can the current backend support Quant-Brew features?

| Quant-Brew Feature | Current Support | Gap |
|--------------------|----------------|-----|
| **Stock research pages** | Partial — `MarketDataCollector` fetches OHLC, fundamentals, company profile, earnings. `us_stock.py` provides yfinance + Finnhub. | Missing: structured financial statement display model, AI interpretation persistence, research page API that bundles all context for one symbol |
| **Macro summary pages** | Good — `global_market` route provides indices, sentiment (VIX, DXY, yields, Fear&Greed), commodities, news, economic calendar | Missing: narrative synthesis layer that turns raw data into Chinese-language market stories; calendar is template-based/synthetic, not live |
| **AI-generated narrative summaries** | Partial — `FastAnalysisService` generates structured analysis but framed as BUY/SELL/HOLD decisions | Missing: narrative prompt templates for research/briefing style; briefing persistence model; scheduled generation pipeline |
| **Context panels (right side)** | Partial — `SearchService` can find related news, `AnalysisMemory` has similar patterns | Missing: context aggregation API that bundles related signals, news, patterns, financials for a given symbol/topic; no right-panel-specific endpoint |
| **Financial statement interpretation** | Minimal — `MarketDataCollector._get_financial_statements` and `_get_earnings_data` fetch basic data via yfinance | Missing: structured financial data tables, period-over-period analysis, AI commentary on financials, earnings transcript parsing |
| **Transcript/news synthesis** | Partial — `SearchService.search_stock_news` and `search_stock_events` exist; `MarketDataCollector._get_news` aggregates | Missing: transcript ingestion pipeline, long-document summarization, source attribution/provenance tracking |

### Missing Domain Models (new tables needed)

```
qd_briefings              — morning/evening briefing content, generation metadata, status
qd_briefing_sections      — structured sections within a briefing
qd_research_notes         — per-symbol AI research summaries with provenance
qd_financial_snapshots    — structured financial statement data per symbol/period
qd_transcript_summaries   — earnings call / event transcript summaries
qd_narrative_cache        — cached AI-generated narrative blocks with TTL
qd_reading_history        — user reading/engagement tracking
qd_research_context       — context panel content bundles per symbol
```

### Missing API Endpoints

```
GET  /api/briefing/latest          — today's morning/evening brief
GET  /api/briefing/archive         — historical briefings
GET  /api/research/{symbol}        — unified stock research page data
GET  /api/research/{symbol}/context — right-panel context for a symbol
GET  /api/macro/narrative          — AI-synthesized macro story
GET  /api/macro/regime             — current market regime assessment
GET  /api/financials/{symbol}      — structured financial statements
GET  /api/transcript/{symbol}      — earnings transcript summaries
POST /api/briefing/generate        — trigger briefing generation
```

---

## Design-System Compatibility Notes

### Where Current Architecture Supports "Luxury Tech Archive"

- **Dark mode support**: `index.html` already has `prefers-color-scheme: dark` media queries — foundation for a luxury dark theme
- **i18n infrastructure**: zh-CN locale already exists; Chinese-language product is supported at the framework level
- **Ant Design Vue component library**: provides a solid base of well-crafted components (typography, cards, layouts, tables) that can be themed
- **ECharts integration**: powerful charting library that supports sophisticated, elegant visualizations
- **KLineCharts**: professional-grade financial chart rendering
- **Responsive foundation**: mobile-responsive patterns exist (Capacitor mentioned, media queries present)

### Where Current Patterns Fight the Direction

| Area | Conflict |
|------|----------|
| **Overall layout paradigm** | Current app uses a standard admin-panel layout (sidebar nav + content area). Quant-Brew needs a newspaper/archive layout (narrative left + context right + macro strip top). This is a **layout-level rework**, not a theme change. |
| **Information density** | Trading terminal UX optimizes for data density and quick actions. Quant-Brew should optimize for **readability and synthesis** — larger type, more whitespace, narrative flow. |
| **Color semantics** | Current color usage is functional-trading (green=profit/buy, red=loss/sell). Quant-Brew needs editorial/archival color semantics (accent for emphasis, muted for context, hierarchy for reading). |
| **Component granularity** | Trading UI components are action-oriented (buttons, forms, order panels, status badges). Research UX needs content-oriented components (article cards, context panels, summary blocks, citation markers). |
| **Typography** | Ant Design's default typography is adequate but generic. "Luxury Tech Archive" implies distinctive typographic hierarchy — likely needs custom font pairing for Chinese headlines + body, monospace for data, serif or editorial fonts for narrative. |
| **Navigation pattern** | Tab-heavy, feature-segmented navigation. Quant-Brew needs flow-based navigation where context follows the user (e.g., clicking a stock in the briefing opens its research page with context panel). |
| **Animation/interaction** | Current loading screen has a playful pixel-cat animation. "Luxury Tech Archive" implies refined, minimal transitions — subtle fades, scroll-based reveals, not character animations. |

### Areas Needing Layout-Level Rework (not just cosmetic)

1. **App shell**: Replace sidebar-nav + content-area with top-strip + left-narrative + right-context layout
2. **Home/Dashboard**: From summary-cards grid to briefing feed with reading UX
3. **Stock detail**: From IDE/chart workspace to research article layout with contextual sidebar
4. **Macro view**: From data-grid dashboard to narrative + visualization hybrid
5. **Navigation**: From feature tabs to content-flow navigation with contextual linking

---

## Recommended Phase Plan

### Phase 1: Audit & Carve-Out (Weeks 1–2)

**Objective**: Establish a clean foundation by removing execution-first code from the main product path and setting up the Quant-Brew project structure.

**Affected folders/modules**:
- `app/__init__.py` — gate TradingExecutor, PendingOrderWorker, UsdtOrderWorker startup behind `ENABLE_TRADING_MODE=true` (default false)
- `app/routes/__init__.py` — conditionally register execution-related blueprints
- `app/routes/quick_trade.py`, `ibkr.py`, `mt5.py`, `credentials.py` — flag-gate or skip registration
- `app/services/trading_executor.py`, `pending_order_worker.py`, `exchange_execution.py`, `live_trading/` — no changes, just don't start
- `frontend/` — begin new Vue project or fork QuantDinger-Vue with fresh IA skeleton

**Risks**:
- Worker startup in `create_app()` may have implicit side effects if disabled; need careful testing
- Frontend source access may require coordination with QuantDinger-Vue license

**Success criteria**:
- Backend starts cleanly with only research-relevant routes active
- No trading workers running by default
- New frontend project initialized with Quant-Brew IA shell
- CI passes with reduced route set

### Phase 2: IA Shell + Homepage Skeleton (Weeks 3–5)

**Objective**: Build the core layout (macro strip + narrative left + context right) and wire the homepage to the briefing API.

**Affected folders/modules**:
- New: `app/routes/briefing.py` — briefing generation and retrieval endpoints
- New: `app/services/briefing_service.py` — scheduled briefing generation using LLMService + MarketDataCollector + data_providers
- New: `app/routes/narrative.py` — macro narrative synthesis endpoint
- New: DB migration — `qd_briefings`, `qd_briefing_sections`, `qd_narrative_cache`
- `app/routes/global_market.py` — extend with regime/tone endpoint
- `app/services/experiment/regime.py` — extract regime detection for macro use
- Frontend: build app shell, top macro strip, home page with briefing feed

**Risks**:
- LLM cost for briefing generation at scale; need smart caching and TTL
- Briefing quality highly dependent on prompt engineering; needs iteration
- Regime detection currently optimized for strategy; may need recalibration for macro narrative

**Success criteria**:
- User can open Quant-Brew and see today's market briefing in Chinese
- Macro strip shows live indices, VIX, DXY, yields
- Homepage is a readable narrative, not a data dashboard
- Briefing generation runs on schedule (morning + evening)

### Phase 3: Stock Research Experience (Weeks 6–9)

**Objective**: Build the per-symbol research page with AI interpretation, financials, news, and context panel.

**Affected folders/modules**:
- New: `app/routes/research.py` — unified stock research API
- New: `app/services/research_service.py` — orchestrates MarketDataCollector + SearchService + LLMService for research synthesis
- Extend: `app/services/market_data_collector.py` — add structured financial statement extraction, earnings data enrichment
- New: DB migration — `qd_research_notes`, `qd_financial_snapshots`, `qd_research_context`
- Refactor: `app/services/fast_analysis.py` — fork or refactor prompts from BUY/SELL/HOLD to research-narrative style
- `app/services/search.py` — leverage `search_stock_news` and `search_stock_events`
- Frontend: stock research page, financial tables, AI interpretation blocks, context sidebar

**Risks**:
- Financial data quality from yfinance is inconsistent for some tickers
- FastAnalysisService refactoring is high-risk due to its size (~800+ lines) and complexity
- Right-side context panel is a new UI pattern with no current backend analog

**Success criteria**:
- User can search for a US stock and see: profile, price chart, AI research summary, financial highlights, recent news
- Context panel shows related signals and similar patterns
- AI interpretation is in research/narrative tone, not trading-signal tone
- Financial data displays correctly for major US equities

### Phase 4: Macro + Narrative Synthesis (Weeks 10–13)

**Objective**: Build the full macro analysis experience and deepen narrative synthesis capabilities.

**Affected folders/modules**:
- Extend: `app/routes/global_market.py` — add deeper macro endpoints
- New: `app/services/macro_narrative.py` — AI-driven macro story synthesis from multiple data providers
- Extend: `app/data_providers/sentiment.py` — improve yield curve, put/call ratio with real data sources
- Extend: `app/data_providers/news.py` — replace synthetic economic calendar with live API (e.g., Trading Economics, Finnhub calendar)
- New: `app/services/transcript_service.py` — earnings transcript ingestion and summarization
- New: DB migration — `qd_transcript_summaries`
- Frontend: macro page with narrative + visualizations, earnings calendar, sector analysis

**Risks**:
- Economic calendar is currently synthetic/template-based — need a real data source
- Transcript ingestion requires new data pipelines (SEC EDGAR, earnings call APIs)
- Macro narrative quality at scale requires sophisticated prompt chains
- `sentiment.py` uses proxies (VIX/VIX3M ratio as put/call proxy) — may need real options data

**Success criteria**:
- Macro page shows coherent Chinese-language market narrative with supporting visualizations
- Economic calendar shows real upcoming events
- Earnings transcripts can be ingested and summarized for major US stocks
- Yield curve, sentiment indicators show real data (not proxies)

### Phase 5: Deeper AI Provenance and Context UX (Weeks 14–18)

**Objective**: Add provenance tracking, source attribution, reading history, and AI transparency features.

**Affected folders/modules**:
- Extend: `app/services/analysis_memory.py` — add provenance fields, source tracking
- New: `app/services/provenance_service.py` — track AI reasoning chains, data sources used, confidence factors
- Extend: `app/routes/research.py` — provenance metadata in responses
- New: DB migration — `qd_reading_history`, extend `qd_analysis_memory` with provenance columns
- Refactor: `app/services/ai_calibration.py` — adapt calibration from trading decisions to research quality
- Frontend: source attribution UI, "how AI reached this conclusion" expandable sections, reading history, bookmarks

**Risks**:
- Provenance tracking adds latency to AI pipelines
- UX for AI transparency is hard — too much detail loses users, too little loses trust
- Calibration reframing from trading accuracy to research quality is conceptually non-trivial

**Success criteria**:
- Every AI-generated section shows its data sources and reasoning chain
- Users can see which LLM model produced each analysis
- Reading history tracks what the user has reviewed
- AI quality improves measurably over time through adapted calibration

---

## Top Risks

1. **Frontend rebuild is the critical path**. No frontend source exists in this repo. Whether forking QuantDinger-Vue or building fresh, this is the single largest effort and the primary blocker for any user-facing Quant-Brew experience. Estimate: 60–70% of total effort.

2. **FastAnalysisService is a loaded gun**. At ~800+ lines, it's the most complex service and the most valuable AI pipeline — but it's built entirely around trading decisions (BUY/SELL/HOLD, position sizing, consensus override). Refactoring it for research narratives without breaking its sophisticated consensus/ensemble/calibration pipeline requires surgical precision.

3. **Trading gravity will pull the product back**. The codebase has deep trading DNA — workers start at boot, strategy lifecycle permeates routes, execution terminology is everywhere. Without aggressive removal, contributors and users will keep pulling the product toward trading-terminal behavior.

4. **Data quality ceiling for fundamental research**. yfinance is the primary US equities data source. It's free but unreliable: rate-limited, occasionally stale, limited fundamental data. A serious stock research product will eventually need premium data providers (Polygon, Alpha Vantage Pro, or direct exchange feeds).

5. **Prompt engineering for Chinese-language financial narratives is unproven**. The current prompts are structured for English-first, trading-oriented outputs. Chinese-language financial narrative synthesis is a different skill that will require significant prompt iteration and native-speaker QA.

---

## Final Verdict

### Is QuantDinger a viable base for Quant-Brew?

**Yes, conditionally.**

QuantDinger provides genuine, hard-to-replicate value in three areas:
1. **Data infrastructure** — multi-source market data, US/CN/HK stock adapters, macro aggregators, search integration
2. **AI pipeline** — multi-provider LLM abstraction, analysis memory, calibration/reflection loops, ensemble consensus
3. **Operational infrastructure** — auth, user management, caching, notifications, Docker deployment, PostgreSQL schema

These represent approximately 3–4 months of engineering effort that would be wasted if starting from zero.

### Under what architectural conditions?

1. **Trading execution must be fully gated behind a feature flag**, not merely deprioritized. `ENABLE_TRADING_MODE=false` must result in zero trading workers starting, zero execution routes registered, and zero execution-related UI rendered.

2. **FastAnalysisService must be forked, not patched**. Create a `ResearchAnalysisService` that inherits the data collection and LLM orchestration but replaces the trading-decision prompts and output schema with research-narrative equivalents.

3. **Frontend must be rebuilt with a new IA**. Do not attempt to retrofit the trading-terminal Vue app into a research product. Use the same tech stack (Vue + Ant Design) if desired, but start with a fresh layout and routing structure.

4. **New domain models must be introduced** for briefings, narratives, research notes, financial snapshots, and reading history. The current schema is not sufficient.

5. **A clear API boundary must exist** between "data infrastructure" (keep) and "trading workflow" (gate). Routes should be organized into `api/research/*`, `api/briefing/*`, `api/macro/*` namespaces rather than the current flat structure.

### Top 5 dangers of building on it

1. **Scope bleed**: Every existing feature will have an advocate. Without discipline, Quant-Brew becomes "QuantDinger with a different homepage."
2. **Frontend false start**: Attempting to modify the prebuilt `dist/` or doing a cosmetic reskin of the trading UI will waste months and produce a confused product.
3. **AI tone contamination**: If FastAnalysisService prompts leak BUY/SELL language into research narratives, users will perceive Quant-Brew as a signal service, not a research product.
4. **Data source fragility**: Free APIs (yfinance, public Tencent, synthetic calendar) will break or rate-limit under real usage. Budget for premium data from Phase 3 onward.
5. **Chinese-language quality**: Machine-translated financial content reads poorly. Every AI output must be reviewed for natural Chinese financial writing quality, not just correctness.

### What should be absolutely avoided

- **Do not** ship any version of Quant-Brew with quick-trade, bot-start, or order-placement as a visible feature
- **Do not** reuse the current dashboard (strategy count, P&L metrics) as the homepage
- **Do not** keep the Indicator IDE as a primary navigation item
- **Do not** use the current FastAnalysisService prompts unchanged for research content
- **Do not** treat crypto exchange adapters as relevant infrastructure for a US equities research product
- **Do not** attempt to modify `frontend/dist/` directly — there is no source code to maintain
- **Do not** preserve the current route namespace structure (`/api/indicator`, `/api/strategy`) as the primary API surface for Quant-Brew
