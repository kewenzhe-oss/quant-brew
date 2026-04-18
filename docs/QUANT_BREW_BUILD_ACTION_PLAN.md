# Quant-Brew Build Action Plan

## 1. Implementation Strategy

Research comes first because it is the product's center of value and its pre-generation state is currently broken — an empty page with a single button. Fixing this produces the highest-impact improvement to the user's first contact with the product. It also forces creation of the shared search infrastructure (API module, debounced hook, recent-symbols persistence, result types) that Phase 5 (Search Overlay) will reuse without duplication.

Home comes second because it is the daily return surface. The current flat briefing layout undersells product identity. The fix is pure frontend composition — no new backend endpoints required, no API risk. It uses live market data hooks that already exist.

Macro comes third because the data modules already work. The improvement is structural (hero panel, section wrappers, visual elevation) — low risk, low dependency.

Watchlist comes fourth because all backend CRUD endpoints exist and are confirmed (`/api/market/watchlist/get`, `/add`, `/remove`, `/prices`). It completes the four-tab IA. It also reuses the search infrastructure from Phase 1 for the add-asset modal.

Search Overlay comes fifth. By this point, all four pages exist and the search API module + hook + recent-symbols persistence already live in shared space from Phase 1. The overlay is a thin UI shell around existing infra.

Design tightening comes last. It touches CSS tokens, shared component variants, then page-level adoption — in that order per Patch 4. Doing it last means all pages exist and can be audited together.

Work splits into 8 PRs. Phase 1 splits into two PRs (infra then UI) because the search infrastructure is shared and needs to be reviewable independently from the Research page refactor. All other phases are one PR each.

---

## 2. Build Order by Phase

### Phase 1 — Research Pre-Generation State

**Objective**: Make Research useful before and without AI generation. Build shared search infra that Phase 5 reuses.

**Why now**: Research is the product center. The pre-generation state (80% blank page with one button) is the highest-severity UX problem. Shared search infra built here prevents duplication in Phase 5.

**Scope**:
- Shared symbol search API module, debounced hook, recent-symbols localStorage hook, search result types
- Asset entry surface for bare `/research` route (search + recent-viewed + sector groups)
- Pre-analysis content for `/research/:market/:symbol` before generation (company info, analysis history summary, generate CTA)
- Context panel split: history + similar patterns render before analysis; scores + indicators + provenance render after
- Re-analyze link in AISynthesis footer
- Crypto conditional display in AssetHeader (hide `sector` for crypto market)
- Route addition: bare `/research` as sibling to existing `research/:market/:symbol`

**Out of scope**: Chart Lab, code editor, backtesting, indicator IDE, AI chat, auto-triggered analysis.

**Deliverable**: `/research` shows a useful asset entry with live search. `/research/USStock/AAPL` shows company info + history before generation. Context panel is populated pre-analysis. After analysis, "重新分析" link visible.

---

### Phase 2 — Home Information Sequencing

**Objective**: Restructure Home from flat briefing list to: direction → snapshot → detail → movers → archive.

**Why now**: Home is the daily return surface. No new API risk — uses existing `useMarketOverview` and mock briefing data. Pure frontend composition.

**Scope**:
- `HeadlineSummary` — one-sentence narrative hook at top
- `MarketSnapshot` — 3-5 live market numbers from existing `/api/global-market/overview`
- Briefing section visual hierarchy — lead section visually differentiated from subsequent sections
- `MentionedSymbols` card in context column — aggregates `mentioned_symbols` from briefing with live prices
- `BriefingArchive` collapsed section at bottom (mock data)
- Enrich `mockBriefing` to include `headline_summary` field

**Out of scope**: Real briefing API, evening briefing toggle, briefing generation backend.

**Deliverable**: Home reads as direction → snapshot → detail → movers → archive. Context column shows mentioned tickers with live prices. Not a dashboard grid.

---

### Phase 3 — Macro Hero Panel

**Objective**: Add problem-framing hero that makes Macro a judgment page instead of a data stack.

**Why now**: Macro data modules already work. The fix is additive: one new component at the top + section wrappers around existing modules. Low risk.

**Scope**:
- `MacroHeroPanel` — framing question + four-dimension status badges + one-sentence verdict
- `MacroSection` — reusable wrapper with section title + one-sentence summary
- Wrap each existing data module in `MacroSection`
- Visually elevate `MacroNarrative` (larger heading, more spacing)
- Enrich `mockMacroNarrative` to include `verdict` and `dimensions` fields
- Hero panel four-dimension status derived from real sentiment API data (VIX value → sentiment status, fear_greed value → emotion status) plus mock labels for liquidity and economy

**Out of scope**: Macro sub-tabs (流动性/经济基本面/...), deep drill-down pages, real AI macro narrative endpoint.

**Deliverable**: Macro opens with "当前市场环境如何？" + four-dimension snapshot + verdict sentence. Every data section has title + summary. AI narrative is visually dominant.

---

### Phase 4 — Watchlist Page

**Objective**: Replace placeholder with functional scan layer using real backend CRUD.

**Why now**: All backend endpoints confirmed: `GET /api/market/watchlist/get`, `POST /add`, `POST /remove`, `GET /prices`. Reuses search infra from Phase 1 for add-asset modal.

**Scope**:
- `WatchlistPage` replacing placeholder
- `WatchlistTable` — rows with symbol, name, market badge, price, change%, one-line summary
- `AddAssetModal` — search-to-add using shared `useSymbolSearch` from Phase 1
- `WatchlistContextPanel` — top movers + calendar
- Summary fallback (Patch 3): recent analysis summary (< 24h old) → template sentence `"{name} 今日{涨/跌} {pct}%"` → empty string. Freshness threshold: `created_at` within 24 hours of `Date.now()`.
- Empty state for zero-item watchlist

**Out of scope**: P&L, positions, entry price, alerts, batch analysis, broker sync, per-row "Run analysis" buttons, any hidden LLM calls.

**Deliverable**: User manages a watchlist with real CRUD. Live prices via batch endpoint. Click row → Research. No trading language.

---

### Phase 5 — Global Search Overlay

**Objective**: Enable `/` keyboard search from any page.

