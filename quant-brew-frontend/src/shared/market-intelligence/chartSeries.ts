/**
 * ChartDataPoint — the shared type for all dimension time-series data.
 *
 * lightweight-charts expects { time, value } with time as a YYYY-MM-DD string
 * (it accepts ISO date strings as UTCTimestamp).
 *
 * This module defines the contract only. No data is generated here.
 * Real series will arrive from a future /api/history endpoint.
 */

export interface ChartDataPoint {
  /** ISO date string: YYYY-MM-DD */
  time: string;
  value: number;
}

/**
 * Hook signature contract for when the history API is connected.
 *
 * useDimensionHistory(metricKey: string, timeframe: '1M' | '3M' | '6M' | '1Y' | 'ALL')
 *   → { data: ChartDataPoint[] | null; isLoading: boolean }
 *
 * Not implemented yet — no real history endpoint exists.
 * When it does, this file receives the hook and the components adopt it
 * without any interface changes.
 */
export type HistoryTimeframe = '1M' | '3M' | '6M' | '1Y' | 'ALL';
