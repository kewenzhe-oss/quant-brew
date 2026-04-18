import { useQuery } from '@tanstack/react-query';
import { globalMarketApi } from '@/shared/api/globalMarket';

export function useMarketOverview() {
  return useQuery({
    queryKey: ['market-overview'],
    queryFn: globalMarketApi.overview,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
