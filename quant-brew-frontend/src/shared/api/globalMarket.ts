import { api } from './client';
import type {
  RawMarketOverview,
  RawSentimentData,
  MarketOverview,
  SentimentData,
  HeatmapData,
  CalendarData,
  NewsData,
  OpportunitiesData,
} from './types';
import { normalizeOverview, normalizeSentiment } from '@/shared/market-intelligence/normalize';

export const globalMarketApi = {
  overview: async (): Promise<MarketOverview> => {
    const raw = await api.get<RawMarketOverview>('/global-market/overview');
    return normalizeOverview(raw);
  },
  sentiment: async (): Promise<SentimentData> => {
    const raw = await api.get<RawSentimentData>('/global-market/sentiment');
    return normalizeSentiment(raw);
  },
  heatmap: () => api.get<HeatmapData>('/global-market/heatmap'),
  calendar: () => api.get<CalendarData>('/global-market/calendar'),
  news: (lang = 'zh') => api.get<NewsData>(`/global-market/news?lang=${lang}`),
  opportunities: () => api.get<OpportunitiesData>('/global-market/opportunities'),
};
