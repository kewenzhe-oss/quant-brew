/* ══════════════════════════════════════════════════════════════
   Quant-Brew Shared Market Intelligence Schema v1
   ─────────────────────────────────────────────────────────────
   Single source of truth for the information layer consumed
   by both Macro and Briefing. No UI component should define
   its own verdict, dimension, or narrative types.
   ══════════════════════════════════════════════════════════════ */

/* ── Top-level snapshot ── */

export interface MarketIntelligenceSnapshot {
  snapshot_id: string;
  generated_at: string;
  market_session: MarketSession;
  macro: MacroDimensions;
  market_snapshot: MarketSnapshotData;
  key_movers: KeyMover[];
  events: UpcomingEvent[];
  narrative: NarrativeLayer;
}

export type MarketSession = 'pre_market' | 'regular' | 'after_hours' | 'closed';

/* ── Macro dimensions ── */

export interface MacroDimensions {
  liquidity: DimensionAssessment;
  economy: DimensionAssessment;
  inflation_rates: DimensionAssessment;
  sentiment: DimensionAssessment;
  overall_verdict: MacroVerdict;
}

export type DimensionKey = 'liquidity' | 'economy' | 'inflation_rates' | 'sentiment';

export interface DimensionAssessment {
  status: DimensionStatus;
  signal: DimensionSignal;
  change: DimensionChange;
  confidence: number;
  summary: string;
  metrics: DimensionMetric[];
  why_it_matters: string[];
  risks: string[];
  watchpoints: string[];
}

export type DimensionStatus = 'healthy' | 'neutral' | 'watch' | 'pressured';
export type DimensionSignal = 'risk_supportive' | 'mixed' | 'risk_headwind' | 'defensive';
export type DimensionChange = 'improving' | 'stable' | 'weakening';

export interface DimensionMetric {
  key: string;
  label: string;
  value: number;
  unit: string;
  change: number | null;
  change_unit: string;
  context: string;
}

export interface MacroVerdict {
  stance: VerdictStance;
  confidence: number;
  one_liner: string;
  rationale: string;
}

export type VerdictStance =
  | 'offensive'
  | 'cautious_offensive'
  | 'neutral'
  | 'cautious_defensive'
  | 'defensive';

/* ── Market snapshot ── */

export interface MarketSnapshotData {
  timestamp: string;
  session: MarketSession;
  indices: SnapshotTicker[];
  rates: SnapshotTicker[];
  fx: SnapshotTicker[];
  crypto: SnapshotTicker[];
  commodities: SnapshotTicker[];
}

export interface SnapshotTicker {
  key: string;
  label: string;
  value: number;
  change: number;
  change_percent: number;
  unit: string;
}

/* ── Key movers ── */

export interface KeyMover {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change_percent: number;
  reason: string;
  volume_ratio: number | null;
}

/* ── Events ── */

export interface UpcomingEvent {
  date: string;
  time: string | null;
  event: string;
  impact: 'high' | 'medium' | 'low';
  previous: string | null;
  forecast: string | null;
  actual: string | null;
  country: string;
}

/* ── Narrative layer ── */

export interface NarrativeLayer {
  macro_verdict: string;
  headline_summary: string;
  what_changed: string[];
  what_matters: string[];
  what_to_watch: string[];
  dimension_summaries: Record<DimensionKey, string>;
}
