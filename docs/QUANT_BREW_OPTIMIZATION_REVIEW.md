# Quant-Brew Optimization Review

## 1. Executive Judgment

The current framework is structurally sound. The four-tab IA, the Research layer hierarchy, the adapter firewall, and the design system direction are all correct. Nothing needs to be replaced.

But the framework has three categories of weakness that will cause problems during continued implementation:

1. **Home is structurally underdefined.** It is the most important page for first impression and daily return, yet it currently has the least architectural rigor. The briefing-as-flat-list approach misses the information sequencing insight from the MarketBrew reference: direction first, context second, events third, judgment last. Without fixing this, Home will feel like a blog post instead of a market intelligence product.

2. **Macro lacks a problem-framing anchor.** It is currently a list of data modules stacked vertically. The MarketBrew reference reveals the critical missing ingredient: a hero-level "question framework" that gives all the data modules a reason to exist. Without this, Macro becomes a data wall — functional but not judgment-useful.

3. **Research has a pre-generation gap.** When a user lands on `/research/USStock/AAPL` for the first time, they see a mostly empty page with a single button. The page provides almost zero value until they commit to a 15-30 second AI call. This is the product's single most dangerous UX hole, because Research is the center of value and the pre-generation state is where most first-time visits will land.

None of these require redesign. They require tightening within the existing structure.

---

## 2. What Is Already Correct and Should Not Change

These decisions are correct and must be preserved through all future implementation:

1. **Four-tab IA** (Home / Macro / Research / Watchlist) — clean separation, no overlap in job-to-be-done
2. **Research layer hierarchy** — asset entry → AI Analysis default → Chart Lab secondary
3. **Adapter firewall** (`mapToResearchDisplay`) — TypeScript-enforced stripping of trading fields
4. **Segmented control** for Research view toggle (not tabs, not routes) — correct mental model
5. **T-Layout shell** — MacroStrip + Main + Context, not a sidebar-nav app
6. **Main:Context ratio** at approximately 66:34 — main column is the story, context column is supporting intelligence
7. **Design token system** — dark restrained palette, gold accent, no border-radius, 1px borders, serif for editorial headings, monospace for data
8. **Density zones** — terminal (strip), compact (context), editorial (main) — correctly mapped to regions
9. **CSS Modules + custom properties** over Tailwind — correct for a typography-heavy product
10. **Stock + Crypto as asset contexts, not separate product worlds** — backend already handles this via `market` parameter
11. **No trading language in the UI** — enforced at the type level
12. **Chart Lab deferred with visible-but-disabled toggle** — signals future, doesn't block current

---

## 3. Top-Level IA Optimization

### Current state

| Page | Job | Risk |
|------|-----|------|
| Home | Morning/evening briefing | Underdefined — feels like a static blog prototype |
| Macro | Market environment framework | Lacks problem-framing anchor, risks becoming data wall |
| Research | Asset research workspace | Pre-generation state is too empty |
| Watchlist | Personalized scan layer | Correct scope but not yet built |

### What to fix

**Home and Macro overlap risk**: The current Home shows market overview data in the context column (calendar, news, heatmap). Macro shows similar data modules. If both pages show the same underlying data, users will wonder why they're separate.

**Resolution**: Home's job is *narrative* — "what happened and what matters." Macro's job is *framework* — "what is the market environment and should I be aggressive or defensive." Home uses data as decoration for the story. Macro uses data as evidence for a verdict. The data sources can overlap. The framing must not.

**Research has no asset entry layer**: Currently, the only way to reach Research is to type a URL or click a ticker chip from another page. There is no search, no recent-viewed, no discovery mechanism within Research itself. The spec defines this as Layer 1, but it doesn't exist in code yet.

**Resolution**: Research needs a no-symbol state that is useful — not just "选择标的" with a blank page. See Section 6.

---

## 4. Home Optimization

### What is correct

- Briefing as primary content
- Editorial reading flow in the main column
- Context column for calendar/news/heatmap
- Serif headings for editorial character
- AIMarker component to signal AI-generated content

### What is structurally weak

**Problem 1: No information sequencing.**

The current Home shows briefing sections as a flat list. The MarketBrew reference teaches a critical lesson: the page should follow a deliberate sequence — **direction → context → events → judgment**. Currently, all four briefing sections are rendered identically with no hierarchy between them. The first section about US stocks and the last section about "today's focus" carry equal visual weight.

