# Quant-Brew Frontend Architecture Spec

## Executive Summary

This spec defines a new frontend for Quant-Brew, built from scratch on React + TypeScript + Vite as a single-page application. It does not reuse, fork, or retrofit the existing QuantDinger Vue frontend. It targets the existing Flask backend API, preserving the current Docker Compose deployment model (Nginx serves static `dist/`, reverse proxies to Flask).

The architecture is organized around four views (Home, Macro, Research, Watchlist) inside an asymmetrical T-layout shell: a persistent macro strip on top, a narrative reading column on the left/main area, and a contextual intelligence column on the right. The Research page uses a segmented control to toggle between AI Analysis (default) and Chart Lab (secondary), sharing the same asset context and right panel.

The build order prioritizes Macro first (highest backend coverage, fastest validation of the design system), then Research (highest product complexity), then Home (requires backend briefing service), then Watchlist (lowest risk).

---

## Recommended Frontend Stack

### Decision: React + TypeScript + Vite (SPA)

Not Vue. Not Next.js. Here's why.

**Why not Vue (even though the old frontend is Vue)**:
- We are building from scratch, not retrofitting. The Vue source for QuantDinger lives in a separate private repo we don't control. There is zero code to carry over.
- Choosing Vue would create an unconscious gravitational pull toward copying QuantDinger patterns ("let's just borrow that component"). React creates a clean psychological break.
- The React ecosystem has stronger options for the specific components this product needs: `@tanstack/react-query` for server state, KLineCharts has a first-class React wrapper (`klinecharts-react`), and Radix UI provides unstyled accessible primitives that won't fight the Luxury Tech Archive design language.

**Why not Next.js**:
- The backend is Flask, not Node. Adding a Node runtime for SSR creates deployment complexity (new Docker service, new process management) with no clear benefit.
- Quant-Brew is an authenticated product — no public pages need SEO. SSR/SSG add cost without value.
- The existing deployment model (Nginx serves static files from `dist/`) is proven and simple. A Vite SPA preserves this model exactly.

**Why Vite + React SPA**:
- Vite produces a static `dist/` folder that drops into the existing `frontend/Dockerfile` (Nginx) with zero infrastructure changes.
- Fast HMR for development. Sub-second rebuild on file change.
- Tree-shaking and code-splitting by default.
- TypeScript-first with strict mode.

### Full stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 19 + TypeScript 5 | Clean break from Vue; strongest ecosystem for this product type |
| Build | Vite 6 | SPA output, fast dev, drops into existing Nginx container |
| Routing | React Router 7 (data router) | Loader pattern allows data fetching before render; avoids loading spinners |
| Server state | TanStack Query v5 | Caching, deduplication, background refresh — eliminates most manual fetch logic |
| UI state | Zustand | Minimal, un-opinionated; for layout state (sidebar open, active panel, search focus) |
| Primitives | Radix UI | Unstyled, accessible. We theme everything ourselves — no fighting an opinionated library |
| Styling | CSS Modules + design tokens (CSS custom properties) | No Tailwind (too much visual noise in JSX for a typography-heavy product). CSS Modules scope styles. Tokens enforce the design system globally. |
| Charts | KLineCharts (via `klinecharts` npm) | Backend already outputs KLineCharts-compatible data. Lightweight, professional-grade candlestick rendering. |
| Data viz | ECharts (via `echarts-for-react`) | Heatmaps, gauges, sector treemaps. Already used in QuantDinger backend ecosystem. |
| i18n | `react-intl` (FormatJS) | ICU message format. zh-CN primary, en-US secondary. |
| HTTP | `ky` (tiny fetch wrapper) | Lighter than Axios, better API than raw fetch, interceptor support for JWT |
| Code editor (Chart Lab only) | CodeMirror 6 (`@codemirror/lang-python`) | For indicator code editing in Chart Lab. Lighter than Monaco. |

---

## App Shell Architecture

