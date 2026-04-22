import { api } from './client';
import type { ChartDataPoint } from '@/shared/market-intelligence/chartSeries';

interface RawSeriesResponse {
  metric: string;
  label: string;
  unit: string;
  ticker: string;
  points: { time: string; value: number }[];
}

const BACKEND_SERIES_ALIAS: Record<string, string> = {
  'dollar_index': 'dxy',
  'financial_conditions_index': 'nfci',
  'us10y_yield': 'us10y',
  'us2y_yield': 'us2y',
  'bank_reserves': 'wresbal',
  'fed_balance_sheet': 'walcl',
  'tga_balance': 'tga',
  'rrp_balance': 'rrp',
  'industrial_production_yoy': 'industrial_production',
  'cpi_yoy': 'cpi_yoy',
  // Economy Proxy overrides
  'consumer_confidence': 'umcsent',
  'leading_economic_index': 'usslind',
};

export const historyApi = {
  getSeries: async (metricKey: string): Promise<ChartDataPoint[] | null> => {
    try {
      const backendKey = BACKEND_SERIES_ALIAS[metricKey] || metricKey;
      const resp = await api.get<RawSeriesResponse>(`/global-market/series/${backendKey}`);
      if (!resp || !resp.points) return null;
      
      // Adapter Layer: Ensure time format matches Lightweight Charts expectation
      return resp.points.map(p => ({
        time: p.time,
        value: Number(p.value)
      }));
    } catch {
      return null;
    }
  }
};