**Fix**: Introduce a `HeadlineSummary` component at the very top of Home — one sentence that captures today's main story. This is the "narrative hook." It appears before the detailed briefing sections and tells the user whether to keep reading or jump straight to Macro/Research.

```
┌─────────────────────────────────────────┐
│ 早报 · 2026年4月18日                      │
│                                          │
│ ▎一句话主判断:                            │
│ "隔夜美股科技领涨，联储鸽派纪要推升降息预期" │
│                                          │
│ ─────────────────────────────            │
│ [美股期货快照: SPX +0.74% NDX +1.26%]    │
│                                          │
│ [详细叙事 section 1...]                   │
│ [详细叙事 section 2...]                   │
│ [今日关注...]                             │
│                                          │
│ [总结与展望]                              │
└─────────────────────────────────────────┘
```

**Problem 2: No market snapshot before narrative.**

The user currently goes from the title directly into paragraphs. They have no quick number-level orientation. The MarketBrew design solves this by placing a US Futures Snapshot (3 numbers + one-sentence explanation) between the headline and the detailed narrative.

**Fix**: Add a `MarketSnapshot` strip between the headline summary and the detailed briefing sections. Three to five key numbers: SPX, NDX, VIX, BTC, with one-line explanation. This uses real API data already available from `/api/global-market/overview`.

**Problem 3: No briefing archive.**

The spec mentions "collapsible archive of recent briefings." This doesn't exist yet but is important for the page to feel like a living content product rather than a single-shot prototype.

**Fix**: Add a collapsed `BriefingArchive` section at the bottom of Home showing "往期简报 (3)" with clickable titles. This can be static mock for now.

**Problem 4: Context column is too generic.**

The right column currently shows the same calendar and news widgets used on Macro. Home's context column should be tuned to support the briefing — specifically, it should show the stocks and events mentioned in today's briefing, not a generic news list.

**Fix**: Add a "今日提及标的" card at the top of Home's context column that collects all `mentioned_symbols` from the briefing sections and displays them as clickable ticker chips with current price. This connects the narrative to actionable research entry points.

### Recommended Home information sequence (top to bottom)

1. Report header: type (早报/晚报) + date
2. Headline summary: one-sentence main story
3. Market snapshot: 3-5 key numbers from live API
4. Detailed briefing sections (2-4 blocks)
5. Key movers strip
6. Summary/outlook section
7. Briefing archive (collapsed)

---

## 5. Macro Optimization

### What is correct

- Separate from Home (different job: framework vs narrative)
- Uses real API data for indices, sentiment, calendar, news, opportunities, heatmap
- Sentiment dashboard with actual VIX/DXY/US10Y gauges
- MacroNarrative as AI-generated synthesis block

### What is structurally weak

**Problem 1: Missing problem-framing hero.**

The MarketBrew Macro page opens with a brilliant design: *"四个维度回答一个问题：现在该进攻还是防守？"* This frames every subsequent data module as evidence for a verdict. The current Macro page opens with the AI narrative (mock text), then immediately drops into data grids. There is no framing.

**Fix**: Add a `MacroHeroPanel` component at the very top of the main column, above the narrative. It should contain:
- A framing question: "当前市场环境如何？该进攻还是防守？"
- Four dimension badges with one-word status each (流动性: 偏紧 / 经济: 韧性 / 通胀利率: 观察 / 情绪: 贪婪)
- A one-sentence master verdict derived from the AI narrative

This is the single highest-impact addition to the Macro page. It transforms Macro from a data page into a judgment page.

**Problem 2: No structural grouping of data modules.**

The current implementation stacks five components vertically: narrative → index grid → sentiment → commodities → calendar. There is no visual or conceptual grouping. The MarketBrew reference groups indicators into four thematic sections (liquidity, economy, inflation/rates, sentiment), each with a consistent internal structure: one-sentence summary → metric cards → chart → explanation.

**Fix**: Restructure the Macro main column into explicit sections with section headers and one-sentence summaries:

