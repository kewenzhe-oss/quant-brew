export type {
  MarketIntelligenceSnapshot,
  MarketSession,
  MacroDimensions,
  DimensionKey,
  DimensionAssessment,
  DimensionStatus,
  DimensionSignal,
  DimensionChange,
  DimensionMetric,
  MacroVerdict,
  VerdictStance,
  MarketSnapshotData,
  SnapshotTicker,
  KeyMover,
  UpcomingEvent,
  NarrativeLayer,
} from './types';

export {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  DIMENSION_STATUSES,
  STATUS_LABELS,
  DIMENSION_SIGNALS,
  SIGNAL_LABELS,
  DIMENSION_CHANGES,
  CHANGE_LABELS,
  VERDICT_STANCES,
  STANCE_LABELS,
  SESSION_LABELS,
  TICKER_KEYS,
  DIMENSION_DATA_QUALITY,
  DATA_QUALITY_LABELS,
} from './constants';
export type { TickerKey, DimensionDataQuality } from './constants';

export { mockMarketIntelligenceSnapshot } from './mockSnapshot';

export {
  normalizeMarketSnapshot,
  normalizeKeyMovers,
  normalizeEvents,
} from './normalize';

export { assessMacroDimensions, canAssessMacro } from './assess';

export { deriveNarrative } from './deriveNarrative';

export { useMarketIntelligence } from './useMarketIntelligence';

export {
  snapshotTicker,
  snapshotTickerValue,
  dimensionByKey,
  dimensionStatus,
  dimensionSignal,
  dimensionChange,
  dimensionSummary,
  macroVerdict,
  verdictStance,
  verdictOneLiner,
  narrativeLayer,
  headlineSummary,
  whatChanged,
  whatMatters,
  whatToWatch,
  keyMovers,
  upcomingEvents,
  highImpactEvents,
  todayEvents,
  snapshotTimestamp,
  snapshotSession,
} from './selectors';