**Why now**: All four pages exist. Search infra (API module, hook, recent-symbols, types) already built in Phase 1. This phase is a thin UI overlay.

**Scope**:
- `SearchOverlay` — modal triggered from MacroStrip or `/` key
- Reuses `useSymbolSearch` and `useRecentSymbols` from `src/shared/hooks/` (Phase 1 infra)
- Select result → navigate to `/research/:market/:symbol`
- Update MacroStrip "研究" `NavLink` to `to="/research"` (now a useful entry page) instead of hardcoded AAPL
- Add search icon button to MacroStrip

**Out of scope**: Multi-market simultaneous search, advanced filters, full-text news search.

**Deliverable**: `/` opens overlay. Type, select, navigate. Recent searches persist. MacroStrip no longer hardcodes AAPL.

---

### Phase 6 — Design System Tightening

**Objective**: Fix four identified design gaps. Execute in strict order per Patch 4: tokens → shared components → page CSS → empty-state audit.

**Why now**: All pages exist. Visual polish is meaningful only when the complete surface is reviewable.

**Scope** (in execution order):
1. Add `--text-body: #B8B8BC` to `tokens.css`
2. Add `elevated` prop/variant to `DataCard`
3. Add conditional VIX/F&G tinting logic to `MacroStrip`
4. Migrate page-level CSS: switch editorial body text from `--text-secondary` to `--text-body` in Home, Research AISynthesis, Macro narrative
5. Apply `elevated` to first DataCard in each context panel
6. Empty-state cleanup audit: collapse sections with no data instead of rendering "暂无数据"

**Out of scope**: Full responsive mobile layout, animation system, icon library, new typography.

**Deliverable**: Body text more readable. MacroStrip has sentiment coloring. Context columns have visual hierarchy. No dead placeholder zones.

---

## 3. File-Level Plan

### Phase 1 — Research Pre-Generation State

#### PR 1a: Shared search infrastructure

**Create**:

| Path | Purpose |
|------|---------|
| `src/shared/api/symbolSearch.ts` | API module wrapping `GET /api/market/symbols/search` and `GET /api/market/symbols/hot` |
| `src/shared/hooks/useSymbolSearch.ts` | Debounced search hook (300ms). Accepts `market` and `keyword`. Returns `{ results, isLoading }`. Reused by Phase 4 AddAssetModal and Phase 5 SearchOverlay. |
| `src/shared/hooks/useRecentSymbols.ts` | `localStorage`-backed hook. `addRecent(market, symbol, name)`, `getRecent()`. Key: `qb_recent_symbols`. Max 20 items. Reused by Phase 5 SearchOverlay. |

**Modify**:

| Path | Change |
|------|--------|
| `src/shared/api/types.ts` | Add `SymbolSearchResult` interface: `{ market: string; symbol: string; name: string }`. Add `HotSymbolsResponse` and `SymbolSearchResponse` wrapper types. |

**Keep unchanged**: Everything else.

---

#### PR 1b: Research page refactor + asset entry

**Create**:

| Path | Purpose |
|------|---------|
| `src/features/research/AssetEntry.tsx` | No-symbol state: search input + recent-viewed chips + sector groups grid |
| `src/features/research/AssetEntry.module.css` | Styles |
| `src/features/research/PreAnalysisContent.tsx` | Pre-generation main column: company profile (name, sector, industry, exchange from `useStockName`), most recent analysis summary from `useAnalysisHistory`, generate CTA button |
| `src/features/research/PreAnalysisContent.module.css` | Styles |
| `src/shared/mocks/sectorGroups.ts` | Static sector group data: `{ id, name, description, tickers: SymbolSearchResult[] }[]`. Groups: MAG 7, AI 芯片, 中概核心, 加密核心. |

**Modify**:

| Path | Change |
|------|--------|
| `src/app/routes.tsx` | Add `{ path: 'research', element: <ResearchPage /> }` as sibling route above `research/:market/:symbol`. Both remain flat children of the AppShell layout route. No nesting change. See Route Handling section below. |
| `src/features/research/ResearchPage.tsx` | No-symbol branch → render `<AssetEntry />`. Has-symbol-but-no-analysis branch → render `<AssetHeader />` + `<PreAnalysisContent />` instead of dropping directly into `<AnalysisView />`. After analysis → current behavior. |
| `src/features/research/ResearchContextPanel.tsx` | Move `HistoryCard` and `SimilarPatternsCard` outside the `analysis &&` guard so they render pre-generation. Keep `ScoresCard`, `IndicatorsCard`, `WatchLevelsCard`, `ProvenanceCard` behind `analysis &&` guard. |
| `src/features/research/AssetHeader.tsx` | When `market === 'Crypto'`, do not render `sector` or `exchange` row. Market badge already handles "加密". |
| `src/features/research/analysis/AISynthesis.tsx` | Add `onReanalyze?: () => void` prop. Render "重新分析" text link in footer next to model/time metadata. |
| `src/features/research/analysis/AnalysisView.tsx` | Pass `runAnalysis` as `onReanalyze` to `<AISynthesis>` when data is present. |

**Keep unchanged**:

| Path | Reason |
|------|--------|
| `src/shared/api/researchAdapter.ts` | Adapter firewall — untouched |
| `src/shared/api/analysis.ts` | Analysis API — untouched |
| `src/shared/api/market.ts` | Market API — untouched |
| `src/shared/api/client.ts` | HTTP client — untouched |
| `src/shared/hooks/useAnalysis.ts` | Analysis hooks — untouched |
| `src/shared/hooks/useAssetInfo.ts` | Asset info hooks — untouched |
| `src/app/layouts/AppShell.tsx` | Shell — untouched |
| `src/app/layouts/MacroStrip.tsx` | Strip — untouched until Phase 5 |
| `src/app/layouts/PageLayout.tsx` | Layout — untouched |
| All `src/features/home/*` | Home — Phase 2 |
| All `src/features/macro/*` | Macro — Phase 3 |

#### Route Handling (Patch 1)