```
[MacroHeroPanel — question + verdict]
[MacroNarrative — AI synthesis, existing]
──────────────────
市场表现
[IndexGrid — existing]
──────────────────
风险情绪
[SentimentDashboard — existing, add one-sentence summary]
──────────────────
商品与汇率
[CommoditiesStrip — existing]
──────────────────
经济日历
[EconomicCalendar — existing]
```

Each section gets a `<h3>` section title with a one-sentence summary line below it. This costs almost nothing to implement but makes the page scannable.

**Problem 3: Narrative is buried.**

The AI narrative should be visually elevated. Currently it looks the same weight as the data sections. It should have more breathing room and a clearer "this is the main judgment" visual signal.

**Fix**: Give the narrative section 8px more bottom margin, a slightly larger heading, and ensure it is the first thing the eye sees below the hero panel. Do not hide it below data grids.

### Recommended Macro information sequence

1. MacroHeroPanel (question + four-dimension status + verdict)
2. MacroNarrative (AI synthesis — elevated)
3. 市场表现 section (IndexGrid)
4. 风险情绪 section (SentimentDashboard)
5. 商品与汇率 section (CommoditiesStrip)
6. 经济日历 section (EconomicCalendar)

Context column unchanged: heatmap, opportunities, forex, news.

---

## 6. Research Optimization

This is the most critical section.

### What is correct

- Route structure (`/research/:market/:symbol`)
- AssetHeader with market badge, price, segmented control
- Adapter firewall stripping trading fields
- AISynthesis with narrative + bullish/bearish + watch levels + trend outlook
- ResearchContextPanel with scores, indicators, levels, history, patterns, provenance
- Mutation-based analysis trigger (not auto-run on page load)

### What is structurally weak

**Problem 1: The pre-generation state is dangerously empty.**

When a user arrives at `/research/USStock/AAPL` for the first time, they see:
- AssetHeader (with price)
- A heading "开始研究 AAPL"
- A paragraph explaining what AI will do
- A button "生成 AI 研究分析"
- A hint about 15-30 seconds

The right column is completely empty because `analysis` is null.

This means 80%+ of the page is blank on first visit. For the product's center of gravity, this is unacceptable. The user gets zero value until they commit to a 15-30 second wait.

**Fix**: The pre-generation state must show useful data that doesn't require the AI call:

1. **Asset basic info**: Company profile, sector, industry, exchange — from `useStockName` (already fetched)
2. **Live price context**: 52-week range, day range, volume — from real-time data
3. **Quick market snapshot**: The MacroStrip already has VIX/SPX; show a 2-line "market context" sentence
4. **Recent analysis history**: from `useAnalysisHistory` — if the user or others have run analysis on this symbol before, show the most recent summary
5. **Right column pre-fill**: Key metrics card and watch levels card can be populated from cached analysis history even before a new analysis runs

The goal: when a user lands on the Research page before clicking "generate," they should already feel this is an intelligence page, not an empty form.

**Problem 2: No asset entry experience within Research.**

The current no-symbol state (`/research` without params) shows "选择标的 — 使用顶部搜索栏搜索股票或加密资产." This is dead-end UX.

The Research-stocks.md reference reveals the correct pattern: a **grouped discovery surface** with:
- Search bar (primary)
- Recently viewed assets (personalized shortcut)
- Sector/thematic groups (passive discovery)

**Fix**: When no symbol is selected, Research should show a lightweight asset entry page:

```
┌─────────────────────────────────┐
│ 个股研究                         │
│ [Search bar — 搜索标的]          │
│                                  │
│ 最近研究                         │
│ [AAPL] [NVDA] [BTC-USDT]        │
│                                  │
│ 热门赛道                         │
│ MAG 7 科技巨头                   │
│   AAPL  $198  +1.2%             │
│   MSFT  $420  +0.8%             │
│ AI 芯片 & 基础设施               │
│   NVDA  $880  +3.2%             │
│ ...                              │
└─────────────────────────────────┘
```

This uses:
- `/api/market/symbols/search` (real, for search)
- `/api/market/symbols/hot` (real, for popular tickers)
- `localStorage` (for recently viewed)
- Static sector group JSON (for thematic groups)

This is not a new product feature. It is the Layer 1 that the spec already defined but that code doesn't implement yet.

**Problem 3: No re-analysis capability after first result.**