### The T-Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  MACRO STRIP  (48px, terminal density, always visible)               │
│  [QB]  SPX 5,420 ▲0.3%  NDX 18,920 ▲0.5%  VIX 14.8  DXY 104.2    │
│        US10Y 4.35%  F&G: 62 Greed    [🔍 Search]  [Nav: H M R W]   │
├──────────────────────────────────────┬───────────────────────────────┤
│                                      │                               │
│  MAIN COLUMN (flex: 3)               │  CONTEXT COLUMN (flex: 2)     │
│                                      │                               │
│  Page-specific content               │  Page-specific context         │
│  - Narrative reading flow            │  - Related signals             │
│  - Editorial density                 │  - Compact card density        │
│  - Vertical scroll                   │  - Independent scroll          │
│                                      │                               │
│  (min-width: 560px)                  │  (min-width: 340px)            │
│                                      │                               │
└──────────────────────────────────────┴───────────────────────────────┘
```

### Component breakdown

**`<AppShell>`** — root layout. Renders:
1. `<MacroStrip>` — fixed, 48px, full width. Contains: brand mark, macro tickers, search trigger, nav links.
2. `<MainColumn>` — left/center, scrollable. Renders the active route's primary content.
3. `<ContextColumn>` — right, scrollable independently. Renders page-specific context panels.

### Navigation placement

Navigation lives **inside the MacroStrip**, right-aligned, as four text links: 首页 | 宏观 | 研究 | 关注. No icons. No sidebar. No hamburger menu. The product has four pages; they don't need a sidebar.

The search bar is also in the MacroStrip, activated by click or keyboard shortcut (`/`). Search is global: type a ticker symbol, select market, navigate to Research page.

### Responsive behavior

| Breakpoint | Behavior |
|------------|----------|
| >= 1280px | Full T-layout: main (60%) + context (40%) |
| 960-1279px | Main (65%) + context (35%), slightly compressed |
| 768-959px | Context column collapses to a slide-over panel (button in MacroStrip to toggle) |
| < 768px | Single column only. Context accessible via bottom sheet. MacroStrip becomes a single scrollable ticker row. Nav moves to a bottom tab bar. |

Below 768px, the product is functional but not the primary experience. Quant-Brew is a desktop reading product first.

### Where contextual sidebars live

The `<ContextColumn>` is a fixed layout slot, not a modal or overlay (on desktop). Each page provides its own context content through a layout composition pattern:

```typescript
// Each page exports both main content and context content
function MacroPage() {
  return (
    <PageLayout
      main={<MacroMainContent />}
      context={<MacroContextPanel />}
    />
  );
}
```

This ensures context content is always structurally tied to its page, never floating as a global sidebar with ambiguous ownership.

---

## Route Map

```
/                          → Home (briefing, narrative reading)
/macro                     → Macro (environment, indicators, heatmap, calendar)
/research/:market/:symbol  → Research (AI Analysis default, Chart Lab secondary)
/watchlist                 → Watchlist (tracked assets, scan view)
/settings                  → Settings (LLM config, account, preferences)
/login                     → Auth (login/register)
```

### Research route design

Research uses a **single route** with an internal view toggle — not nested routes:

```
/research/USStock/AAPL     → shows AI Analysis by default
/research/Crypto/BTC-USDT  → shows AI Analysis by default
```

The view toggle (AI Analysis ↔ Chart Lab) is **query state**, not a route segment:

```
/research/USStock/AAPL?view=chart   → shows Chart Lab
/research/USStock/AAPL              → shows AI Analysis (default)
```

This keeps the URL stable when users switch views, preserves back-button behavior, and avoids page-level re-renders on view toggle. The right context panel persists across both views because the asset context is the same.

### Why not nested routes for Research sub-views

Nested routes (`/research/AAPL/analysis` vs `/research/AAPL/chart`) cause a full route transition animation and data re-fetch on toggle. Since both views share the same asset data (price, company, indicators), a query-param toggle with shared state is faster and smoother. The user should feel they're switching a lens, not navigating to a different page.

---

## Page-by-Page IA

### Home

**Main column content (top to bottom)**:
1. **Briefing header**: "早报 · 2026年4月18日" with generation timestamp
2. **Market story block**: 3-5 paragraph AI-synthesized narrative about today's market. Serif headings, comfortable body text. Each paragraph may mention specific stocks (rendered as clickable chips that link to Research).
3. **Key movers strip**: 3-5 highlighted stock/asset cards showing name, change, one-line reason. Horizontal scrollable on narrow screens.
4. **Previous briefings**: collapsible archive of recent briefings (evening, yesterday, etc.)

**Context column content**:
1. **Today's earnings calendar**: compact list of reporting companies
2. **Sector heatmap thumbnail**: mini treemap showing sector performance
3. **Watchlist alerts**: if any watchlist item moved significantly
4. **Notable news links**: 5-8 sourced headlines with timestamps

**Data sources**:
- Main: `GET /api/briefing/latest` (mock initially — endpoint doesn't exist yet)
- Context: `GET /api/global-market/calendar`, `GET /api/global-market/heatmap`, `GET /api/global-market/news`, `GET /api/market/watchlist/prices`

### Macro

**Main column content (top to bottom)**:
1. **AI macro narrative**: 2-3 paragraph synthesis of current market environment. "今日市场环境" header.
2. **Index performance grid**: S&P 500, Nasdaq, Dow, Russell 2000, DAX, FTSE, Nikkei — each with price, change, sparkline. Compact card grid, 3-4 columns.
3. **Sentiment dashboard**: VIX gauge, Fear & Greed gauge, DXY level, US 10Y yield, yield curve status. Compact visualizations using ECharts.
4. **Commodities strip**: gold, silver, WTI, copper — price + change.
5. **Economic calendar**: upcoming events with date, impact level, previous/forecast/actual.

**Context column content**:
1. **Sector heatmap (full)**: larger treemap with click-to-filter
2. **Top movers / opportunities**: assets with unusual movement
3. **Forex snapshot**: major pairs

**Data sources**:
- All real APIs: `GET /api/global-market/overview`, `/sentiment`, `/heatmap`, `/calendar`, `/opportunities`, `/news`
- AI narrative: `GET /api/macro/narrative` (mock initially — endpoint doesn't exist yet)

### Research

**Asset header (shared across both views)**:
- Ticker badge, company name, sector, exchange
- Current price (large, monospace), daily change (colored badge)
- Market type indicator (USStock / Crypto)
- Segmented control: `研究概览` (AI Analysis) | `技术图表` (Chart Lab)

**AI Analysis view (default) — Main column**:
1. **AI research synthesis**: 3-5 paragraph narrative summary. Serif headings. Structured as: situation overview → bullish factors → bearish factors → key catalysts/risks → watch levels
2. **Financial highlights**: compact table — revenue, EPS, margins (last 4 quarters). Monospace data, with one-line AI commentary per metric.
3. **Recent news & events**: sourced, dated, one-line AI summary per item. Max 8 items.
4. **Analysis history**: previous analyses for this symbol, collapsible.

**AI Analysis view — Context column**:
1. **Key metrics card**: PE, PB, market cap, dividend yield, 52w range — compact monospace table
2. **Watch levels card**: support, resistance, pivot, ATR — with brief explanation
3. **Similar patterns**: from analysis memory
4. **Related stocks / sector peers**: clickable links to their Research pages
5. **Source provenance**: expandable "基于 N 个数据源" block

**Chart Lab view — Main column**:
1. **KLineCharts instance**: full-width, ~60% viewport height. Timeframe selector (1D default). Candlestick + volume.
2. **Indicator overlay controls**: dropdown to add/remove RSI, MACD, Bollinger, MAs. Compact toolbar above chart.
3. **Indicator code editor** (collapsed by default): expandable CodeMirror panel for writing/editing custom indicator code. "AI 生成" button for natural-language-to-code.
4. **Indicator list**: user's saved indicators, selectable.

**Chart Lab view — Context column**:
1. **Technical snapshot**: pre-computed RSI value, MACD signal, MA trend, volatility level — monospace cards
2. **Key levels**: support/resistance with brief AI explanation
3. **AI chart interpretation**: 1-2 paragraph AI summary of current technical setup (from `analysis.technical` field in existing API output)

**Data sources**:
- AI Analysis: `POST /api/fast-analysis/analyze` (existing, needs prompt reframing), `GET /api/fast-analysis/history`, `GET /api/fast-analysis/similar-patterns`
- Chart Lab: `GET /api/indicator/kline`, `GET /api/indicator/getIndicators`, `POST /api/indicator/callIndicator`, `POST /api/indicator/verifyCode`, `POST /api/indicator/aiGenerate`
- Both views: `GET /api/market/price`, `POST /api/market/stock/name`

### Watchlist

**Main column content**:
- **Asset table**: each row contains:
  - Ticker + name
  - Market badge (USStock / Crypto)
  - Price (monospace)
  - Daily change (colored)
  - One-line AI summary (or template fallback)
  - Click → navigates to `/research/:market/:symbol`
- **Add asset**: search bar at top. Type ticker, select market, add.
- **Empty state**: if no assets, show "添加你关注的标的" with a search prompt. No blocking onboarding flow.

**Context column content**:
1. **Watchlist stats**: total items, sectors breakdown
2. **Notable movers**: which watchlist items moved most today
3. **Upcoming events**: earnings/events for watchlist companies
4. **Quick actions**: "Run analysis" button for selected item

**Data sources**:
- `GET /api/market/watchlist/get`, `GET /api/market/watchlist/prices` (real)
- `POST /api/market/watchlist/add`, `POST /api/market/watchlist/remove` (real)
- AI summaries: mock initially (pull from `GET /api/fast-analysis/history` if available, else template)

---

## Research Internal Structure

### The segmented control approach

The Research page uses a **two-segment toggle** in the asset header, not tabs, not nested routes:

```
┌──────────────────────────────────────────────────────────────┐
│  AAPL  Apple Inc.  ·  Technology  ·  NASDAQ                   │
│  $198.42  ▲ +2.31 (+1.18%)                                    │
│                                                                │
│  ┌─────────────────┬─────────────────┐                        │
│  │  ● 研究概览       │    技术图表       │   ← segmented control  │
│  └─────────────────┴─────────────────┘                        │
├──────────────────────────────────────┬─────────────────────────┤
│  [view-specific main content]        │  [shared + view context] │
```

**Why segmented control over tabs**: Tabs suggest independent content. A segmented control signals "two lenses on the same subject" — which is exactly the mental model. The user is looking at AAPL through an AI-research lens or a chart-technical lens. The asset never changes.

**Why not an expandable chart panel below AI Analysis**: This was considered. The problem: a good chart needs at least 400px of vertical space. Placing it below a multi-paragraph AI analysis pushes it below the fold, making it feel like an afterthought. Chart Lab users expect the chart to be the hero when they choose to use it. The segmented control gives the chart full main-column space.

**State sharing between views**: Both views share:
- Asset identity (market, symbol)
- Price data
- Company profile
- Indicators (pre-computed)
- The entire right context column

This shared state is held in a `useResearchContext` hook backed by TanStack Query, so switching views doesn't re-fetch data.

---

## Shared Layout Rules

1. **MacroStrip is always rendered.** On every authenticated page. It is not collapsible, not dismissable. Height: 48px.

2. **Context column is always rendered** on desktop (>=960px). Its content is page-specific, injected by each page component.

3. **Main column scrolls vertically.** There is no "no-scroll" ideology. Briefings, research reports, and chart pages all scroll. The MacroStrip is fixed/sticky.

4. **Context column scrolls independently.** It is not linked to the main column's scroll position.

5. **No modals for primary content.** Search results appear in a dropdown overlay, not a modal. Analysis loading states appear inline, not in a blocking dialog. Settings is a page, not a modal.

6. **Charts are never the app's structural anchor.** On the Chart Lab view, the chart is the main content of the main column — but the layout shell (MacroStrip, ContextColumn) remains identical. The chart fills its container; it doesn't restructure the page.

---

## Design System Translation Rules

Translating the constraints from `quant_brew_design_system.md` into frontend implementation rules:

### Color tokens (CSS custom properties on `:root`)

```
--bg-base:        #1C1C1E
--bg-surface:     #242426
--bg-elevated:    #2C2C2E
--border-dim:     #3A3A3C
--border-focus:   #555557
--text-primary:   #F5F5F7
--text-secondary: #8E8E93
--text-caption:   #636366
--accent-gold:    #D4AF37
--accent-gold-dim:#B8860B
--status-up:      #16a34a
--status-down:    #dc2626
--status-live:    #00FA9A
--status-up-bg:   rgba(22,163,74,0.12)
--status-down-bg: rgba(220,38,38,0.12)
```

### Typography scale

```
--font-serif:     'Noto Serif SC', 'Spectral', Georgia, serif
--font-mono:      'JetBrains Mono', 'Geist Mono', 'Consolas', monospace
--font-ui:        'Inter', -apple-system, 'SF Pro', sans-serif

