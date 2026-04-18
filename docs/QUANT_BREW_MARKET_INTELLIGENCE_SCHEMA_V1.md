# Quant-Brew Shared Market Intelligence Schema v1

## 1. Purpose

Macro answers "现在更适合进攻还是防守？". Briefing answers "今天最该知道什么？". Both questions require the same underlying data: index levels, sentiment readings, yield movements, macro dimension assessments, and key movers. If Macro and Briefing evolve their own data pipelines independently, three problems become inevitable: (1) they will disagree on values within the same render cycle, (2) narrative text will reference numbers that don't match the cards next to it, (3) refactoring either page will require understanding two separate data-sourcing patterns. A single shared information layer defined now—before more UI is built on top—prevents all three.

## 2. Current Development Context

| Area | Status |
|---|---|
| Research shared infra (search, hooks, adapter) | Complete (PR 1–2) |
| Research pre-generation state | Complete (PR 2) |
| Home sequencing (HeadlineSummary, MarketSnapshot, Archive) | Complete (PR 3) |
| Macro page components (IndexGrid, SentimentDashboard, etc.) | Exist, consuming raw API hooks directly |
| Macro narrative | Mock only (`mockMacroNarrative`) |
| Briefing content | Mock only (`mockBriefing`) |
| Real API connections | `useMarketOverview`, `useSentiment`, `useHeatmap`, `useCalendar`, `useNews`, `useOpportunities` — all live |
| Normalized intelligence layer | Does not exist yet — this document defines it |

This task is schema and pipeline planning. It does not implement final API integrations or rewrite existing pages. It defines the contract that both consumers will adopt incrementally.

## 3. Shared Data Model

The top-level object is a **Market Intelligence Snapshot** — one immutable object per render cycle that both Macro and Briefing consume.

```typescript
interface MarketIntelligenceSnapshot {
  snapshot_id: string;                // deterministic: `mis-${date}-${session}`
  generated_at: string;               // ISO 8601
  market_session: MarketSession;
  macro: MacroDimensions;
  market_snapshot: MarketSnapshotData;
  key_movers: KeyMover[];
  events: UpcomingEvent[];
  narrative: NarrativeLayer;
}

type MarketSession = 'pre_market' | 'regular' | 'after_hours' | 'closed';
```

Every field in this object is derived from upstream data sources. No UI component reads raw API responses for intelligence-layer content — they read from this snapshot or from selectors over it.

## 4. Dimension Schema

The four macro dimensions share one normalized shape.

```typescript
interface MacroDimensions {
  liquidity: DimensionAssessment;
  economy: DimensionAssessment;
  inflation_rates: DimensionAssessment;
  sentiment: DimensionAssessment;
  overall_verdict: MacroVerdict;
}

interface DimensionAssessment {
  status: DimensionStatus;
  signal: DimensionSignal;
  change: DimensionChange;
  confidence: number;           // 0–100
  summary: string;              // 1–2 sentence Chinese narrative
  metrics: DimensionMetric[];   // 2–5 representative variables
}

interface DimensionMetric {
  key: string;                  // machine-readable: 'fed_funds_rate', 'vix', etc.
  label: string;                // display: '联邦基金利率', 'VIX' etc.
  value: number;
  unit: string;                 // '%', 'bps', 'index', '$'
  change: number | null;        // delta from prior session
  change_unit: string;          // '%', 'bps', 'pts'
  context: string;              // e.g. '年内低位', '历史均值附近'
}

type DimensionStatus = 'healthy' | 'neutral' | 'watch' | 'pressured';
type DimensionSignal = 'risk_supportive' | 'mixed' | 'risk_headwind' | 'defensive';
type DimensionChange = 'improving' | 'stable' | 'weakening';

interface MacroVerdict {
  stance: 'offensive' | 'cautious_offensive' | 'neutral' | 'cautious_defensive' | 'defensive';
  confidence: number;           // 0–100
  one_liner: string;            // e.g. "谨慎乐观，维持多头但不追涨"
  rationale: string;            // 2–3 sentence explanation
}
```

### Field definitions

| Field | Meaning |
|---|---|
| `status` | Current health of this dimension. `healthy` = supportive of risk assets. `pressured` = actively hostile. |
| `signal` | What this dimension implies for portfolio posture. Maps to the overall verdict. |
| `change` | Directional trend vs. prior session/week. Not a price delta — a regime-change indicator. |
| `confidence` | How reliable the assessment is given data availability and consistency. |
| `summary` | Human-readable Chinese sentence. Consumed directly by narrative and by Macro dimension cards. |
| `metrics` | The 2–5 specific numbers that justify the assessment. Never a FRED full-dump — always a curated set. |

