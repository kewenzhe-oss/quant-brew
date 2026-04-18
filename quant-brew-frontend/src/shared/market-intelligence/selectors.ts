import type {
  MarketIntelligenceSnapshot,
  DimensionKey,
  DimensionAssessment,
  DimensionStatus,
  DimensionSignal,
  DimensionChange,
  MacroVerdict,
  SnapshotTicker,
  KeyMover,
  UpcomingEvent,
  NarrativeLayer,
} from './types';

/* ── Ticker selectors ── */

export function snapshotTicker(
  snapshot: MarketIntelligenceSnapshot,
  key: string,
): SnapshotTicker | undefined {
  const { market_snapshot: ms } = snapshot;
  const allTickers = [
    ...ms.indices,
    ...ms.rates,
    ...ms.fx,
    ...ms.crypto,
    ...ms.commodities,
  ];
  return allTickers.find((t) => t.key === key);
}

export function snapshotTickerValue(
  snapshot: MarketIntelligenceSnapshot,
  key: string,
): number | null {
  return snapshotTicker(snapshot, key)?.value ?? null;
}

/* ── Dimension selectors ── */

export function dimensionByKey(
  snapshot: MarketIntelligenceSnapshot,
  dimension: DimensionKey,
): DimensionAssessment {
  return snapshot.macro[dimension];
}

export function dimensionStatus(
  snapshot: MarketIntelligenceSnapshot,
  dimension: DimensionKey,
): DimensionStatus {
  return snapshot.macro[dimension].status;
}

export function dimensionSignal(
  snapshot: MarketIntelligenceSnapshot,
  dimension: DimensionKey,
): DimensionSignal {
  return snapshot.macro[dimension].signal;
}

export function dimensionChange(
  snapshot: MarketIntelligenceSnapshot,
  dimension: DimensionKey,
): DimensionChange {
  return snapshot.macro[dimension].change;
}

export function dimensionSummary(
  snapshot: MarketIntelligenceSnapshot,
  dimension: DimensionKey,
): string {
  return snapshot.macro[dimension].summary;
}

/* ── Verdict selectors ── */

export function macroVerdict(
  snapshot: MarketIntelligenceSnapshot,
): MacroVerdict {
  return snapshot.macro.overall_verdict;
}

export function verdictStance(
  snapshot: MarketIntelligenceSnapshot,
): MacroVerdict['stance'] {
  return snapshot.macro.overall_verdict.stance;
}

export function verdictOneLiner(
  snapshot: MarketIntelligenceSnapshot,
): string {
  return snapshot.macro.overall_verdict.one_liner;
}

/* ── Narrative selectors ── */

export function narrativeLayer(
  snapshot: MarketIntelligenceSnapshot,
): NarrativeLayer {
  return snapshot.narrative;
}

export function headlineSummary(
  snapshot: MarketIntelligenceSnapshot,
): string {
  return snapshot.narrative.headline_summary;
}

export function whatChanged(
  snapshot: MarketIntelligenceSnapshot,
): string[] {
  return snapshot.narrative.what_changed;
}

export function whatMatters(
  snapshot: MarketIntelligenceSnapshot,
): string[] {
  return snapshot.narrative.what_matters;
}

export function whatToWatch(
  snapshot: MarketIntelligenceSnapshot,
): string[] {
  return snapshot.narrative.what_to_watch;
}

/* ── Key movers ── */

export function keyMovers(
  snapshot: MarketIntelligenceSnapshot,
): KeyMover[] {
  return snapshot.key_movers;
}

/* ── Events ── */

export function upcomingEvents(
  snapshot: MarketIntelligenceSnapshot,
): UpcomingEvent[] {
  return snapshot.events;
}

export function highImpactEvents(
  snapshot: MarketIntelligenceSnapshot,
): UpcomingEvent[] {
  return snapshot.events.filter((e) => e.impact === 'high');
}

export function todayEvents(
  snapshot: MarketIntelligenceSnapshot,
  dateStr: string,
): UpcomingEvent[] {
  return snapshot.events.filter((e) => e.date === dateStr);
}

/* ── Metadata ── */

export function snapshotTimestamp(
  snapshot: MarketIntelligenceSnapshot,
): string {
  return snapshot.generated_at;
}

export function snapshotSession(
  snapshot: MarketIntelligenceSnapshot,
): MarketIntelligenceSnapshot['market_session'] {
  return snapshot.market_session;
}
