import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { symbolSearchApi } from '@/shared/api/symbolSearch';
import type { SymbolSearchResult } from '@/shared/api/types';

const DEBOUNCE_MS = 300;

interface UseSymbolSearchOptions {
  market?: string;
  limit?: number;
}

interface UseSymbolSearchReturn {
  results: SymbolSearchResult[];
  isLoading: boolean;
}

/**
 * Debounced symbol search hook.
 * Shared by Research AssetEntry, Watchlist AddAssetModal, and global SearchOverlay.
 */
export function useSymbolSearch(
  keyword: string,
  options: UseSymbolSearchOptions = {},
): UseSymbolSearchReturn {
  const { market = '', limit = 20 } = options;
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);

    if (!keyword.trim()) {
      setDebouncedKeyword('');
      return;
    }

    timerRef.current = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [keyword]);

  const enabled = debouncedKeyword.length > 0;

  const { data, isLoading } = useQuery({
    queryKey: ['symbol-search', market, debouncedKeyword, limit],
    queryFn: () => symbolSearchApi.search(market || 'USStock', debouncedKeyword, limit),
    enabled,
    staleTime: 30_000,
    select: (res) => res.data ?? [],
  });

  return {
    results: enabled ? (data ?? []) : [],
    isLoading: enabled && isLoading,
  };
}

/**
 * Fetch curated hot symbols for a market.
 * Shared by Research AssetEntry and global SearchOverlay.
 */
export function useHotSymbols(market: string, limit = 10) {
  return useQuery({
    queryKey: ['hot-symbols', market, limit],
    queryFn: () => symbolSearchApi.hot(market, limit),
    enabled: !!market,
    staleTime: 5 * 60_000,
    select: (res) => res.data ?? [],
  });
}
