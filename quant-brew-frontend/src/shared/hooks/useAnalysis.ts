import { useMutation, useQuery } from '@tanstack/react-query';
import { analysisApi } from '@/shared/api/analysis';
import { mapToResearchDisplay } from '@/shared/api/researchAdapter';
import type { ResearchDisplay, RawAnalysisResponse } from '@/shared/api/types';

interface UseAnalysisResult {
  data: ResearchDisplay | null;
  raw: RawAnalysisResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  runAnalysis: () => void;
}

export function useAnalysis(market: string, symbol: string): UseAnalysisResult {
  const mutation = useMutation({
    mutationFn: () =>
      analysisApi.analyze({ market, symbol, language: 'zh-CN', timeframe: '1D' }),
  });

  const rawData = mutation.data?.data ?? null;
  const display = rawData && !rawData.error ? mapToResearchDisplay(rawData) : null;

  return {
    data: display,
    raw: rawData,
    isLoading: mutation.isPending,
    isError: mutation.isError || (rawData?.error != null),
    error: mutation.error ?? (rawData?.error ? new Error(rawData.error) : null),
    runAnalysis: () => mutation.mutate(),
  };
}

export function useAnalysisHistory(market: string, symbol: string) {
  return useQuery({
    queryKey: ['analysis-history', market, symbol],
    queryFn: () => analysisApi.history(market, symbol, 30, 5),
    enabled: !!market && !!symbol,
    staleTime: 60_000,
    select: (res) => res.data ?? [],
  });
}

export function useSimilarPatterns(market: string, symbol: string) {
  return useQuery({
    queryKey: ['similar-patterns', market, symbol],
    queryFn: () => analysisApi.similarPatterns(market, symbol),
    enabled: !!market && !!symbol,
    staleTime: 5 * 60_000,
    select: (res) => res.data ?? [],
  });
}
