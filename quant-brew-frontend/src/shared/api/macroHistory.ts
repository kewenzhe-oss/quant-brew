import { api } from './client';
import type { ChartDataPoint } from '@/shared/market-intelligence/chartSeries';

interface RawSeriesResponse {
  metric: string;
  label: string;
  unit: string;
  ticker: string;
  points: { time: string; value: number }[];
}

export const historyApi = {
  getSeries: async (metricKey: string): Promise<ChartDataPoint[] | null> => {
    try {
      const resp = await api.get<RawSeriesResponse>(`/global-market/series/${metricKey}`);
      if (!resp || !resp.points) return null;
      
      // Adapter Layer: Ensure time format matches Lightweight Charts expectation (YYYY-MM-DD or valid string)
      return resp.points.map(p => ({
        time: p.time,
        value: Number(p.value)
      }));
    } catch {
      return null; // Return null gracefully on API error (shows pending/empty state)
    }
  }
};
