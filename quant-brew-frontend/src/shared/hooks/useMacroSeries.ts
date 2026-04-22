/**
 * useMacroSeries — fetches 1-year daily history for a macro metric.
 *
 * Backed by GET /api/global-market/series/:metricKey
 * No auth token required (public market data).
 *
 * Returns ChartDataPoint[] compatible with DimensionChart.
 */

import { useQuery } from '@tanstack/react-query';
import type { ChartDataPoint } from '@/shared/market-intelligence/chartSeries';

import { historyApi } from '@/shared/api/macroHistory';

/**
 * Hook. Returns null while loading or on error (DimensionChart shows pending state).
 * Returns ChartDataPoint[] when data is available.
 */
export function useMacroSeries(metricKey: string | null): {
  series: ChartDataPoint[] | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['macro-series', metricKey],
    queryFn: () => historyApi.getSeries(metricKey!),
    enabled: !!metricKey,
    staleTime: 30 * 60_000,   // 30 min — daily series, no need to refresh often
    gcTime:    60 * 60_000,   // 1h cache
    retry: 1,
  });

  return {
    series:    data ?? null,
    isLoading: isLoading && !!metricKey,
  };
}