### Metrics per dimension

| Dimension | Representative metrics |
|---|---|
| **liquidity** | Fed funds rate, 2Y yield, credit spread (IG OAS), financial conditions index |
| **economy** | PMI (ISM Manufacturing), jobless claims, retail sales MoM, GDP nowcast |
| **inflation_rates** | CPI YoY, PCE Core YoY, 10Y yield, 2s10s spread, breakeven inflation |
| **sentiment** | VIX, Fear & Greed, put/call ratio, AAII bull-bear spread |

## 5. Market Snapshot Schema

A compact, session-frozen set of headline numbers.

```typescript
interface MarketSnapshotData {
  timestamp: string;
  session: MarketSession;
  indices: SnapshotTicker[];
  rates: SnapshotTicker[];
  fx: SnapshotTicker[];
  crypto: SnapshotTicker[];
  commodities: SnapshotTicker[];
}

interface SnapshotTicker {
  key: string;           // 'spx', 'ndx', 'vix', 'dxy', 'us10y', 'btc', 'gold'
  label: string;         // 'S&P 500', 'Nasdaq', 'VIX', etc.
  value: number;
  change: number;        // absolute
  change_percent: number;
  unit: string;          // 'pts', '%', '$', 'index'
}
```

### Minimum required tickers

| Category | Tickers |
|---|---|
| **indices** | SPX, NDX, DJI |
| **rates** | US10Y, US2Y, DXY |
| **fx** | — (optional, sourced from MarketOverview) |
| **crypto** | BTC, ETH |
| **commodities** | Gold, WTI Crude |

The `key` field is the stable lookup identifier. UI components use selectors like `snapshotTicker(snapshot, 'spx')` instead of searching arrays.

## 6. Narrative Schema

Narrative fields are **derived from** the snapshot and dimensions. They never read raw time-series.

```typescript
interface NarrativeLayer {
  macro_verdict: string;         // = MacroVerdict.one_liner
  headline_summary: string;      // single sentence: what happened + what matters
  what_changed: string[];        // 3–5 bullets: overnight/session moves
  what_matters: string[];        // 2–4 bullets: why those moves matter
  what_to_watch: string[];       // 2–4 bullets: upcoming catalysts
  dimension_summaries: {
    liquidity: string;
    economy: string;
    inflation_rates: string;
    sentiment: string;
  };
}
```

### Derivation rules

| Field | Input |
|---|---|
| `macro_verdict` | Direct copy of `MacroVerdict.one_liner` |
| `headline_summary` | Generated from top 2 `what_changed` items + `MacroVerdict.stance` |
| `what_changed` | Derived from `MarketSnapshotData` deltas + `KeyMover` reasons |
| `what_matters` | Derived from `DimensionAssessment.summary` where `change ≠ stable` |
| `what_to_watch` | Derived from `UpcomingEvent[]` filtered by `impact = high` |
| `dimension_summaries` | Direct copy of each `DimensionAssessment.summary` |

No narrative field may reference a value not present in the same snapshot. If a number appears in text, the same number must exist in `MarketSnapshotData` or `DimensionMetric[]`.

## 7. Macro Consumption Model

Macro page reads the shared snapshot through selectors. It does not call raw API hooks for intelligence-layer content.

| Macro UI element | Schema source |
|---|---|
| Hero panel question ("进攻还是防守？") | `macro.overall_verdict.stance` + `macro.overall_verdict.one_liner` |
| Hero confidence bar | `macro.overall_verdict.confidence` |
| Four-dimension status row | `macro.liquidity.status`, `.economy.status`, `.inflation_rates.status`, `.sentiment.status` |
| Dimension detail card | `macro.[dimension].summary` + `macro.[dimension].metrics` |
| Macro narrative block | `narrative.dimension_summaries` + `narrative.what_matters` |
| Supporting metric cards | `market_snapshot.indices`, `.rates`, `.crypto` via `SnapshotTicker` |
| Economic calendar | `events[]` (pass-through, already real API) |
| Heatmap / Opportunities | Remain on direct API hooks — these are detail-level, not intelligence-layer |