Once the user sees the analysis result, there's no way to refresh or re-run it. The button disappears after the first successful analysis. If the market moves, the user is stuck with stale content.

**Fix**: Add a compact "重新分析" action in the AISynthesis footer (next to the model/time metadata). Not a big button — a subtle text link. The analysis result already shows timestamp; a refresh action is natural.

**Problem 4: Right context panel is too analysis-dependent.**

Currently, `ResearchContextPanel` receives `analysis` as a prop and renders nothing if analysis is null. This means the right column is blank pre-generation.

**Fix**: Split context panel into two layers:
- **Static context** (always available): key metrics from stock name/profile, recent analysis history, similar patterns
- **Analysis context** (available after generation): scores, indicators, watch levels, provenance

The static context should render even when `analysis` is null.

### Recommended Research page states

| State | Main column | Context column |
|-------|-------------|----------------|
| No symbol | Asset entry (search + recent + groups) | Empty or trending tickers |
| Symbol selected, no analysis | AssetHeader + company info + generate CTA + analysis history summary | Key metrics + recent history |
| Generating | AssetHeader + loading animation with steps | Key metrics (unchanged) |
| Analysis complete | AssetHeader + full AISynthesis | Scores + indicators + levels + patterns + provenance |
| Error | AssetHeader + error + retry | Key metrics (unchanged) |

---

## 7. Stocks vs Crypto Handling

### What is correct

- Single Research page for both, differentiated by `market` param
- Backend already routes correctly via `DataSourceFactory`
- Adapter layer works identically for both

### What needs tightening

**Crypto should not get stock-specific UI elements.** The current `AssetHeader` shows "sector" and "exchange" — these are stock concepts. For crypto, these fields will be null or misleading. The header should adapt:

| Field | Stocks | Crypto |
|-------|--------|--------|
| Sector | Show (Technology, Healthcare...) | Hide |
| Exchange | Show (NASDAQ, NYSE...) | Show as exchange name (Binance, Coinbase) |
| Market badge | 美股 | 加密 |
| Company name | Apple Inc. | Bitcoin (from symbol) |

**Crypto analysis has different fundamental data.** The backend provides `crypto_factors` (funding rates, OI, exchange netflow) instead of PE/PB/revenue. The `ResearchContextPanel` should detect market type and show the appropriate metrics card:
- Stocks: PE, PB, market cap, dividend yield, 52w range
- Crypto: 24h volume, funding rate, exchange netflow direction, dominance

This is a conditional render within the same component, not a separate page.

**Sector groups on the asset entry page must include crypto.** Don't make it a separate section called "加密货币" — instead, include it as a thematic group alongside stock sectors: "加密核心 — BTC, ETH, SOL — 追踪链上资金与宏观风险偏好联动."

---

## 8. Watchlist Optimization

### Correct scope

Watchlist is a personalized scan layer. Its job: let the user quickly scan their tracked assets and decide which one to research deeper. It is not portfolio management. It is not P&L tracking. It is not a to-do list.

### Optimization

**Maximum functionality for Watchlist:**
- Asset list with price + daily change + one-line AI summary
- Add/remove via search
- Click to navigate to Research
- Sort by change (most volatile first)
- Filter by market type (optional, lightweight)