**Current route pattern** (inspected):
```
createBrowserRouter([
  {
    element: <AppShell />,        // layout route, no path
    children: [
      { index: true, element: <HomePage /> },
      { path: 'macro', element: <MacroPage /> },
      { path: 'research/:market/:symbol', element: <ResearchPage /> },
      { path: 'watchlist', ... },
      { path: 'settings', ... },
    ],
  },
  { path: 'login', ... },
]);
```

**Chosen implementation pattern**:
```
children: [
  ...
  { path: 'research', element: <ResearchPage /> },
  { path: 'research/:market/:symbol', element: <ResearchPage /> },
  ...
]
```

**Why this preserves existing behavior**:
- Both routes are flat siblings under the same pathless AppShell layout. No nesting hierarchy changes.
- React Router 6 matches these as distinct routes. `/research` matches the bare route. `/research/USStock/AAPL` matches the parameterized route. No conflict — they don't share a layout wrapper or `Outlet`.
- `ResearchPage` already handles `!symbol` internally (the `if (!symbol)` branch). The bare route causes `useParams` to return empty strings, triggering the no-symbol branch. The parameterized route provides values.
- MacroStrip's `NavLink to="/research"` will match both routes for active-state highlighting because it's a prefix match (no `end` prop).
- No other routes are affected. AppShell's `Outlet` renders whichever child matches.

---

### Phase 2 — Home Information Sequencing

**Create**:

| Path | Purpose |
|------|---------|
| `src/features/home/HeadlineSummary.tsx` | One-sentence hero hook. Receives `summary: string` from mock briefing. |
| `src/features/home/HeadlineSummary.module.css` | Styles — larger font, serif, prominent spacing |
| `src/features/home/MarketSnapshot.tsx` | 3-5 live numbers. Uses `useMarketOverview()` + `useSentiment()` (existing hooks). |
| `src/features/home/MarketSnapshot.module.css` | Styles — horizontal strip, monospace values |
| `src/features/home/MentionedSymbols.tsx` | DataCard collecting all `mentioned_symbols` from briefing sections, renders `TickerChip` + live price via `useAssetPrice`. |
| `src/features/home/MentionedSymbols.module.css` | Styles |
| `src/features/home/BriefingArchive.tsx` | Collapsed section. Shows "往期简报 (3)" with mock titles. Expand/collapse toggle. |
| `src/features/home/BriefingArchive.module.css` | Styles |

**Modify**:

| Path | Change |
|------|--------|
| `src/features/home/HomePage.tsx` | Recompose `HomeMainContent`: HeadlineSummary → MarketSnapshot → AIMarker(BriefingBlocks) → KeyMoversStrip → BriefingArchive |
| `src/features/home/HomeContextPanel.tsx` | Add `<MentionedSymbols symbols={...} />` above `<CalendarWidget />` |
| `src/shared/mocks/briefing.ts` | Add `headline_summary: string` field to `mockBriefing`. Value: `"隔夜美股科技领涨，联储鸽派纪要推升降息预期，BTC突破六万五"` |
| `src/shared/api/types.ts` | Add `headline_summary?: string` to `Briefing` interface |

**Keep unchanged**:

| Path | Reason |
|------|--------|
| `src/features/home/BriefingBlock.tsx` | Existing — no changes |
| `src/features/home/KeyMoversStrip.tsx` | Existing — no changes |

---

### Phase 3 — Macro Hero Panel

**Create**:

| Path | Purpose |
|------|---------|
| `src/features/macro/MacroHeroPanel.tsx` | Framing question + four-dimension badges + verdict sentence. Reads `useSentiment()` for real VIX/F&G status. Uses mock for liquidity and economy labels. |
| `src/features/macro/MacroHeroPanel.module.css` | Styles |
| `src/features/macro/MacroSection.tsx` | Reusable section wrapper: `title: string`, `summary?: string`, `children`. Renders `<section>` with `<h3>` title, `<p>` summary, then children. |
| `src/features/macro/MacroSection.module.css` | Styles |

**Modify**:

| Path | Change |
|------|--------|
| `src/features/macro/MacroPage.tsx` | Insert `<MacroHeroPanel />` above `<MacroNarrative />`. Wrap `IndexGrid` in `<MacroSection title="市场表现" summary="...">`, `SentimentDashboard` in `<MacroSection title="风险情绪" summary="...">`, etc. |
| `src/features/macro/MacroNarrative.module.css` | Increase `.heading` font-size from current value to 20px. Increase section bottom margin to 32px. |
| `src/shared/mocks/macroNarrative.ts` | Add `verdict: string` and `dimensions: { name: string; status: string; statusType: 'positive' \| 'neutral' \| 'negative' }[]` fields. |

**Keep unchanged**:

| Path | Reason |
|------|--------|
| `src/features/macro/IndexGrid.tsx` | Data component — untouched |
| `src/features/macro/SentimentDashboard.tsx` | Data component — untouched |
| `src/features/macro/CommoditiesStrip.tsx` | Data component — untouched |
| `src/features/macro/EconomicCalendar.tsx` | Data component — untouched |
| `src/features/macro/MacroContextPanel.tsx` | Context panel — untouched |

---

### Phase 4 — Watchlist Page

**Create**:

| Path | Purpose |
|------|---------|
| `src/shared/api/watchlist.ts` | API module: `getWatchlist()`, `addToWatchlist(market, symbol, name)`, `removeFromWatchlist(symbol)`, `getWatchlistPrices(items)` |
| `src/shared/hooks/useWatchlist.ts` | `useWatchlist()` query, `useWatchlistPrices(items)` query (30s refetch), `useAddWatchlist()` mutation, `useRemoveWatchlist()` mutation |
| `src/features/watchlist/WatchlistPage.tsx` | Page composition: PageLayout with WatchlistTable in main, WatchlistContextPanel in context |
| `src/features/watchlist/WatchlistPage.module.css` | Styles |
| `src/features/watchlist/WatchlistTable.tsx` | Asset table. Columns: symbol, name, market badge, price, change%, one-line summary. Summary follows Patch 3 fallback. |
| `src/features/watchlist/WatchlistTable.module.css` | Styles |
| `src/features/watchlist/AddAssetModal.tsx` | Modal with search input using shared `useSymbolSearch`. Select → calls `useAddWatchlist`. |
| `src/features/watchlist/AddAssetModal.module.css` | Styles |
| `src/features/watchlist/WatchlistContextPanel.tsx` | DataCards: top movers (sorted by absolute change%), upcoming calendar events |
| `src/features/watchlist/WatchlistContextPanel.module.css` | Styles |

