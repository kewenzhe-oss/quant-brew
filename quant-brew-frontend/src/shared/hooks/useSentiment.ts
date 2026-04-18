import { useQuery } from '@tanstack/react-query';
import { globalMarketApi } from '@/shared/api/globalMarket';

export function useSentiment() {
  return useQuery({
    queryKey: ['sentiment'],
    queryFn: globalMarketApi.sentiment,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