--text-headline:  24px / 1.3 / font-serif / weight 700
--text-section:   18px / 1.4 / font-serif / weight 600
--text-body:      15px / 1.7 / font-serif / weight 400
--text-data:      13px / 1.2 / font-mono / weight 500
--text-data-lg:   18px / 1.2 / font-mono / weight 600
--text-micro:     10px / 1.0 / font-ui / weight 600 / uppercase / letter-spacing 0.8px
--text-label:     12px / 1.3 / font-ui / weight 500
```

### Spacing and geometry

```
--space-unit:     4px
--radius:         0px       /* no border radius anywhere */
--border-width:   1px
--shadow:         none      /* no box-shadow; borders only */
--strip-height:   48px
--card-padding:   12px 16px
--section-gap:    24px
--column-gap:     1px       /* 1px border between main and context columns */
```

### Density zones

| Zone | Where | Rules |
|------|-------|-------|
| **Terminal** | MacroStrip only | `--text-data` (13px mono), `--space-unit * 2` padding, packed horizontal layout. Maximum information per pixel. |
| **Compact** | Context column, watchlist table, financial data tables | `--text-label` / `--text-data`, row height 28-32px, minimal padding. Cards separated by `--border-dim`. |
| **Editorial** | Main column narrative content (briefings, AI synthesis, research body) | `--text-body` (15px serif, line-height 1.7), paragraph spacing `--section-gap`, max-width 680px for reading comfort. |

### AI content markers

Every AI-generated content block carries a 2px left border in `--accent-gold-dim` and a micro-label: `AI 综述` / `AI 解读` / `AI 洞察`. The label uses `--text-micro` styling. This is consistent across all pages.

---

## Component Tree

```
src/
├── app/
│   ├── App.tsx                    # Router + QueryClientProvider + global providers
│   ├── routes.tsx                 # Route definitions
│   └── layouts/
│       ├── AppShell.tsx           # MacroStrip + MainColumn + ContextColumn
│       ├── MacroStrip.tsx         # Global macro tickers + nav + search
│       ├── PageLayout.tsx         # Composition wrapper: main + context slots
│       └── AuthLayout.tsx         # Minimal layout for login/register
│
├── features/
│   ├── home/
│   │   ├── HomePage.tsx           # Main: briefing feed. Context: calendar, heatmap, news.
│   │   ├── BriefingBlock.tsx      # Single briefing narrative with AI marker
│   │   ├── KeyMoversStrip.tsx     # Highlighted mover cards
│   │   └── BriefingArchive.tsx    # Collapsible previous briefings
│   │
│   ├── macro/
│   │   ├── MacroPage.tsx          # Main: narrative + grids. Context: heatmap, movers.
│   │   ├── MacroNarrative.tsx     # AI macro synthesis block
│   │   ├── IndexGrid.tsx          # Index performance cards
│   │   ├── SentimentDashboard.tsx # VIX/FG/DXY/yield gauges
│   │   ├── CommoditiesStrip.tsx   # Commodity prices
│   │   └── EconomicCalendar.tsx   # Upcoming events table
│   │
│   ├── research/
│   │   ├── ResearchPage.tsx       # Asset header + segmented control + view router
│   │   ├── AssetHeader.tsx        # Ticker, price, change, segment toggle
│   │   ├── ResearchContext.tsx     # Right panel: metrics, levels, peers, provenance
│   │   ├── analysis/
│   │   │   ├── AnalysisView.tsx   # AI synthesis + financials + news + history
│   │   │   ├── AISynthesis.tsx    # Multi-paragraph research narrative
│   │   │   ├── FinancialTable.tsx # Quarterly financials with AI commentary
│   │   │   ├── NewsEvents.tsx     # Sourced news list
│   │   │   └── AnalysisHistory.tsx
│   │   └── chartlab/
│   │       ├── ChartLabView.tsx   # KLineChart + indicator controls + code editor
│   │       ├── ChartContainer.tsx # KLineCharts wrapper with timeframe selector
│   │       ├── IndicatorToolbar.tsx
│   │       ├── IndicatorEditor.tsx # CodeMirror + AI generate button
│   │       └── IndicatorList.tsx
│   │
│   ├── watchlist/
│   │   ├── WatchlistPage.tsx      # Main: asset table. Context: stats, movers, events.
│   │   ├── WatchlistTable.tsx     # Row: ticker, price, change, AI summary
│   │   ├── AddAssetSearch.tsx     # Search + add flow
│   │   └── WatchlistContext.tsx   # Right panel
│   │
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   │
│   └── settings/
│       └── SettingsPage.tsx
│
├── shared/
│   ├── components/
│   │   ├── AIMarker.tsx           # Gold left-border + "AI 综述" label
│   │   ├── PriceChange.tsx        # Price + colored change badge
│   │   ├── TickerChip.tsx         # Clickable ticker mention in narratives
│   │   ├── DataCard.tsx           # Compact card with 1px border
│   │   ├── MicroLabel.tsx         # 10px uppercase label
│   │   ├── SentimentGauge.tsx     # ECharts gauge wrapper
│   │   ├── Heatmap.tsx            # ECharts treemap wrapper
│   │   ├── Sparkline.tsx          # Tiny inline chart
│   │   ├── SearchOverlay.tsx      # Global symbol search dropdown
│   │   └── SegmentedControl.tsx   # Two-segment toggle
│   │
│   ├── hooks/
│   │   ├── useMarketOverview.ts   # TanStack Query: /api/global-market/overview
│   │   ├── useSentiment.ts        # TanStack Query: /api/global-market/sentiment
│   │   ├── useAnalysis.ts         # TanStack Query: /api/fast-analysis/*
│   │   ├── useKline.ts            # TanStack Query: /api/indicator/kline
│   │   ├── useWatchlist.ts        # TanStack Query + mutations: /api/market/watchlist/*
│   │   ├── useSymbolSearch.ts     # /api/market/symbols/search
│   │   └── useResearchContext.ts  # Shared research state (asset, price, indicators)
│   │
│   ├── api/
│   │   ├── client.ts              # ky instance with JWT interceptor, base URL
│   │   ├── types.ts               # API response types
│   │   ├── globalMarket.ts        # overview, sentiment, heatmap, calendar, news
│   │   ├── analysis.ts            # analyze, history, similar-patterns, feedback
│   │   ├── kline.ts               # kline, price
│   │   ├── indicator.ts           # getIndicators, saveIndicator, callIndicator, etc.
│   │   ├── watchlist.ts           # get, add, remove, prices
│   │   ├── briefing.ts            # latest, archive (mock adapter initially)
│   │   └── auth.ts                # login, register, info
│   │
│   └── styles/
│       ├── tokens.css             # CSS custom properties (all design tokens)
│       ├── reset.css              # Minimal reset
│       ├── typography.css         # Font-face declarations, global type rules
│       └── density.css            # Density zone utility classes
```

---

## State Management Plan

### Server state (TanStack Query)

All data from the backend is server state. It is fetched, cached, and refetched by TanStack Query. There is no Redux store mirroring API data.

| Query key | Endpoint | Stale time | Refetch interval |
|-----------|----------|------------|------------------|
| `['market-overview']` | `/api/global-market/overview` | 30s | 30s (powers MacroStrip on every page) |
| `['sentiment']` | `/api/global-market/sentiment` | 5 min | 5 min |
| `['heatmap']` | `/api/global-market/heatmap` | 30s | none |
| `['news', lang]` | `/api/global-market/news` | 3 min | none |
| `['calendar']` | `/api/global-market/calendar` | 1 hr | none |
| `['briefing', 'latest']` | `/api/briefing/latest` | 5 min | 5 min |
| `['analysis', market, symbol]` | `/api/fast-analysis/analyze` | manual | none (triggered by user action) |
| `['analysis-history', market, symbol]` | `/api/fast-analysis/history` | 1 min | none |
| `['kline', market, symbol, tf]` | `/api/indicator/kline` | 30s | none |
| `['watchlist']` | `/api/market/watchlist/get` | 1 min | none |
| `['watchlist-prices']` | `/api/market/watchlist/prices` | 30s | 30s |
| `['indicators']` | `/api/indicator/getIndicators` | 5 min | none |

### UI state (Zustand)

Minimal. Only for transient UI concerns that don't belong in the URL or server cache:

```typescript
interface UIStore {
  searchOpen: boolean;
  contextCollapsed: boolean; // for mobile
  researchView: 'analysis' | 'chart'; // also reflected in URL query
}
```

### Route state

The URL is the source of truth for:
- Current page (path)
- Current research asset (`:market/:symbol`)
- Research view toggle (`?view=chart`)
- Search query (`?q=...` on search overlay)

### Research page state architecture

The Research page needs to share data between AI Analysis and Chart Lab views. This is done through a shared query context, not a store:

```typescript
function ResearchPage({ market, symbol }) {
  // These queries are shared by both views
  const price = useQuery(['price', market, symbol], ...);
  const company = useQuery(['company', market, symbol], ...);

  // View-specific queries
  // Analysis view: triggers on mount, uses analyze endpoint
  // Chart view: uses kline endpoint with selected timeframe
  
  return (
    <ResearchProvider value={{ market, symbol, price, company }}>
      {view === 'analysis' ? <AnalysisView /> : <ChartLabView />}
    </ResearchProvider>
  );
}
```

Switching views does not cause re-fetch of shared data (TanStack Query deduplicates by key). View-specific data is fetched lazily on view mount.

---

## API Integration Map

| Frontend Component | Backend Endpoint | Status | Notes |
|-------------------|-----------------|--------|-------|
| **MacroStrip** (every page) | `GET /api/global-market/overview` | REAL | Provides SPX, NDX, VIX, DXY. Polled every 30s. |
| **MacroStrip** (every page) | `GET /api/global-market/sentiment` | REAL | Provides Fear&Greed for the strip. |
| **MacroPage** — index grid | `GET /api/global-market/overview` | REAL | Same call as strip, uses indices array. |
| **MacroPage** — sentiment | `GET /api/global-market/sentiment` | REAL | VIX, DXY, yields, F&G, VXN, GVZ. |
| **MacroPage** — heatmap | `GET /api/global-market/heatmap` | REAL | Sector heatmap data. |
| **MacroPage** — calendar | `GET /api/global-market/calendar` | REAL (degraded) | Returns synthetic data. Usable for layout; swap to live source later. |
| **MacroPage** — opportunities | `GET /api/global-market/opportunities` | REAL | Cross-market notable movers. |
| **MacroPage** — news | `GET /api/global-market/news` | REAL | Financial news aggregation. |
| **MacroPage** — AI narrative | `GET /api/macro/narrative` | **MOCK** | Endpoint doesn't exist. Mock with static Chinese narrative. |
| **HomePage** — briefing | `GET /api/briefing/latest` | **MOCK** | Endpoint doesn't exist. Mock with sample briefing JSON. |
| **HomePage** — context | Multiple global-market endpoints | REAL | Calendar, heatmap, news, watchlist prices. |
| **Research** — AI analysis | `POST /api/fast-analysis/analyze` | REAL (schema transitional) | Works today. Output has BUY/SELL fields; frontend maps to research display. |
| **Research** — analysis history | `GET /api/fast-analysis/history` | REAL | Per-symbol history. |
| **Research** — similar patterns | `GET /api/fast-analysis/similar-patterns` | REAL | Pattern matching from memory. |
| **Research** — feedback | `POST /api/fast-analysis/feedback` | REAL | User feedback on analysis. |
| **Research** — chart data | `GET /api/indicator/kline` | REAL | K-line data for any market/symbol/timeframe. |
| **Research** — price | `GET /api/indicator/price` | REAL | Latest price. |
| **Research** — indicators | `GET /api/indicator/getIndicators` | REAL | User's indicator list. |
| **Research** — run indicator | `POST /api/indicator/callIndicator` | REAL | Execute indicator code against kline data. |
| **Research** — AI generate code | `POST /api/indicator/aiGenerate` | REAL | Natural language to indicator code. |
| **Research** — company name | `POST /api/market/stock/name` | REAL | Symbol name resolution. |
| **Watchlist** — list | `GET /api/market/watchlist/get` | REAL | User's tracked assets. |
| **Watchlist** — prices | `GET /api/market/watchlist/prices` | REAL | Batch price fetch. |
| **Watchlist** — add/remove | `POST /api/market/watchlist/add`, `/remove` | REAL | CRUD operations. |
| **Watchlist** — AI summaries | per-item AI summary | **MOCK** | No endpoint. Mock with template sentences. |
| **Search** | `GET /api/market/symbols/search` | REAL | Multi-market symbol search. |
| **Auth** | `POST /api/auth/login`, `/register`, `GET /api/auth/info` | REAL | JWT auth flow. |

---

## Mock Data Plan

Three endpoints need mocks. All others are real.

### 1. Briefing (`/api/briefing/latest`)

Create a static JSON fixture with the expected briefing schema:

```typescript
interface Briefing {
  id: number;
  type: 'morning' | 'evening';
  date: string;
  title: string;
  sections: {
    headline: string;
    body: string;
    mentioned_symbols?: { market: string; symbol: string; name: string }[];
  }[];
  generated_at: string;
  model: string;
}
```

Ship a `mocks/briefing-sample.json` with 2-3 realistic Chinese-language sample briefings. The API adapter returns this fixture when the real endpoint 404s.

### 2. Macro AI narrative (`/api/macro/narrative`)

Same approach: static fixture with 2-3 paragraphs of Chinese macro commentary. The adapter falls back to the fixture on 404.

### 3. Watchlist AI summaries

No dedicated endpoint needed for MVP. Logic:
1. For each watchlist item, check if `/api/fast-analysis/history?market=X&symbol=Y&days=1&limit=1` returns a recent result.
2. If yes, extract the `summary` field.
3. If no, render a template: `"{name} 今日{涨/跌} {changePercent}%"`.

This requires no mock endpoint — it's a frontend composition pattern on existing data.

### Transitional: AI analysis output mapping

The current `/api/fast-analysis/analyze` returns `decision: "BUY"`, `entry_price`, `stop_loss`, etc. Until the backend adds a research-mode schema, the frontend maps the existing output:

```typescript
function mapToResearchDisplay(raw: TradingAnalysis): ResearchDisplay {
  return {
    narrative: raw.summary,
    bullishFactors: raw.key_reasons.filter(reasonIsBullish),
    bearishFactors: raw.risks,
    watchLevels: {
      support: raw.analysis?.technical?.match(/support.*?\$[\d.]+/i),
      resistance: raw.analysis?.technical?.match(/resistance.*?\$[\d.]+/i),
    },
    technical: raw.analysis.technical,
    fundamental: raw.analysis.fundamental,
    sentiment: raw.analysis.sentiment,
    scores: {
      technical: raw.technical_score,
      fundamental: raw.fundamental_score,
      sentiment: raw.sentiment_score,
    },
    // Hidden from UI: decision, entry_price, stop_loss, take_profit, position_size_pct
  };
}
```

This adapter layer means the frontend never displays BUY/SELL/HOLD language, even before the backend prompt is rewritten. It's an explicit mapping that strips trading fields and reframes the remainder.

---

## Page Implementation Order

### Phase 1: Shell + Macro (Weeks 1-2)

**Build**: `AppShell`, `MacroStrip`, `PageLayout`, `ContextColumn`, `MacroPage`

**Why first**: Macro has 90% backend coverage. Building it forces every shell-level decision to be made (strip layout, column proportions, density zones, typography scale, color tokens). After Macro works, the shell is validated and reusable by every other page.

**Success criteria**: User logs in and sees a fully functional Macro page with live data. MacroStrip shows real SPX/NDX/VIX/DXY. Sentiment gauges render. Heatmap renders. Calendar renders (synthetic data is fine). The layout feels like "Luxury Tech Archive," not like a SaaS admin panel.

### Phase 2: Research — AI Analysis (Weeks 3-4)

**Build**: `ResearchPage`, `AssetHeader`, `AnalysisView`, `AISynthesis`, `FinancialTable`, `NewsEvents`, `ResearchContext`, `SearchOverlay`

**Why second**: This is the product's center of gravity. The Research page tests the hardest layout challenge (asset header + segmented control + main/context split). It integrates the most complex backend endpoint (`/api/fast-analysis/analyze`). And it requires the transitional output mapping layer.

**Success criteria**: User searches "AAPL", navigates to Research page, sees asset header with price, triggers AI analysis, reads a research-style synthesis (no BUY/SELL language visible), sees financial table and news in the main column, sees metrics and watch levels in the context column.

### Phase 3: Research — Chart Lab (Week 5)

**Build**: `ChartLabView`, `ChartContainer` (KLineCharts integration), `IndicatorToolbar`, `IndicatorEditor`, `IndicatorList`

**Why third**: Chart Lab is the secondary Research view. It depends on the Research shell (asset header, context panel) already existing from Phase 2. The main new work is KLineCharts integration and the CodeMirror editor.

**Success criteria**: User toggles to Chart Lab, sees a full KLineChart with candlesticks and volume. Can switch timeframes. Can add RSI/MACD overlays. Can open the code editor and see their saved indicators. Chart feels like a research support tool, not the product's homepage.

### Phase 4: Watchlist (Week 6)

**Build**: `WatchlistPage`, `WatchlistTable`, `AddAssetSearch`, `WatchlistContext`

**Why fourth**: Watchlist is simple CRUD + display. All backend endpoints are real. The main challenge is the AI summary composition logic (pulling from analysis history or generating template text).

**Success criteria**: User sees their tracked assets with prices and daily changes. Can add/remove assets. Each row shows a one-line summary. Clicking a row navigates to Research.

### Phase 5: Home (Week 7)

**Build**: `HomePage`, `BriefingBlock`, `KeyMoversStrip`, `BriefingArchive`

**Why last**: Home requires the briefing mock data (or the real `BriefingService` if backend has caught up). The context panels (calendar, heatmap, news) reuse components already built for Macro. The main new work is the briefing narrative layout — which is primarily a typography and reading-UX challenge, not a data challenge.

**Success criteria**: User opens the app and sees today's briefing (mock or real). The reading experience feels editorial, not dashboard-like. Clicking a mentioned stock navigates to Research. Context panel shows earnings calendar and news.

---

## Risks / Drift Warnings

### 1. Chart Lab gravity

Risk: Developers will be tempted to make the chart bigger, add more indicators, add backtest visualization, add strategy testing — because the backend supports all of it. The chart will slowly become the product.

Guardrail: Chart Lab is behind a view toggle. It never appears on first load. It shares equal column space with AI Analysis — it doesn't get more. The code editor is collapsed by default.

### 2. Trading language leak

Risk: The existing `/api/fast-analysis/analyze` returns `decision: "BUY"`, `stop_loss`, `take_profit`. If the transitional mapping layer is poorly implemented, trading language leaks into the UI.

Guardrail: The `mapToResearchDisplay()` adapter explicitly drops these fields. The TypeScript type `ResearchDisplay` does not include `decision`, `entry_price`, `stop_loss`, `take_profit`, or `position_size_pct`. If a developer tries to access `analysis.decision`, the compiler stops them.

### 3. Generic Ant Design look

Risk: Radix UI primitives are unstyled. Without disciplined application of the design tokens, the product will default to generic-looking components.

Guardrail: No component library for visual styling. Every visual treatment comes from `tokens.css` and component-specific CSS Modules. The `border-radius: 0` rule, the serif typography for narratives, and the gold accent color are non-negotiable and must be applied from day one in the shell.

### 4. Right column bloat

Risk: The context column is easy to overload. Every feature request will want "just one more card" in the right panel.

Guardrail: Maximum 5 cards in the context column per page. Each card has a maximum height. If content overflows, the column scrolls — but the column itself never grows wider than its initial proportion.

### 5. Mobile neglect

Risk: Building desktop-first means mobile might never be addressed.

Guardrail: The responsive breakpoint behavior is defined in the shell from Phase 1. The context column collapses to a slide-over at <960px. The MacroStrip becomes a horizontal scroll at <768px. These behaviors are built into the shell, not retrofitted later.

---

## Final Recommendation

Build the frontend as a new React + TypeScript + Vite SPA. Do not fork or retrofit the old Vue frontend. Start with the Macro page to validate the shell, design system, and live API integration. Then build Research (the product's center), then Watchlist, then Home. Use static mock fixtures for the three missing endpoints (briefing, macro narrative, watchlist AI summaries) so no page is blocked by backend timelines.

The single most important artifact to ship first is the `AppShell` + `MacroStrip` + `MacroPage` combination. If that looks and feels right — sharp typography, proper density zones, gold accent on dark surface, live data flowing through the macro strip, editorial narrative anchoring the main column — the design system is proven and every subsequent page is a content fill, not a structural experiment.

---

## Ready-to-Build Starter Scope

### What to build

**Slice 1**: `AppShell` + `MacroStrip` + `MacroPage` with real API data.

### Layout components to build first

1. `tokens.css` — all design tokens (colors, typography, spacing, geometry)
2. `AppShell.tsx` — top strip + two-column layout
3. `MacroStrip.tsx` — 48px bar with live tickers, nav links, search trigger
4. `PageLayout.tsx` — main + context column composition wrapper

### Which API calls can be real

All of them for this slice:
- `GET /api/global-market/overview` → MacroStrip tickers + index grid
- `GET /api/global-market/sentiment` → VIX, DXY, yields, Fear&Greed gauges
- `GET /api/global-market/heatmap` → sector treemap
- `GET /api/global-market/calendar` → economic calendar (synthetic data, but the endpoint works)
- `GET /api/global-market/news` → financial news list
- `GET /api/global-market/opportunities` → top movers
- `POST /api/auth/login` → authentication (use existing credentials)

### What should be mocked

Only the AI macro narrative (one static paragraph in Chinese). Everything else is live.

### What success looks like

Open the app. See `SPX 5,420 ▲0.3%` in the top strip with live data. Below, read a macro narrative block (mocked). See an index grid with real numbers. See a VIX gauge showing the real VIX value. See a sector heatmap with actual sector data. See an economic calendar with upcoming events. See a news feed with real headlines. The right column shows opportunities and forex data.

The page feels like opening the financial section of a high-end Chinese-language publication — not like logging into a trading platform. If a viewer mistakes this for a Quant dashboard, the design has failed. If a viewer says "this looks like a serious market intelligence product," the design has succeeded.