**Modify**:

| Path | Change |
|------|--------|
| `src/shared/api/types.ts` | Add `WatchlistItem`, `WatchlistPriceItem`, `WatchlistResponse`, `WatchlistPricesResponse` types |
| `src/app/routes.tsx` | Replace `WatchlistPlaceholder` import with `WatchlistPage`. Update route element. |

**Delete**:

| Path | Reason |
|------|--------|
| `src/features/watchlist/WatchlistPlaceholder.tsx` | Replaced |
| `src/features/watchlist/WatchlistPlaceholder.module.css` | Replaced |

**Watchlist Summary Fallback (Patch 3)**:

The `WatchlistTable` component computes each row's one-line summary using a pure function:

```
function getRowSummary(
  analysisHistory: AnalysisHistoryItem[] | undefined,
  changePercent: number,
  name: string,
): string {
  // 1. Recent analysis summary if fresh (< 24h)
  const fresh = analysisHistory?.find(
    h => Date.now() - new Date(h.created_at).getTime() < 24 * 60 * 60 * 1000
  );
  if (fresh?.summary) return fresh.summary;

  // 2. Deterministic template sentence
  if (changePercent !== 0) {
    const direction = changePercent > 0 ? '涨' : '跌';
    return `${name} 今日${direction} ${Math.abs(changePercent).toFixed(2)}%`;
  }

  // 3. Empty string
  return '';
}
```

No LLM calls. No mutations. No per-row "Run analysis" button. No placeholder prose. The history query uses the existing `useAnalysisHistory` hook per-symbol only for items currently visible (or a batch endpoint if performance requires — evaluate after initial implementation).

---

### Phase 5 — Global Search Overlay

**Create**:

| Path | Purpose |
|------|---------|
| `src/shared/components/SearchOverlay.tsx` | Modal overlay. Uses `useSymbolSearch` (Phase 1) for search results. Uses `useRecentSymbols` (Phase 1) for recent list. Select → `navigate('/research/${market}/${symbol}')` → close. Escape or backdrop click → close. |
| `src/shared/components/SearchOverlay.module.css` | Styles — centered modal, dark backdrop, input at top, results list below |

**Modify**:

| Path | Change |
|------|--------|
| `src/app/layouts/MacroStrip.tsx` | Add search icon button in `.nav` area. `onClick` → open SearchOverlay. Add global `keydown` listener: `/` key opens overlay (only when no input is focused). Change "研究" NavLink `to` from `/research/USStock/AAPL` to `/research`. |
| `src/app/layouts/MacroStrip.module.css` | Add `.searchTrigger` button styles |

**Reuse from Phase 1 (no duplication)**:

| Module | Originally created in |
|--------|-----------------------|
| `src/shared/api/symbolSearch.ts` | PR 1a |
| `src/shared/hooks/useSymbolSearch.ts` | PR 1a |
| `src/shared/hooks/useRecentSymbols.ts` | PR 1a |
| `SymbolSearchResult` type | PR 1a |

---

### Phase 6 — Design System Tightening

Execution order per Patch 4: tokens → shared components → page CSS → empty-state audit.

**Step 1 — Token layer**:

| Path | Change |
|------|--------|
| `src/shared/styles/tokens.css` | Add `--text-body: #B8B8BC;` after `--text-secondary` |

**Step 2 — Shared component variants**:

| Path | Change |
|------|--------|
| `src/shared/components/DataCard.tsx` | Add optional `elevated?: boolean` prop. When true, apply `.elevated` class. |
| `src/shared/components/DataCard.module.css` | Add `.elevated { background: var(--bg-elevated); }` |
| `src/app/layouts/MacroStrip.tsx` | Add conditional className to VIX ticker item: if value > 20, apply `.tickerWarn`. Add conditional to F&G: if value > 75, apply `.tickerGreed`; if value < 25, apply `.tickerFear`. |
| `src/app/layouts/MacroStrip.module.css` | Add `.tickerWarn`, `.tickerGreed`, `.tickerFear` with subtle background tints using status colors at 12% opacity |

**Step 3 — Page-level CSS adoption**:

| Path | Change |
|------|--------|
| `src/features/home/HomePage.module.css` | Change body/briefing text color references from `--text-secondary` to `--text-body` |
| `src/features/home/BriefingBlock.module.css` | `.body` color → `--text-body` |
| `src/features/research/analysis/AISynthesis.module.css` | `.narrative p`, `.sectionBody` color → `--text-body` |
| `src/features/macro/MacroNarrative.module.css` | `.body p` color → `--text-body` |

**Step 4 — Empty-state audit + hero card elevation**:

| Path | Change |
|------|--------|
| `src/features/home/HomeContextPanel.tsx` | If calendar events empty, do not render CalendarWidget at all (remove "暂无数据" placeholder) |
| `src/features/research/ResearchContextPanel.tsx` | Pass `elevated` prop to the first rendered DataCard |
| `src/features/watchlist/WatchlistContextPanel.tsx` | Pass `elevated` to first DataCard |
| `src/features/macro/MacroContextPanel.tsx` | Pass `elevated` to first DataCard. Collapse empty sections. |

---

## 4. Component Build Sequence

### Phase 1 — Research

Dependencies flow top-down. Each item depends only on items above it.

