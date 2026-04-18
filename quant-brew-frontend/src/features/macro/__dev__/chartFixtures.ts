/**
 * DEV-ONLY: chartFixtures.ts
 *
 * Synthetic 90-day series for visual verification of the DimensionChart component.
 * NEVER imported from any page component or shared module.
 * NEVER shown to users.
 * Tree-shaken from production builds.
 * Remove this file when a real history API is connected.
 */

import type { ChartDataPoint } from '@/shared/market-intelligence/chartSeries';

function makeFixture(
  endValue: number,
  days = 90,
  volatility = 0.015,
): ChartDataPoint[] {
  const result: ChartDataPoint[] = [];
  let value = endValue * (1 + (Math.random() - 0.5) * 0.2);

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const drift = (endValue - value) * 0.04;
    value += drift + (Math.random() - 0.5) * volatility * value;
    result.push({
      time: date.toISOString().slice(0, 10),
      value: Math.round(value * 100) / 100,
    });
  }

  return result;
}

export const DEV_FIXTURES = {
  vix: makeFixture(18.5, 90, 0.04),
  us10y: makeFixture(4.35, 90, 0.008),
  fear_greed: makeFixture(58, 90, 0.03),
  cpi_yoy: makeFixture(3.4, 90, 0.005),
  ism_pmi: makeFixture(49.2, 90, 0.02),
} as const;
