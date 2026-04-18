# Quant-Brew Product Constitution

This document is a binding constraint system. It is not a vision deck. It is not aspirational. Every section defines a rule that implementation must satisfy. If a PR, design, or feature proposal violates this document, it is wrong by default and requires an explicit constitutional amendment with documented rationale.

---

## 1. Product North Star

**One-sentence definition**: Quant-Brew is a Chinese-language AI research reader for US equities that synthesizes macro context, stock intelligence, and financial news into a narrative reading experience.

**Who it is for**: Chinese-speaking investors and analysts who follow US equity markets and want a single product that replaces the morning ritual of checking 6 tabs across Bloomberg, Xueqiu, Seeking Alpha, Twitter, earnings calendars, and macro dashboards.

**What user problem it solves**: The daily information problem is not "I can't find data" — it's "I can't synthesize data fast enough to know what matters today." Quant-Brew solves the synthesis gap: it tells you what happened, what changed, why it matters, and what context surrounds a specific stock or macro event — before you've had to assemble the picture yourself.

**What the user should feel**: Upon opening Quant-Brew, the user should feel the same cognitive relief as opening a well-edited morning newspaper written by someone who deeply understands their portfolio interests. Not anxiety about missed trades. Not pressure to act. Clarity about what the market is saying today, and confidence that nothing important was missed.

---

## 2. What Quant-Brew Is Not

These are not suggestions. These are permanent exclusions from the product's identity.

1. **Not a trading terminal.** There is no order entry. There is no "place trade" button. There is no execution flow. If a user asks "how do I buy this stock," the product does not answer that question.

2. **Not a bot operations console.** There are no running strategies. There is no start/stop lifecycle. There are no bot cards, bot status badges, or bot performance dashboards.

3. **Not a strategy IDE.** There is no code editor for writing Python trading strategies. There is no indicator compiler. There is no "generate strategy from natural language" feature on the main product surface.

4. **Not a backtesting-first product.** Backtesting does not appear in the primary navigation. It does not appear on the homepage. It does not appear in any onboarding flow.

5. **Not a P&L tracker.** There is no profit/loss display. There are no portfolio returns. There are no equity curves as a primary UI element. Watchlists show research context, not position performance.

6. **Not a crypto product.** The product does not default to crypto symbols, crypto exchanges, or crypto terminology. Crypto data sources may exist in the backend for infrastructure reasons, but they do not surface in Quant-Brew's UI, navigation, search defaults, or onboarding.

7. **Not a signal service.** The product does not say "BUY," "SELL," or "HOLD." AI outputs use research language: "bullish factors include," "risk considerations are," "consensus expectations suggest." The product does not generate actionable trading recommendations.

8. **Not a feature-sprawl admin dashboard.** There is no settings page with 50 toggles. There is no admin panel visible to regular users. Configuration complexity lives behind a single, minimal settings surface.

9. **Not an LLM chat toy.** There is no general-purpose chat interface where users talk to an AI about anything. AI is embedded in specific product surfaces (briefing synthesis, research interpretation, context enrichment) — it does not float as an open-ended conversation.