1. **`src/shared/api/types.ts`** — Add `SymbolSearchResult`, `HotSymbolsResponse`, `SymbolSearchResponse`. No dependencies.
2. **`src/shared/api/symbolSearch.ts`** — API module using `api.get` from `client.ts` and new types. Depends on (1).
3. **`src/shared/hooks/useSymbolSearch.ts`** — Wraps (2) with TanStack Query + 300ms debounce via `useState` timer. Depends on (2).
4. **`src/shared/hooks/useRecentSymbols.ts`** — Pure `localStorage` hook. No API dependency. Can be built in parallel with (2-3).
5. **`src/shared/mocks/sectorGroups.ts`** — Static data. No dependency.
6. **`src/features/research/AssetEntry.tsx` + CSS** — Uses (3), (4), (5). The no-symbol view.
7. **`src/features/research/PreAnalysisContent.tsx` + CSS** — Uses `useStockName` (existing), `useAnalysisHistory` (existing). The has-symbol-but-no-analysis view.
8. **`src/features/research/ResearchContextPanel.tsx`** — Refactor only: move `HistoryCard` and `SimilarPatternsCard` outside `analysis &&` guard. No new dependencies.
9. **`src/features/research/AssetHeader.tsx`** — Add crypto conditional. No new dependencies.
10. **`src/features/research/analysis/AISynthesis.tsx`** — Add `onReanalyze` prop + footer link. No new dependencies.
11. **`src/features/research/analysis/AnalysisView.tsx`** — Pass `runAnalysis` as `onReanalyze`. No new dependencies.
12. **`src/features/research/ResearchPage.tsx`** — Wire (6), (7) into page state branches. Depends on (6-11).
13. **`src/app/routes.tsx`** — Add bare `/research` route. Depends on (12).

### Phase 2 — Home

1. **`src/shared/mocks/briefing.ts`** — Add `headline_summary` field. No dependency.
2. **`src/shared/api/types.ts`** — Add `headline_summary?` to `Briefing`. No dependency.
3. **`src/features/home/HeadlineSummary.tsx` + CSS** — Receives string prop. Depends on (1) for data shape.
4. **`src/features/home/MarketSnapshot.tsx` + CSS** — Uses `useMarketOverview()` and `useSentiment()` (existing hooks). No new dependencies.
5. **`src/features/home/MentionedSymbols.tsx` + CSS** — Uses `TickerChip` (existing) and `useAssetPrice` (existing). Receives symbols array from mock briefing.
6. **`src/features/home/BriefingArchive.tsx` + CSS** — Static mock. No dependencies.
7. **`src/features/home/HomeContextPanel.tsx`** — Add `MentionedSymbols`. Depends on (5).
8. **`src/features/home/HomePage.tsx`** — Recompose. Depends on (3, 4, 6, 7).

### Phase 3 — Macro

1. **`src/shared/mocks/macroNarrative.ts`** — Add `verdict` + `dimensions` fields. No dependency.
2. **`src/features/macro/MacroSection.tsx` + CSS** — Generic wrapper. No dependency.
3. **`src/features/macro/MacroHeroPanel.tsx` + CSS** — Uses `useSentiment()` for real VIX/F&G. Uses mock for verdict/dimensions. Depends on (1).
4. **`src/features/macro/MacroPage.tsx`** — Insert hero, wrap data modules. Depends on (2, 3).
5. **`src/features/macro/MacroNarrative.module.css`** — Elevation styling. No dependency.

### Phase 4 — Watchlist

1. **`src/shared/api/types.ts`** — Add watchlist types. No dependency.
2. **`src/shared/api/watchlist.ts`** — API module. Depends on (1).
3. **`src/shared/hooks/useWatchlist.ts`** — Query + mutation hooks. Depends on (2).
4. **`src/features/watchlist/WatchlistTable.tsx` + CSS** — Uses (3) for data, `useAnalysisHistory` for summary fallback. Depends on (3).
5. **`src/features/watchlist/AddAssetModal.tsx` + CSS** — Uses `useSymbolSearch` (Phase 1 shared). Uses `useAddWatchlist` from (3). Depends on (3).
6. **`src/features/watchlist/WatchlistContextPanel.tsx` + CSS** — Uses `useCalendar` (existing), derives top movers from watchlist price data. Depends on (3).
7. **`src/features/watchlist/WatchlistPage.tsx` + CSS** — Composes (4, 5, 6). Depends on (4-6).
8. **`src/app/routes.tsx`** — Swap placeholder. Depends on (7).

### Phase 5 — Search

1. **`src/shared/components/SearchOverlay.tsx` + CSS** — Uses `useSymbolSearch` and `useRecentSymbols` (both from Phase 1). No new shared dependencies.
2. **`src/app/layouts/MacroStrip.tsx`** — Add trigger + keydown listener + update NavLink. Depends on (1).

### Phase 6 — Design (strict order)

1. **`src/shared/styles/tokens.css`** — Add `--text-body`.
2. **`src/shared/components/DataCard.tsx` + CSS** — Add `elevated` variant. Depends on (1) only for token existence.
3. **`src/app/layouts/MacroStrip.tsx` + CSS** — Sentiment tinting. Independent of (1-2).
4. **Page CSS files** — Adopt `--text-body`. Depends on (1).
5. **Context panel files** — Apply `elevated` to first card, collapse empty sections. Depends on (2).

---

## 5. API Connection Plan

| Feature | Endpoint | Real API? | Mock? | Notes |
|---------|----------|:---------:|:-----:|-------|
| Symbol search | `GET /api/market/symbols/search?market=&keyword=&limit=` | Yes | No | Confirmed in `routes/market.py` L163 |
| Hot symbols | `GET /api/market/symbols/hot?market=&limit=` | Yes | No | Confirmed L243 |
| Stock name/profile | `POST /api/market/stock/name` | Yes | No | Returns name, sector, industry, exchange. Confirmed L513 |
| Asset price | `GET /api/indicator/price?market=&symbol=` | Yes | No | Already integrated via `useAssetPrice` |
| Analysis trigger | `POST /api/fast-analysis/analyze` | Yes | No | Already integrated via `useAnalysis` |
| Analysis history | `GET /api/fast-analysis/history` | Yes | No | Already integrated via `useAnalysisHistory` |
| Similar patterns | `GET /api/fast-analysis/similar-patterns` | Yes | No | Already integrated via `useSimilarPatterns` |
| Market overview | `GET /api/global-market/overview` | Yes | No | Already integrated via `useMarketOverview` |
| Sentiment | `GET /api/global-market/sentiment` | Yes | No | Already integrated via `useSentiment` |
| Calendar | `GET /api/global-market/calendar` | Yes | No | Already integrated via `useCalendar` |
| News | `GET /api/global-market/news` | Yes | No | Already integrated via `useNews` |
| Opportunities | `GET /api/global-market/opportunities` | Yes | No | Already integrated via `useOpportunities` |
| Heatmap | `GET /api/global-market/heatmap` | Yes | No | Already integrated via `useHeatmap` |
| Watchlist get | `GET /api/market/watchlist/get` | Yes | No | Requires auth token. Confirmed L255 |
| Watchlist add | `POST /api/market/watchlist/add` | Yes | No | Requires auth. Confirmed L298 |
| Watchlist remove | `POST /api/market/watchlist/remove` | Yes | No | Requires auth. Confirmed L337 |
| Watchlist batch prices | `GET /api/market/watchlist/prices?watchlist=` | Yes | No | JSON-encoded array param. Confirmed L388 |
| Briefing content | — | No | Yes | No backend endpoint. Mock in `src/shared/mocks/briefing.ts` |
| Macro AI narrative | — | No | Yes | No backend endpoint. Mock in `src/shared/mocks/macroNarrative.ts` |
| Macro verdict/dimensions | — | No | Yes | Partially derived from real sentiment API + mock labels |
| Sector groups | — | No | Yes | Static JSON in `src/shared/mocks/sectorGroups.ts`. Not API-dependent. |
| Briefing archive | — | No | Yes | Static mock list in `BriefingArchive` component reads from `src/shared/mocks/` |
| Watchlist one-line summary | Analysis history API | Partial | Partial | Uses `useAnalysisHistory` (real) with deterministic template fallback. No LLM call. |

