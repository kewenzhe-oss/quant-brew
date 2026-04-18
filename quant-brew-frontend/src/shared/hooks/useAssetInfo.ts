import { useQuery } from '@tanstack/react-query';
import { marketApi } from '@/shared/api/market';

export function useAssetPrice(market: string, symbol: string) {
  return useQuery({
    queryKey: ['asset-price', market, symbol],
    queryFn: () => marketApi.price(market, symbol),
    enabled: !!market && !!symbol,
    staleTime: 15_000,
    refetchInterval: 30_000,
    select: (res) => res.data,
  });
}

export function useStockName(market: string, symbol: string) {
  return useQuery({
    queryKey: ['stock-name', market, symbol],
    queryFn: () => marketApi.stockName(market, symbol),
    enabled: !!market && !!symbol,
    staleTime: 24 * 60 * 60_000,
    select: (res) => res.data,
  });
}
