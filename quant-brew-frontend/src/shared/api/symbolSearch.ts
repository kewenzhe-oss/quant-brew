import { api } from './client';
import type { SymbolSearchResponse, HotSymbolsResponse } from './types';

export const symbolSearchApi = {
  search: (market: string, keyword: string, limit = 20) =>
    api.get<SymbolSearchResponse>(
      `/market/symbols/search?market=${encodeURIComponent(market)}&keyword=${encodeURIComponent(keyword)}&limit=${limit}`,
    ),

  hot: (market: string, limit = 10) =>
    api.get<HotSymbolsResponse>(
      `/market/symbols/hot?market=${encodeURIComponent(market)}&limit=${limit}`,
    ),
};