---

## 6. Mock Retention Plan

**All mocks live in `src/shared/mocks/`.** No exceptions.

| Mock file | Status | When replaceable |
|-----------|--------|-----------------|
| `src/shared/mocks/briefing.ts` | Keep — enriched in Phase 2 with `headline_summary` | When briefing API ships |
| `src/shared/mocks/macroNarrative.ts` | Keep — enriched in Phase 3 with `verdict`, `dimensions` | When AI macro narrative API ships |
| `src/shared/mocks/sectorGroups.ts` | Created in Phase 1 — permanent static data | Not API-dependent; stays indefinitely |

**Rules**:
- No component file may contain inline fake data (hardcoded arrays, fake scores, placeholder strings used as data)
- Hooks files must not construct mock responses internally
- If a component needs mock data, it imports from `src/shared/mocks/`
- Mock files must export typed data matching the interfaces in `src/shared/api/types.ts`

---

## 7. Page-by-Page Acceptance Criteria

### Research

| # | Criterion |
|---|-----------|
| 1 | `/research` renders asset entry surface: visible search input, recent-viewed section (if localStorage has items), sector groups grid with clickable tickers |
| 2 | Typing in search input → 300ms debounce → results appear from `/api/market/symbols/search` |
| 3 | Clicking a sector group ticker → navigates to `/research/:market/:symbol` |
| 4 | Clicking a search result → navigates to `/research/:market/:symbol` and adds to recent-viewed |
| 5 | `/research/USStock/AAPL` without prior analysis shows: AssetHeader with symbol + name + price + change, PreAnalysisContent with sector/industry/exchange info, analysis history summary if available, generate CTA button |
| 6 | Context panel pre-analysis shows HistoryCard and SimilarPatternsCard (if data exists). ScoresCard/IndicatorsCard/WatchLevelsCard/ProvenanceCard are absent. |
| 7 | Click "生成 AI 研究分析" → loading state → full AISynthesis → context panel gains scores/indicators/levels/provenance |
| 8 | AISynthesis footer shows "重新分析" link after analysis. Clicking it re-triggers analysis. |
| 9 | `/research/Crypto/BTC-USDT` hides sector and industry. Market badge shows "加密". |
| 10 | No BUY/SELL/HOLD text, no entry_price, no stop_loss, no take_profit, no position_size_pct anywhere on the page. |
| 11 | MacroStrip "研究" NavLink active state works on both `/research` and `/research/USStock/AAPL`. |

### Home

| # | Criterion |
|---|-----------|
| 1 | HeadlineSummary one-sentence hook renders above everything in main column. Font is serif, larger than body text. |
| 2 | MarketSnapshot strip shows SPX, NDX, VIX (minimum) with live values from real API. Values update on page revisit. |
| 3 | Briefing sections render below snapshot. First section has slightly larger heading than subsequent sections. |
| 4 | Context column includes MentionedSymbols card listing all tickers from all briefing sections, rendered as clickable TickerChips. |
| 5 | Clicking a TickerChip navigates to `/research/:market/:symbol`. |
| 6 | BriefingArchive section renders at bottom, collapsed by default, with 2-3 mock past briefing titles. |
| 7 | Page does not resemble a dashboard grid. Main column is a continuous reading flow. |
| 8 | Mock data notice "ⓘ 简报内容为模拟数据" remains visible. |

### Macro

| # | Criterion |
|---|-----------|
| 1 | MacroHeroPanel renders at the top of main column, above all data modules. |
| 2 | Hero shows framing question text + four dimension badges with status labels. At least VIX-derived and F&G-derived statuses come from real API. |
| 3 | One-sentence verdict visible below badges (mock text). |
| 4 | IndexGrid is wrapped in a titled section ("市场表现") with a one-sentence summary. |
| 5 | SentimentDashboard is wrapped in a titled section ("风险情绪") with a one-sentence summary. |
| 6 | CommoditiesStrip and EconomicCalendar each wrapped in titled sections. |
| 7 | MacroNarrative heading is visually larger than section titles. Bottom margin creates clear separation. |
| 8 | Page is scannable: user can read hero + four section summaries in under 10 seconds. |

### Watchlist

| # | Criterion |
|---|-----------|
| 1 | Empty state renders when user has zero watchlist items. Shows message + "添加标的" button. |
| 2 | "添加标的" opens a modal with search input. |
| 3 | Modal search uses shared `useSymbolSearch`. Results appear from real API. |
| 4 | Selecting a result calls `POST /api/market/watchlist/add` and refreshes the list. |
| 5 | Table shows: symbol, name (Chinese if available), market badge (MicroLabel), live price, daily change %. |
| 6 | One-line summary follows Patch 3 fallback: fresh analysis summary → template sentence → empty. No LLM call. |
| 7 | Clicking a row navigates to `/research/:market/:symbol`. |
| 8 | Remove button (per row) calls `POST /api/market/watchlist/remove` and refreshes. |
| 9 | No P&L column, no position size, no entry price, no "Run analysis" button per row. |
| 10 | Context panel shows top movers (sorted by |change%|) and upcoming calendar events (existing `useCalendar`). |