**What must NOT be in Watchlist:**
- Position size / entry price / P&L
- Alert configuration UI
- Batch analysis trigger
- "Run analysis" button per row (this was in the original spec's context column — remove it)
- Broker connection
- Export functionality

**One-line AI summary strategy:**
1. If analysis exists in history (< 24h old): use summary field
2. If no recent analysis: template sentence — "{name} 今日{涨/跌} {changePercent}%"
3. Never trigger a new LLM call from the watchlist page

**Context column for Watchlist:**
- Top movers among watchlist items
- Upcoming events for watchlist companies (from calendar data)
- Sector distribution mini-summary
- Max 3 cards. No more.

---

## 9. Design-System Optimization

### What is correct

- Dark palette with `#1C1C1E` base
- Gold accent used sparingly (`#D4AF37`)
- No border-radius, 1px borders, no box-shadow
- Three density zones (terminal, compact, editorial)
- Noto Serif SC for editorial, JetBrains Mono for data, Inter for UI

### What needs tightening

**Problem 1: Risk of "premium emptiness."**

The current pages are visually clean but sometimes cross from "restrained" into "sparse." The Home page prototype has large areas of low-information space. The Research pre-generation state is mostly blank. This can feel like a product that hasn't been built yet, rather than a product that is deliberately restrained.

**Fix**: Restraint should mean high-signal density per pixel used, not low pixel usage. Every rendered element should carry information. If a section has nothing to show, collapse it entirely rather than showing a placeholder card with "暂无数据."

**Problem 2: MacroStrip is functional but not elevated.**

The MacroStrip currently renders tickers with label + value + change. It works but doesn't feel like the "market heartbeat" strip described in the design system. The gold accent is only on the brand mark.

**Fix**: Add subtle status coloring to VIX and F&G values in the strip. VIX above 20 could have a `--status-down` background tint. F&G in "extreme greed" could have a different tint. This is 1-2 lines of conditional CSS and transforms the strip from data display into sentiment display.

**Problem 3: Right column cards lack internal hierarchy.**

All cards in the context column use the same `DataCard` component with identical styling. There's no visual signal for which card is most important.

**Fix**: Allow the first card in the context column to have a slightly elevated background (`--bg-elevated` instead of `--bg-surface`). This costs nothing but creates a visual "hero card" that anchors the right column.

**Problem 4: Body text is entirely `--text-secondary` (#8E8E93).**

For narrative-heavy pages (Home, Research AI synthesis), the secondary text color is too gray for comfortable extended reading. Headings use `--text-primary` (near-white), but body paragraphs are medium gray.

**Fix**: Introduce a `--text-body` token at approximately `#B8B8BC` — brighter than secondary but not as stark as primary. Use this for editorial body text in the main column. Keep `--text-secondary` for compact density zones (context panel, data labels).

---

## 10. Product Drift Risks and Guardrails

### Risk 1: Home turns into a dashboard

**Why dangerous**: It's easier to add cards than to write narratives. When the briefing API doesn't exist yet, the temptation is to fill Home with market data widgets until it "feels useful." This turns Home into a second Macro page.

**Guardrail**: Home's main column must always be narrative-first. Data modules (market snapshot, key movers) are supporting the story, not replacing it. If the briefing mock is too thin, make the mock richer — don't fill the gap with dashboard cards.

### Risk 2: Macro turns into a terminal grid

**Why dangerous**: The Macro page has the most real API endpoints. Every new data source will want a card. Without a judgment-framework anchor, Macro becomes an ever-growing grid of numbers that nobody reads holistically.

**Guardrail**: The MacroHeroPanel (question + four dimensions + verdict) is the anchor. Every data module below it must explicitly serve one of the four dimensions. If a new data source can't be mapped to a dimension, it doesn't belong on Macro.

### Risk 3: Research becomes an "AI button" page

**Why dangerous**: If the pre-generation state remains mostly empty, the entire Research experience collapses to: click button → wait → read. The product's center of gravity becomes a single button with a loading spinner.

**Guardrail**: The pre-generation state must provide standalone value. Company profile, price context, analysis history, and key metrics must be visible before the user clicks "generate." Research should feel useful even if the user never triggers AI analysis.

### Risk 4: Chart Lab hijacks the product

**Why dangerous**: Chart Lab is technically impressive (KLineCharts, CodeMirror, indicator execution). It has strong "demo appeal." Developers will be tempted to make it shinier and more prominent because it's more fun to build than editorial text layouts.

**Guardrail**: Chart Lab is behind a view toggle. It never appears on first load. Its toggle says "技术图表" — it is a secondary lens. When it ships, it must not have more features or visual polish than the AI Analysis view.

### Risk 5: Right panel becomes too fat

**Why dangerous**: Every stakeholder will want "just one more card" in the context column. The column scrolls, so technically you can add unlimited cards.

**Guardrail**: Maximum 5 cards in the context column per page. If a sixth card is proposed, one existing card must be removed or collapsed. The context column is a curated sidebar, not an infinite feed.

### Risk 6: Watchlist grows into portfolio management

**Why dangerous**: Once users see their assets listed with prices, they'll ask for entry price, P&L, position sizing, alerts, broker sync. Each request sounds reasonable in isolation.

**Guardrail**: Watchlist has no concept of "position." The `qd_watchlist` table stores only (user_id, market, symbol, name). There is no `quantity`, `entry_price`, or `cost_basis` column. This structural absence is the guardrail.

### Risk 7: Crypto starts dominating product identity

**Why dangerous**: Crypto data updates faster, has more dramatic moves, and has flashy exchange-style UI patterns. If the product renders crypto data the same way Binance does, it'll feel like a crypto terminal with a stock tab.

**Guardrail**: Crypto and stocks use the same `AssetHeader`, the same `AISynthesis` layout, the same context panel structure. The only differences are in data content (different metrics for crypto vs stocks), never in layout, interaction patterns, or visual treatment.

---

## 11. Recommended Next Implementation Priorities

Based on the current state (AppShell + MacroStrip + Home prototype + Macro page + Research page with analysis), here is the concrete implementation sequence:

### Priority 1: Research pre-generation state (highest impact)

Fix the Research page's empty state problem. This is the most impactful single change because Research is the product's center of gravity and first-visit experience is currently broken.

**Scope**:
- Implement asset entry surface (search + recent + sector groups) for the no-symbol state
- Add company profile / basic info to the pre-analysis symbol state
- Pre-fill context panel with analysis history and key metrics before AI generation
- Add "重新分析" action in the post-analysis footer

### Priority 2: Home information sequencing

Upgrade the Home page from flat briefing list to structured narrative flow.

**Scope**:
- Add HeadlineSummary component (one-sentence hook)
- Add MarketSnapshot strip (3-5 numbers from live API)
- Reorder briefing sections with explicit visual hierarchy
- Add "今日提及标的" card in context column
- Add collapsed BriefingArchive section

### Priority 3: Macro hero panel

Add the problem-framing anchor that transforms Macro from data page to judgment page.

**Scope**:
- Implement MacroHeroPanel (question + four-dimension status + verdict)
- Add section headers with one-sentence summaries to existing data modules
- Visually elevate the AI narrative block

### Priority 4: Watchlist page

Build the real Watchlist page to complete the four-tab IA.

**Scope**:
- Asset table with price + change + one-line summary
- Add/remove via search (using existing `/api/market/symbols/search`)
- Click-to-navigate to Research
- Context panel: top movers + upcoming events
- No P&L. No positions. No alerts.

### Priority 5: Search overlay

Implement the global symbol search that lives in the MacroStrip. Currently the "研究" nav link hardcodes to `/research/USStock/AAPL`. Real search is required for the product to function.

**Scope**:
- SearchOverlay component triggered from MacroStrip
- Keyboard shortcut (`/`) activation
- Results from `/api/market/symbols/search`
- Navigate to `/research/:market/:symbol` on selection

### Priority 6: Design system refinements

Apply the design-system optimizations identified in Section 9.

**Scope**:
- Add `--text-body` token
- Conditional VIX/F&G coloring in MacroStrip
- Context column hero card elevation
- Review all pages for "premium emptiness" violations

---

## 12. Final Non-Negotiable Recommendations

1. **Research pre-generation state must provide standalone value.** An empty page with a button is not a research workspace. Fix this before building any new features.

2. **Home must follow the information sequence: direction → context → events → judgment.** Do not render briefing sections as a flat list.

3. **Macro must have a problem-framing hero.** "四个维度回答一个问题" is the single most valuable pattern from the MarketBrew reference. Implement it.

4. **The adapter firewall must never be bypassed.** No component should ever import `RawAnalysisResponse` and render fields directly. All rendering goes through `ResearchDisplay`.

5. **Chart Lab must ship after AI Analysis is polished, not before.** The temptation to build the technically impressive thing first is real. Resist it.

6. **Right column is support, never the story.** Maximum 5 cards. First card can be visually elevated. No cards with action buttons.

7. **Crypto and stocks must be visually identical in layout.** Different data, same structure. No exchange-style crypto treatment.

8. **Watchlist must never gain position-tracking fields.** The database schema is the guardrail. Do not add `quantity` or `entry_price` columns.

9. **Every mock must be isolated in `/shared/mocks/`.** No inline fake data scattered across components. When real APIs arrive, replace the mock file — not hunt through 20 components.

10. **Body text in editorial zones needs a dedicated `--text-body` color.** `--text-secondary` is too dim for extended reading. Fix this globally before writing more narrative content.