**What Macro does NOT own**: verdict generation logic, metric normalization, narrative generation. Those belong to the shared layer.

## 8. Briefing Consumption Model

Briefing (Home) reads the same shared snapshot through selectors.

| Briefing UI element | Schema source |
|---|---|
| `HeadlineSummary` | `narrative.headline_summary` |
| `MarketSnapshot` strip | `market_snapshot.indices` + `market_snapshot.rates` (selectors for SPX, NDX, VIX, DXY, US10Y) |
| Briefing section ordering | Mapped from `narrative.what_changed` → `narrative.what_matters` → `narrative.what_to_watch` |
| "今日关注" section | `narrative.what_to_watch` + `events[]` filtered by today |
| `MentionedSymbols` | `key_movers[].symbol` + symbols extracted from narrative text |
| `KeyMoversStrip` | `key_movers[]` |
| Macro verdict reference | `narrative.macro_verdict` (displayed as a one-liner context strip, not a full Macro panel) |

**What Briefing does NOT own**: verdict computation, dimension assessment, metric normalization. It consumes pre-computed outputs only.

## 9. Data Freshness and Snapshot Rules

### Rule 1: One snapshot per render cycle

When a page mounts or refreshes, it reads one `MarketIntelligenceSnapshot`. All cards, narrative text, and verdict on that page come from that single snapshot. No component may fetch a fresher value independently while others show stale data.

### Rule 2: Shared snapshot timestamp

Every snapshot has `generated_at` and `snapshot_id`. UI renders this timestamp in provenance footers. If a user sees "生成于 14:32", every number on the page reflects 14:32 data.

### Rule 3: No mixed-cache narrative

Narrative text must be generated from the same snapshot that populates the cards. The generation function receives the full `MarketIntelligenceSnapshot` as input — it cannot reach outside for fresher data.

### Rule 4: Refresh is atomic

When a refresh occurs (user-triggered or interval-based), the entire snapshot is rebuilt. Partial updates (e.g., only VIX refreshes but narrative stays old) are prohibited. TanStack Query key includes `snapshot_id` to enforce this.

### Rule 5: Staleness threshold

| Data category | Max staleness | Refresh trigger |
|---|---|---|
| Market snapshot tickers | 60 seconds | Auto-refetch interval |
| Dimension assessments | 15 minutes | Snapshot rebuild |
| Narrative | 15 minutes | Same as dimension rebuild |
| Events / Calendar | 1 hour | Standard query staleTime |

### Rule 6: Session awareness

`market_session` determines which data is expected to be live. During `closed`, tickers show close values and narrative acknowledges the session. During `pre_market`, only futures-based estimates update.

## 10. Mock-to-Real Transition Plan

### Current state

| Data | Source today | Shape match |
|---|---|---|
| Index prices (SPX, NDX, etc.) | Real — `useMarketOverview` | Needs normalization to `SnapshotTicker` |
| Sentiment (VIX, DXY, US10Y, F&G) | Real — `useSentiment` | Needs normalization to `SnapshotTicker` + `DimensionMetric` |
| Heatmap | Real — `useHeatmap` | Pass-through, not intelligence-layer |
| Calendar | Real — `useCalendar` | Maps to `UpcomingEvent[]` |
| News | Real — `useNews` | Pass-through, not intelligence-layer |
| Opportunities / Key movers | Real — `useOpportunities` | Maps to `KeyMover[]` |
| Macro narrative | Mock — `mockMacroNarrative` | Must migrate to `NarrativeLayer` shape |
| Briefing content | Mock — `mockBriefing` | Must migrate to `NarrativeLayer` + `BriefingSection[]` shape |
| Dimension assessments | Do not exist | Must be created as mock first |

### Transition order

1. **Phase A — Schema types + mock snapshot**: Define TypeScript interfaces. Create `mockMarketIntelligenceSnapshot` that matches the full schema. Macro and Briefing pages can import and render from it immediately. No API changes.

2. **Phase B — Normalizer from real APIs**: Build `normalizeSnapshot()` that takes real `MarketOverview`, `SentimentData`, `OpportunitiesData`, `CalendarData` and produces a partial `MarketIntelligenceSnapshot`. Dimension assessments stay mock. Narrative stays mock.

3. **Phase C — Dimension assessment logic**: Implement `assessDimension()` functions that derive `DimensionAssessment` from real metrics. Can be rule-based first, LLM-enhanced later.