### Search

| # | Criterion |
|---|-----------|
| 1 | Pressing `/` on any page opens SearchOverlay (unless an input is already focused). |
| 2 | Pressing `Escape` or clicking backdrop closes overlay. |
| 3 | Typing triggers debounced search via `useSymbolSearch` (same hook as Phase 1). |
| 4 | Recent searches appear when input is empty, persisted via `useRecentSymbols` (same hook as Phase 1). |
| 5 | Selecting a result navigates to `/research/:market/:symbol`, closes overlay, and updates recent searches. |
| 6 | MacroStrip search icon button triggers the same overlay. |
| 7 | MacroStrip "研究" NavLink now points to `/research` (not `/research/USStock/AAPL`). |

---

## 8. PR Breakdown

### PR 1: Shared search infrastructure
**Goal**: Build the search API module, debounced hook, and recent-symbols hook in shared space. Add types. No UI changes.

**Files touched**:
- Create `src/shared/api/symbolSearch.ts`
- Create `src/shared/hooks/useSymbolSearch.ts`
- Create `src/shared/hooks/useRecentSymbols.ts`
- Modify `src/shared/api/types.ts` (add `SymbolSearchResult`, `HotSymbolsResponse`, `SymbolSearchResponse`)

**Risk level**: Low — additive only. No existing behavior changes.

**Verification**:
- [ ] `useSymbolSearch('USStock', 'AAP')` returns results array after debounce
- [ ] `useRecentSymbols`: `addRecent` persists; `getRecent` returns items after page reload
- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
- [ ] Existing pages render unchanged
- [ ] `npm run build` succeeds

---

### PR 2: Research pre-generation state
**Goal**: Asset entry surface for `/research`, pre-analysis content for `/research/:market/:symbol`, context panel pre-fill, re-analyze link, crypto conditional display.

**Files touched**:
- Create `src/features/research/AssetEntry.tsx` + `.module.css`
- Create `src/features/research/PreAnalysisContent.tsx` + `.module.css`
- Create `src/shared/mocks/sectorGroups.ts`
- Modify `src/app/routes.tsx` (add bare `/research` route)
- Modify `src/features/research/ResearchPage.tsx` (wire new state branches)
- Modify `src/features/research/ResearchContextPanel.tsx` (move history/patterns outside analysis guard)
- Modify `src/features/research/AssetHeader.tsx` (crypto conditional)
- Modify `src/features/research/analysis/AISynthesis.tsx` (add `onReanalyze` prop)
- Modify `src/features/research/analysis/AnalysisView.tsx` (pass `runAnalysis` as `onReanalyze`)

**Risk level**: Medium — modifies existing Research page structure and adds a route.

**Verification**:
- [ ] `/research` renders asset entry with search, recent, sector groups
- [ ] `/research/USStock/AAPL` pre-analysis: shows company info, history summary, CTA button
- [ ] `/research/Crypto/BTC-USDT` hides sector row
- [ ] Context panel shows history + patterns before analysis
- [ ] Context panel gains scores/indicators/levels/provenance after analysis
- [ ] "重新分析" link appears and works after analysis
- [ ] `mapToResearchDisplay` import/usage unchanged in `useAnalysis.ts`
- [ ] MacroStrip "研究" NavLink highlights correctly on both routes
- [ ] No other routes broken
- [ ] `npm run build` succeeds

---

### PR 3: Home information sequencing
**Goal**: Restructure Home with headline summary, market snapshot, mentioned symbols, briefing archive.

**Files touched**:
- Create `src/features/home/HeadlineSummary.tsx` + `.module.css`
- Create `src/features/home/MarketSnapshot.tsx` + `.module.css`
- Create `src/features/home/MentionedSymbols.tsx` + `.module.css`
- Create `src/features/home/BriefingArchive.tsx` + `.module.css`
- Modify `src/features/home/HomePage.tsx` (recompose main column order)
- Modify `src/features/home/HomeContextPanel.tsx` (add MentionedSymbols)
- Modify `src/shared/mocks/briefing.ts` (add `headline_summary`)
- Modify `src/shared/api/types.ts` (add `headline_summary?` to `Briefing`)

**Risk level**: Low — Home is currently mock-driven. No backend API risk.

**Verification**:
- [ ] HeadlineSummary renders one-sentence hook at top
- [ ] MarketSnapshot shows 3+ live numbers
- [ ] Briefing sections render with visual hierarchy
- [ ] Context column shows MentionedSymbols card with clickable TickerChips
- [ ] TickerChips navigate to Research
- [ ] BriefingArchive renders collapsed at bottom
- [ ] Page reads as continuous narrative, not dashboard grid
- [ ] `npm run build` succeeds

---

### PR 4: Macro hero panel
**Goal**: Add problem-framing hero and section wrappers to Macro.

**Files touched**:
- Create `src/features/macro/MacroHeroPanel.tsx` + `.module.css`
- Create `src/features/macro/MacroSection.tsx` + `.module.css`
- Modify `src/features/macro/MacroPage.tsx` (hero + section wrapping)
- Modify `src/features/macro/MacroNarrative.module.css` (elevation styling)
- Modify `src/shared/mocks/macroNarrative.ts` (add `verdict`, `dimensions`)

**Risk level**: Low — additive. Existing data components untouched.

**Verification**:
- [ ] Hero panel renders at top with question + 4 badges + verdict
- [ ] VIX and F&G badges derive status from real `useSentiment()` data
- [ ] Each data module is wrapped in a titled section with summary
- [ ] MacroNarrative heading is visually larger than section titles
- [ ] Existing data modules still render correctly
- [ ] `npm run build` succeeds

---

### PR 5: Watchlist page
**Goal**: Functional watchlist with real CRUD, batch prices, summary fallback.

