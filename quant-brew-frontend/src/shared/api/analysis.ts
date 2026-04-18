import { api } from './client';
import type {
  AnalysisApiResponse,
  AnalysisHistoryResponse,
  SimilarPatternsResponse,
} from './types';

export interface AnalyzeParams {
  market: string;
  symbol: string;
  language?: string;
  timeframe?: string;
  model?: string;
}

export const analysisApi = {
  analyze: (params: AnalyzeParams) =>
    api.post<AnalysisApiResponse>('/fast-analysis/analyze', {
      market: params.market,
      symbol: params.symbol,
      language: params.language ?? 'zh-CN',
      timeframe: params.timeframe ?? '1D',
      ...(params.model ? { model: params.model } : {}),
    }),

  history: (market: string, symbol: string, days = 7, limit = 10) =>
    api.get<AnalysisHistoryResponse>(
      `/fast-analysis/history?market=${encodeURIComponent(market)}&symbol=${encodeURIComponent(symbol)}&days=${days}&limit=${limit}`,
    ),

  similarPatterns: (market: string, symbol: string) =>
    api.get<SimilarPatternsResponse>(
      `/fast-analysis/similar-patterns?market=${encodeURIComponent(market)}&symbol=${encodeURIComponent(symbol)}`,
    ),
};