10. **Not a multi-asset-class product at launch.** Quant-Brew covers US equities. Not forex. Not futures. Not prediction markets. Not A-shares (unless the user's watchlist includes a dual-listed stock). Scope discipline is survival discipline.

11. **Not a real-time data terminal.** Quant-Brew is not competing with Bloomberg Terminal or Refinitiv on tick-level data speed. It delivers narrative and context on a cadence appropriate for research — intraday updates, not sub-second feeds.

12. **Not an English-first product with Chinese translation.** The Chinese copy is the primary artifact. English is secondary. AI prompts, editorial templates, and UX copy are written in Chinese first, not translated from English.

---

## 3. Homepage Constitution

### What the homepage exists to do

The homepage exists to answer one question: **"What should I know about the market right now?"**

It is a reading surface. The user opens it, reads downward, and leaves informed. It is not a launchpad for features. It is not a navigation hub. It is not a metrics dashboard.

### The single primary hero element

**Today's market briefing.** A structured, AI-synthesized narrative that covers:
- What moved overnight / today
- Why it moved (macro drivers, earnings, news events)
- What the current market tone is (risk-on / risk-off / rotation / uncertain)
- 2-3 stocks or themes that demand attention today

This briefing occupies the left column's full first screen. It is not a card. It is not a widget. It is the page.

### Secondary elements

- **Top strip**: persistent macro indicators (S&P 500, Nasdaq, DXY, VIX, US 10Y yield, Fear & Greed). These are always visible, always current, always compact. One row. No interactivity beyond hover for detail.
- **Right column**: context panel showing signals related to the briefing's content — today's earnings calendar, sector heatmap thumbnail, notable news links, AI-surfaced watchlist alerts.
- **Below the fold on the left**: previous briefings (evening, yesterday morning) as a scrollable archive.

### What must never appear on the first screen

- Strategy count, bot count, or any execution metric
- Order entry or trade buttons
- Code editors or IDE-like components
- P&L, portfolio value, or returns
- Generic "Welcome back, [user]" hero with no content
- An empty state that asks the user to "set up" something before the product works
- A loading spinner that lasts more than 2 seconds with no content visible

### What is always global (visible on every page)

- Top macro strip (indices, VIX, DXY, yields)
- Primary navigation (Home, Macro, Research, Watchlist)
- Search bar (symbol search, not feature search)

### What is always contextual (changes with the page)

- Right column content
- Breadcrumb / page-specific header
- AI interpretation blocks

---

## 4. IA Guardrails

### Home

**Job**: Deliver today's market story. Answer "what happened and what matters."

**Attention type**: Lean-back reading. The user scrolls through a narrative. Interaction is minimal — tapping a mentioned stock opens its research page; tapping a macro indicator drills into the Macro view. That's it.

**Excluded from Home**:
- Any form of "create" action (strategy, indicator, alert configuration)
- Any table with more than 5 columns
- Any chart that is the focal element (charts support the narrative, they don't replace it)
- Settings, admin, billing, or account management
- Watchlist management (that belongs in Watchlist)

### Macro

**Job**: Provide the full macro picture. Answer "what is the market environment right now."

**Attention type**: Dashboard scanning with narrative anchors. The user glances at indicators, reads a macro synthesis paragraph, checks the economic calendar, scans the sector heatmap. It is more visual than Home but still reading-dominated.

**Content structure**:
- Lead element: AI-synthesized macro narrative (2-3 paragraphs) covering regime, key drivers, and notable divergences
- Supporting elements: index performance strip, yield curve visualization, VIX + DXY + Fear & Greed gauges, sector heatmap, commodity snapshot, economic calendar
- Each data visualization is captioned with a one-line AI-generated observation ("VIX declined to 14.8, reflecting reduced hedging demand ahead of earnings season")

**Excluded from Macro**:
- Per-stock analysis (that's Research)
- Any trading-action element
- Crypto-specific indicators (funding rates, open interest, on-chain flows)
- Strategy templates or backtest prompts
- Raw data tables without narrative framing

### Stock Research

**Job**: Provide deep, synthesized intelligence on a single US equity. Answer "what do I need to know about this stock."

**Attention type**: Deep reading. The user arrived here because they clicked a stock from Home, Watchlist, or Search. They expect a research report, not a trading workspace.

**Content structure (left column, in order)**:
1. Company header (name, ticker, sector, price, daily change — compact)
2. AI research synthesis (3-5 paragraphs: what the stock does, recent performance context, earnings situation, key risks and catalysts)
3. Financial highlights (revenue, EPS, margins — last 4 quarters, presented as a readable table with AI commentary)
4. Recent news and events (sourced, dated, with one-line AI summary per item)
5. Price chart (KLineChart, daily default, minimally interactive — not the hero)

**Content structure (right column, contextual)**:
- Related stocks / sector peers
- Upcoming earnings or events for this ticker
- AI-identified similar patterns from analysis memory
- Analyst consensus snapshot (if available)
- Source attribution for all AI-generated content

**Excluded from Stock Research**:
- "Buy this stock" or any recommendation language
- Order placement, position size calculator, or quick-trade
- Indicator overlay configuration or technical analysis IDE
- Strategy generation ("create a strategy for AAPL")
- Backtest results for this stock

### Watchlist

**Job**: Let the user track their stocks of interest and see summary intelligence across them. Answer "is anything happening with the stocks I care about."

**Attention type**: Scanning with selective deep-dive. The user scrolls a compact list, notices highlights, and clicks through to Research pages.

**Content structure**:
- A clean list of watched symbols, each showing: ticker, name, price, daily change, one-line AI summary of today's status ("Earnings beat expectations; guidance raised; stock +4.2% after-hours")
- Grouping by user-defined categories (optional, not required for MVP)
- Bulk "morning scan" — a combined briefing for the user's watchlist (AI-generated, cached)

**Excluded from Watchlist**:
- Position size, entry price, or P&L columns
- "Start bot" or "Run strategy" actions per symbol
- Alert configuration beyond basic price alerts (no indicator-trigger alerts)
- Drag-and-drop reordering complexity

---

## 5. Left vs Right Rulebook

### Top Strip

**What belongs here**: Macro heartbeat data only. These are numbers that every market participant checks first: S&P 500 level + change, Nasdaq level + change, DXY, VIX, US 10Y yield, and Fear & Greed index. Maximum 6-8 indicators. Each shows: current value, daily change (% or absolute as appropriate), and a directional color indicator.

**What never belongs here**: Stock-specific data, user-specific data (portfolio, watchlist alerts), any interactive element beyond hover-to-expand, AI-generated text, navigation beyond click-to-Macro.

**Allowed interactions**: Hover to see intraday sparkline or detail popup. Click any indicator to navigate to Macro view. Nothing else.

**Content density**: Maximum density. This strip is a financial ticker — tight, monospaced numbers, no whitespace waste. It is the one place where terminal-style density is correct.

### Left Narrative Column

**What belongs here**: All primary content the user came to read. Briefings, research reports, macro narratives, financial statement interpretations, news summaries. This is the editorial column. Content flows vertically. Sections have clear headlines. Paragraphs are readable.

**What never belongs here**:
- Interactive configuration (forms, toggles, dropdowns that change the page's data)
- Data tables wider than 4 columns
- Charts that occupy more than 40% of the viewport height
- Action buttons that execute side effects (trade, start bot, generate code)
- Raw JSON, raw API output, or unformatted data dumps

**Allowed interactions**: Scroll. Click a stock mention to navigate to its Research page. Expand/collapse sections. Bookmark a briefing. Share a research note. Copy a text excerpt. That's all.

**Content density**: Editorial density. Optimized for reading speed and comprehension in Chinese. Line height no less than 1.6 for body text. Paragraph spacing no less than 16px. Headlines are clearly distinguished from body. Financial figures within narrative text use tabular/monospace alignment but are embedded in prose, not isolated in grids.

### Right Context Column

**What belongs here**: Supporting information that enriches whatever the user is reading in the left column. This column is **reactive** — its content changes based on the left column's focus. On the Home page, it shows today's earnings calendar, sector heatmap, and watchlist alerts. On a Stock Research page, it shows related stocks, upcoming events, AI provenance, and source links.

**What never belongs here**:
- Primary narrative content (briefings, research reports)
- Full-width charts or visualizations that compete with the left column
- Navigation or menus
- Settings or configuration
- Chat interfaces or AI conversation threads

**Allowed interactions**: Click to expand a context card. Click a related stock to navigate. Click a source link to open external content. Collapse individual context sections. Nothing that modifies data.

**Content density**: Moderate-high, card-based. Each context block is a compact card with a headline, 1-3 lines of detail, and optional expand. Cards stack vertically. No horizontal scrolling. No tabs within the right column — everything is visible in a single scroll.

---

## 6. AI Behavior Rules

### Where AI is visible

AI-generated content appears in these surfaces only:
- Market briefing body text (Home)
- Macro narrative paragraphs (Macro)
- Stock research synthesis (Stock Research, left column)
- Financial statement commentary (Stock Research, left column)
- One-line status summaries per watchlist item (Watchlist)
- Context panel observations (right column, brief captions on data cards)

Every AI-generated block carries a subtle but unambiguous indicator — a small label, consistent across the product — such as "AI 综述" (AI Synthesis) or "AI 解读" (AI Interpretation). This is not optional.

### Where AI must stay in the background

AI powers these features invisibly:
- News filtering and relevance scoring (user sees curated news, not "AI picked this")
- Context panel ranking (which related stocks or signals show first)
- Briefing topic selection (which stocks/themes get featured)
- Search result enrichment

In these cases, there is no "AI" label. The product simply works well.

### How AI summaries should be framed

AI outputs in Quant-Brew adopt the voice of **a senior research analyst writing an internal morning note** — not a chatbot, not a teacher, not a hype machine.

Rules for AI summary tone:
- **State facts before interpretations.** "Tesla reported Q3 revenue of $25.2B, beating consensus by 3%. Automotive margins compressed to 17.9% from 19.2% last quarter." — facts first, then: "The margin compression likely reflects aggressive pricing in China, a trend management signaled would continue."
- **Never use imperative action language.** Not "Buy AAPL" or "Consider selling." Instead: "Bullish factors include..." / "Key risks to monitor are..." / "The market appears to be pricing in..."
- **Acknowledge uncertainty.** "Consensus expects..." / "Based on available data..." / "If the Fed maintains its current stance..." — never assert prediction as fact.
- **Use Chinese financial register.** Not casual internet Chinese. Not machine-translated English. Use the tone of Caixin or Zhongjin (CICC) research notes: precise, structured, professional, not dry.

### How provenance should appear

Every AI-synthesized paragraph has an expandable provenance footer. When collapsed, it shows a count: "基于 4 个数据源" (Based on 4 data sources). When expanded:
- Data sources used (e.g., "yfinance price data," "Finnhub company profile," "web search: Reuters, CNBC")
- LLM model used (e.g., "DeepSeek-V3")
- Generation timestamp
- Confidence note if consensus/ensemble was used

Provenance is not Phase 1. But the AI output schema must include provenance metadata from day one so it can be surfaced later without re-architecting.

### What AI must never pretend to know

- Future prices or price targets ("AAPL will reach $200" is banned)
- Trading recommendations ("you should buy/sell" is banned)
- Certainty about causation ("the stock dropped because of X" — use "the drop coincided with" or "market participants attributed the decline to")
- Insider information or non-public data
- Real-time data it does not actually have (if the data is 15 minutes delayed, it must not imply it's live)

### Chinese-language financial UX tone

- Use 简体中文 as the default
- Financial terms use standard mainland Chinese financial vocabulary (市盈率 not 本益比, 美联储 not 聯準會, 财报 not 財報)
- Numbers use standard formatting: percentages with % sign, currency with $ prefix, large numbers in 万/亿 notation where natural
- Do not over-translate English financial terms that are commonly used as-is in Chinese financial writing (e.g., "VIX" stays "VIX," "S&P 500" stays "标普500", "EPS" can stay "EPS" with 每股收益 on first use)

---

## 7. MVP Scope Discipline

### Must ship in MVP

1. **Homepage with morning briefing** — AI-generated market narrative, live macro strip, readable layout
2. **Macro view** — global indices, VIX, DXY, yields, Fear & Greed, sector heatmap, economic calendar, AI macro narrative
3. **Stock Research page** — company profile, AI research synthesis, price chart, recent news, financial highlights for US equities
4. **Watchlist** — add/remove symbols, per-symbol one-line AI summary, click-through to Research
5. **Symbol search** — search US stock tickers and names, navigate to Research page
6. **User auth** — login, register, JWT session (reuse existing backend)
7. **Chinese-language AI output** — all briefings and research summaries in zh-CN
8. **Top macro strip** — persistent, compact, live-updating indicators
9. **Left-right layout shell** — narrative left, context right, on every page
10. **Right context panel (basic)** — related news and upcoming events for the current focus

### Nice to have later

- Evening briefing (distinct from morning)
- Earnings transcript summarization
- Financial statement period-over-period comparison with AI commentary
- AI provenance display (expandable source attribution)
- Reading history and bookmarks
- Watchlist grouping / custom categories
- Briefing push notification via Telegram / email
- Sector-level research pages
- Analyst consensus data integration

### Explicitly postponed

- Any form of backtesting UI (keep backend capability, do not build frontend for it)
- Strategy or indicator code generation
- Community / marketplace features
- Multi-user admin panel (keep backend, don't build Quant-Brew-specific frontend)
- Billing / subscription / credits UI
- Mobile-native app (Capacitor)
- HK stock or A-share research (US equities only for MVP)
- Dark mode as a user toggle (ship one polished theme, add toggle later)

### Explicitly excluded (not postponed — will not be built)

- Order entry, trade execution, or broker connectivity
- Bot/strategy start-stop-monitor lifecycle
- Quick trade panel
- Exchange credential management
- Crypto exchange adapters in the UI
- Polymarket analysis
- Forex / futures research
- Indicator IDE or code editor
- P&L tracking, portfolio returns, equity curves
- General-purpose AI chat interface
- USDT payment flow

---

## 8. Design-System Behavior Constraints

### Density vs Readability

Quant-Brew has **two density zones**, and they must not bleed into each other:

- **Terminal density**: the top macro strip ONLY. Tight numbers, monospaced, minimal spacing. This is where the product acknowledges that finance people want numbers at a glance.
- **Editorial density**: everything else. Body text optimized for sustained Chinese reading. This means: generous line height (1.6-1.8), clear paragraph separation, headline hierarchy that lets you skim, and no more than 60-70 characters per line in the narrative column.

The error to avoid: applying terminal density to the briefing body, or applying editorial spacing to the macro strip. These two zones serve different cognitive modes.

### Typography Roles

Four typographic roles, each with a distinct voice:

1. **Headlines** (briefing title, section headers, stock name + ticker): Bold, distinctive, slightly larger. Must feel authoritative, not loud. Think newspaper masthead, not SaaS hero banner.
2. **Narrative body** (briefing text, AI synthesis, financial commentary): The reading font. Optimized for Chinese readability. Regular weight, comfortable size (16px minimum), generous spacing.
3. **Data** (prices, percentages, financial figures, macro indicators): Tabular or monospaced. Must align vertically when stacked. Must be visually distinct from narrative body so numbers pop.
4. **Metadata** (timestamps, source labels, AI provenance tags, secondary captions): Smaller, lighter weight or muted color. Present but not competing for attention.

Do not use more than 2 font families total. One for narrative + headlines (a quality Chinese-friendly sans-serif or serif), one for data (monospace or tabular figures variant).

### Color Semantics

Quant-Brew uses **archival color semantics**, not trading color semantics.

- **Red/Green are used ONLY for price direction** (up/down indicators on specific numbers). They appear in the macro strip, in stock price changes, and in financial data — nowhere else.
- **The primary background is warm or neutral**, not the cold blue-black of a trading terminal. Think aged paper, warm gray, or muted cream — not Bloomberg black.
- **Accent color** is used sparingly for navigation state, links, and interactive affordances. One accent color. Not gradients. Not multi-color schemes.
- **AI-generated content markers** use a single, consistent, subtle treatment — not colored badges. A thin left-border, a small icon, or a typographic label. It should feel like an editorial attribution, not a system alert.
- **The heatmap and data visualizations** are the only places with multi-color palettes, and those palettes should feel sophisticated — muted gradients, not saturated traffic-light colors.

### Archival / Editorial Feeling vs Terminal Feeling

The product's visual identity draws from: the Monocle magazine, the Caixin app, the Financial Times web edition, and the information design of Edward Tufte — not from TradingView, Bloomberg Terminal, or crypto exchange UIs.

Specific markers of the right feeling:
- Whitespace is generous and intentional, not wasted
- Images and visualizations have captions
- Sections have clear editorial structure (headline, lead, body, supporting data)
- The page feels like it was composed, not assembled from widgets
- Typography has rhythm — you can tell where a section starts and ends without a divider line

Specific markers of "fake luxury" that must be rejected:
- Gratuitous blur / glassmorphism effects
- Dark mode with neon accent colors
- Oversized hero images with no information value
- Animated gradients or particle effects
- Gold / metallic color schemes
- Drop shadows deeper than 4px
- Any use of the word "premium" in the UI copy
- Skeleton screens that persist for more than 1.5 seconds
- Card borders with rounded corners > 12px

---

## 9. Product Smell Tests

These are pass/fail checks. If any test fails, the implementation has drifted from the product's identity. Apply them at every design review, PR review, and milestone check.

1. **The Newspaper Test.** Show the homepage to someone for 10 seconds, then ask what the product does. If they say "trading" or "buying stocks," the design failed. They should say "market news" or "stock research."

2. **The Action-Button Test.** Count all buttons on the homepage that cause a side effect (not navigation). If there are more than two (e.g., "bookmark" and "refresh briefing"), the page has too many actions.

3. **The BUY/SELL Test.** Search the entire frontend codebase for the strings "买入," "卖出," "BUY," "SELL," "HOLD," "做多," "做空." If any appear outside of quoted analyst consensus text, the AI tone is contaminated.

4. **The Reading-Time Test.** A new user should be able to read the homepage briefing within 3 minutes of opening the product. If onboarding, configuration, or empty states block this, the time-to-value is broken.

5. **The Context-Panel Test.** Navigate to any Stock Research page. The right column must show content relevant to that specific stock within 1 second of page load. If it shows generic content or is empty, the contextual architecture failed.

6. **The Chinese-Native Test.** Show any AI-generated paragraph to a native Chinese-speaking financial professional. If they identify it as "machine-translated" or "AI-written" within the first sentence, the prompt engineering failed.

7. **The Macro-Strip Test.** Cover the rest of the page and look only at the top strip. You should be able to determine the market's overall tone (risk-on, risk-off, volatile) within 2 seconds. If you can't, the strip is showing the wrong indicators or too many.

8. **The No-Empty-State Test.** A user who just registered and has zero watchlist items should still see a full homepage briefing and a working Macro page. The product delivers value before the user configures anything.

9. **The Screenshot Test.** Take a screenshot of any page and post it on Twitter / Xiaohongshu without context. If commenters call it a "trading platform" or "quantitative tool," the visual identity is wrong. They should call it a "market intelligence app" or "financial research reader."

10. **The Five-Tab Test.** List every item in the primary navigation. If there are more than 5 items (Home, Macro, Research, Watchlist, Settings), the IA has sprawled.

11. **The Right-Column Independence Test.** The left column must be fully readable and useful even if the right column fails to load. If removing the right column breaks the reading experience, the content architecture is too dependent on context.

12. **The Return-Visit Test.** A user who visited yesterday should see new content today — a new briefing, updated research summaries, fresh news. If the page looks identical to yesterday, the content pipeline is broken.

13. **The Grandmother Test.** Show the Stock Research page for AAPL to someone who doesn't trade stocks but reads financial news casually. They should be able to understand the AI synthesis paragraph. If it requires knowledge of technical indicators, trading strategies, or order types to comprehend, the language is wrong.

14. **The Terminal Drift Test.** Count the total number of numerical data points visible on any single page without scrolling. If it exceeds 40 (outside the macro strip), the page has drifted toward terminal density.

---

## 10. Final Non-Negotiables

These ten rules override all other implementation decisions. They cannot be violated by scope expansion, deadline pressure, stakeholder requests, or technical convenience.

1. **The homepage is a briefing, not a dashboard.** The first thing the user sees is a narrative about today's market. Not cards. Not widgets. Not metrics. A story.

2. **No execution anywhere.** There is no code path in the Quant-Brew frontend that places an order, starts a bot, or connects to a broker. This is not a "disabled feature." The feature does not exist.

3. **AI speaks as a research analyst, never as a trading advisor.** Every AI-generated string in the product uses research language. There is no mode, setting, or hidden flag that switches AI output to recommendation language.

4. **Chinese is the primary language, not a translation.** All AI prompt templates, editorial templates, UI copy, and error messages are authored in Chinese first. English versions, if they exist, are derived from the Chinese, not the other way around.

5. **Left reads, right supports.** The left column is for narrative content the user reads linearly. The right column is for contextual reference material the user glances at. These roles never reverse. A chart never appears only in the right column. A news list never appears only in the left column.

6. **The product works before the user configures anything.** A new account with zero watchlist items, zero preferences, and zero history sees a full market briefing on first load. Value before setup.

7. **Macro context is omnipresent.** The top strip is visible on every authenticated page. The user never loses sight of the market's overall state. This strip is not collapsible, not dismissible, not configurable.

8. **AI provenance metadata is always captured, even before it's displayed.** Every AI-generated content block stores: model used, data sources consumed, generation timestamp, and confidence/consensus metadata. Displaying this is a Phase 2+ concern. Capturing it is a Phase 1 requirement.

9. **The navigation has four primary items.** Home, Macro, Research, Watchlist. A fifth item (Settings or account) may exist as a secondary icon. Any proposal to add a sixth primary navigation item requires a constitutional amendment.

10. **Quant-Brew is defined by what it refuses to show, not by what it can show.** The value of the product is curation and synthesis. Every feature proposal must answer: "Does this help the user understand the market better?" If the answer is "No, but it helps them act on the market" — it is rejected.
