import { api } from './client';
import type { PriceResponse, StockNameResponse } from './types';

export const marketApi = {
  price: (market: string, symbol: string) =>
    api.get<PriceResponse>(
      `/indicator/price?market=${encodeURIComponent(market)}&symbol=${encodeURIComponent(symbol)}`,
    ),

  stockName: (market: string, symbol: string) =>
    api.post<StockNameResponse>('/market/stock/name', { market, symbol }),
};
