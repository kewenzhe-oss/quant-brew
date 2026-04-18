import { useQuery } from '@tanstack/react-query';
import { globalMarketApi } from '@/shared/api/globalMarket';

export function useHeatmap() {
  return useQuery({
    queryKey: ['heatmap'],
    queryFn: globalMarketApi.heatmap,
    staleTime: 30_000,
  });
}

export function useCalendar() {
  return useQuery({
    queryKey: ['calendar'],
    queryFn: globalMarketApi.calendar,
    staleTime: 60 * 60_000,
  });
}

export function useNews(lang = 'zh') {
  return useQuery({
    queryKey: ['news', lang],
    queryFn: () => globalMarketApi.news(lang),
    staleTime: 3 * 60_000,
  });
}

export function useOpportunities() {
  return useQuery({
    queryKey: ['opportunities'],
    queryFn: globalMarketApi.opportunities,
    staleTime: 60_000,
  });
}
