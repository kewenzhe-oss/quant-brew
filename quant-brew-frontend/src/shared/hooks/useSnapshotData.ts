import { useSentiment } from './useSentiment';

export function useSnapshotData(factorKey: string, metricKey: string) {
  const { data: sentiment } = useSentiment();
  
  if (!sentiment) return null;
  // Specific Liquidity resolutions
  if (factorKey === 'liquidity') {
    if (metricKey === 'us_net_liquidity') return sentiment.fed_liquidity?.net_liquidity;
    if (metricKey === 'fed_balance_sheet') return sentiment.fed_liquidity?.walcl;
    if (metricKey === 'tga_balance') return sentiment.fed_liquidity?.tga;
    if (metricKey === 'rrp_balance') return sentiment.fed_liquidity?.rrp;
    if (metricKey === 'bank_reserves') return sentiment.fed_liquidity?.wresbal;
    if (metricKey === 'dollar_index') return sentiment.dxy?.value;
    if (metricKey === 'financial_conditions_index') return sentiment.fed_liquidity?.nfci;
    if (metricKey === 'us10y_yield') return sentiment.us10y?.value;
  }
  
  // Specific Economy resolutions
  if (factorKey === 'economy') {
    const metrics = sentiment.growth_metrics;
    if (!metrics) return null;
    if (metricKey === 'ism_manufacturing') return metrics.ism_manufacturing;
    if (metricKey === 'ism_services') return metrics.ism_services;
    if (metricKey === 'industrial_production_yoy') return metrics.industrial_production_yoy;
    if (metricKey === 'retail_sales_yoy') return metrics.retail_sales_yoy;
    if (metricKey === 'gdp_growth') return metrics.gdp_growth;
    if (metricKey === 'consumer_confidence') return metrics.consumer_confidence;
    if (metricKey === 'leading_economic_index') return metrics.leading_economic_index;
    if (metricKey === 'recession_probability') return metrics.recession_probability;
  }
  
  return null;
}
