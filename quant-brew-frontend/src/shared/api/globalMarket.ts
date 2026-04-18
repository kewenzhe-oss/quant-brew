import { api } from './client';
import type {
  MarketOverview,
  SentimentData,
  HeatmapData,
  CalendarData,
  NewsData,
  OpportunitiesData,
} from './types';

export const globalMarketApi = {
  overview: () => api.get<MarketOverview>('/global-market/overview'),
  sentiment: () => api.get<SentimentData>('/global-market/sentiment'),
  heatmap: () => api.get<HeatmapData>('/global-market/heatmap'),
  calendar: () => api.get<CalendarData>('/global-market/calendar'),
  news: (lang = 'zh') => api.get<NewsData>(`/global-market/news?lang=${lang}`),
  opportunities: () => api.get<OpportunitiesData>('/global-market/opportunities'),
};