**Files touched**:
- Create `src/shared/api/watchlist.ts`
- Create `src/shared/hooks/useWatchlist.ts`
- Create `src/features/watchlist/WatchlistPage.tsx` + `.module.css`
- Create `src/features/watchlist/WatchlistTable.tsx` + `.module.css`
- Create `src/features/watchlist/AddAssetModal.tsx` + `.module.css`
- Create `src/features/watchlist/WatchlistContextPanel.tsx` + `.module.css`
- Modify `src/shared/api/types.ts` (add watchlist types)
- Modify `src/app/routes.tsx` (swap placeholder)
- Delete `src/features/watchlist/WatchlistPlaceholder.tsx` + `.module.css`

**Risk level**: Medium — new API surface, requires auth for testing.

**Verification**:
- [ ] Empty state renders for zero-item watchlist
- [ ] Add modal searches and adds via real API
- [ ] Table shows symbol, name, badge, price, change%
- [ ] Summary follows fallback: fresh history summary → template → empty
- [ ] Click row → navigates to Research
- [ ] Remove works via real API
- [ ] No P&L, no positions, no "Run analysis" per row
- [ ] Unauthenticated state handled gracefully (empty list or login prompt)
- [ ] `npm run build` succeeds

---

### PR 6: Global search overlay
**Goal**: `/` keyboard search reusing Phase 1 infra.

**Files touched**:
- Create `src/shared/components/SearchOverlay.tsx` + `.module.css`
- Modify `src/app/layouts/MacroStrip.tsx` (add search button, keydown listener, update NavLink `to`)
- Modify `src/app/layouts/MacroStrip.module.css` (search trigger styles)

**Risk level**: Low — additive overlay. MacroStrip gets a button + event listener.

**Verification**:
- [ ] `/` key opens overlay on Home, Macro, Watchlist pages
- [ ] `/` key does NOT open overlay when an input element is focused
- [ ] `Escape` closes overlay
- [ ] Search uses same `useSymbolSearch` hook as Research AssetEntry (confirmed by import path)
- [ ] Recent searches display from same `useRecentSymbols` hook (confirmed by import path)
- [ ] Selection navigates to `/research/:market/:symbol` and closes overlay
- [ ] MacroStrip search icon triggers overlay
- [ ] MacroStrip "研究" link now points to `/research`
- [ ] `npm run build` succeeds

---

### PR 7: Design system tightening
**Goal**: Token-first rollout, shared component variants, page CSS adoption, empty-state cleanup.

**Files touched** (in execution order):
1. Modify `src/shared/styles/tokens.css` (add `--text-body`)
2. Modify `src/shared/components/DataCard.tsx` + `.module.css` (add `elevated` prop)
3. Modify `src/app/layouts/MacroStrip.tsx` + `.module.css` (VIX/F&G tinting)
4. Modify `src/features/home/HomePage.module.css` (`--text-body` adoption)
5. Modify `src/features/home/BriefingBlock.module.css` (`--text-body`)
6. Modify `src/features/research/analysis/AISynthesis.module.css` (`--text-body`)
7. Modify `src/features/macro/MacroNarrative.module.css` (`--text-body`)
8. Modify `src/features/research/ResearchContextPanel.tsx` (`elevated` on first card, collapse empty sections)
9. Modify `src/features/watchlist/WatchlistContextPanel.tsx` (`elevated` on first card)
10. Modify `src/features/macro/MacroContextPanel.tsx` (`elevated` on first card, collapse empty)
11. Modify `src/features/home/HomeContextPanel.tsx` (collapse empty CalendarWidget)

**Risk level**: Low — CSS changes + minor component prop additions.

**Verification**:
- [ ] `--text-body` renders visibly brighter than `--text-secondary` on Home briefing text
- [ ] `--text-body` renders on Research AISynthesis narrative and section bodies
- [ ] VIX > 20 in MacroStrip shows tinted background on VIX item
- [ ] F&G extreme values show tinted background
- [ ] First DataCard in Research context panel has elevated background
- [ ] No "暂无数据" visible when data array is empty (section collapses instead)
- [ ] Visual check on all four pages: no regressions
- [ ] `npm run build` succeeds

---

## 9. Non-Negotiables During Build

1. **Never bypass `mapToResearchDisplay`.** No component imports `RawAnalysisResponse` and renders fields. All Research UI reads from `ResearchDisplay` type only. The adapter in `src/shared/api/researchAdapter.ts` is the sole bridge.

2. **Never make Chart Lab the default view.** The segmented control in `AssetHeader` defaults to "研究概览" active. "技术图表" stays disabled with "即将推出" until its dedicated implementation PR.

3. **Never add portfolio fields to Watchlist.** No `quantity`, `entry_price`, `cost_basis`, `pnl`, `target_price` in types, API calls, or UI. The `qd_watchlist` table schema (user_id, market, symbol, name) is the structural guardrail.

4. **Never let the right rail become an infinite feed.** Maximum 5 DataCards per context panel per page. Adding a sixth requires removing or collapsing one.

5. **Never auto-trigger AI analysis on page load.** Analysis is user-initiated via explicit button click. No `useEffect(() => runAnalysis(), [])`.

6. **Never scatter fake data in components.** All mock data lives in `src/shared/mocks/`. Components consume mocks via imports. No hardcoded fake arrays or objects inside `.tsx` files.

7. **Never create separate layout structures for Stocks vs Crypto.** Same `ResearchPage`, same `AssetHeader`, same `AISynthesis`, same `ResearchContextPanel`. Market-specific differences are conditional renders within the same components, gated by the `market` param.

8. **Never damage route/layout consistency while adding `/research`.** The bare `/research` route must be a flat sibling under `AppShell`'s children, matching the existing pattern. No nested layout routes, no new `Outlet` layers, no route hierarchy changes.

9. **Never duplicate search infrastructure between Phase 1 and Phase 5.** `SearchOverlay` imports `useSymbolSearch` and `useRecentSymbols` from `src/shared/hooks/` — the exact modules created in PR 1. No parallel implementation, no separate types, no separate localStorage keys.

10. **Never trigger LLM calls from Watchlist.** Row summaries use the deterministic fallback: fresh analysis history (< 24h) → template sentence from price data → empty string. No mutation, no background generation, no per-row action buttons.