4. **Phase D — Narrative generation**: Implement `deriveNarrative()` that produces `NarrativeLayer` from the normalized snapshot + dimension assessments. Rule-based template first, LLM-enhanced later.

5. **Phase E — Full integration**: Replace mock snapshot with live-built snapshot. Both pages switch from mock import to `useMarketIntelligence()` hook.

### Mock shape rule

All mock data must already match the final schema interfaces. When `mockMarketIntelligenceSnapshot` is replaced by a real builder, consuming components change zero lines.

## 11. Suggested File / Module Structure

```
src/shared/market-intelligence/
├── types.ts                  # All interfaces defined in this document
├── constants.ts              # Dimension keys, status enums, ticker key registry
├── mockSnapshot.ts           # Full mock MarketIntelligenceSnapshot
├── normalize.ts              # normalizeSnapshot(overview, sentiment, opps, calendar) → partial snapshot
├── assess.ts                 # assessDimension(dimension, metrics) → DimensionAssessment
├── deriveNarrative.ts        # deriveNarrative(snapshot) → NarrativeLayer
├── selectors.ts              # snapshotTicker(snapshot, key), dimensionByKey(snapshot, dim), etc.
└── useMarketIntelligence.ts  # TanStack Query hook that assembles the full snapshot
```

### Integration points

| File | Role |
|---|---|
| `types.ts` | Single source of truth for all interfaces. Imported by pages, hooks, and selectors. |
| `mockSnapshot.ts` | Used during Phase A. All mock data shaped exactly like the real schema. Replaces `mockMacroNarrative`. |
| `normalize.ts` | Phase B. Consumes existing real API hook outputs. Produces `MarketSnapshotData` + `KeyMover[]` + `UpcomingEvent[]`. |
| `assess.ts` | Phase C. Rule-based dimension assessment. Input: relevant `DimensionMetric[]` from normalized snapshot. |
| `deriveNarrative.ts` | Phase D. Template-based narrative. Input: full `MarketIntelligenceSnapshot`. Output: `NarrativeLayer`. |
| `selectors.ts` | Pure functions for UI components. `snapshotTicker(snap, 'vix')`, `verdictStance(snap)`, etc. |
| `useMarketIntelligence.ts` | Phase E hook. Composes `useMarketOverview` + `useSentiment` + `useOpportunities` + `useCalendar` → runs `normalizeSnapshot` → `assess` → `deriveNarrative` → returns `MarketIntelligenceSnapshot`. |

### What does NOT move

- `useHeatmap`, `useNews` — these are detail-level data, not intelligence-layer. They stay as direct API hooks consumed by context panels.
- `useMarketOverview`, `useSentiment` — these remain as-is. `normalize.ts` consumes their output; it does not replace them.
- Research adapter (`researchAdapter.ts`) — completely separate domain. No overlap.

## 12. Non-Negotiables

1. **Macro and Briefing must never maintain separate verdict logic.** One `MacroVerdict` computed once per snapshot, consumed by both.

2. **Narrative must not read raw API responses directly.** It receives a normalized `MarketIntelligenceSnapshot` and produces text from that. If a number appears in prose, it exists in the snapshot.

3. **UI cards and narrative text must come from the same snapshot.** No mixed-cache rendering. One `snapshot_id` per page render.

4. **Mock shape must mirror real shape exactly.** `mockMarketIntelligenceSnapshot` implements the same interfaces as the future live-built snapshot. Swapping mock for real changes zero component code.

5. **Only a small set of representative variables per dimension.** 2–5 metrics each. This is not a FRED terminal. Each metric must have a `context` field explaining its significance.

6. **Dimension status uses a fixed enum, not free-text.** `healthy | neutral | watch | pressured` — no component should parse arbitrary strings.

7. **Snapshot refresh is atomic.** No partial updates. When data refreshes, the entire snapshot rebuilds.

8. **Selector functions are the only data access pattern for UI components.** Components never destructure the snapshot directly below the first level. Selectors like `snapshotTicker(snap, 'spx')` and `dimensionStatus(snap, 'sentiment')` keep the coupling surface minimal.

9. **The shared layer lives in `src/shared/market-intelligence/`.** Not inside `features/macro/` or `features/home/`. Both pages import from the shared path.

10. **No scope expansion.** This schema covers Macro and Briefing intelligence. Research asset analysis, Watchlist summaries, and Chart Lab remain on their own domain-specific adapters.
