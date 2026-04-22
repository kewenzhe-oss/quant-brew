/**
 * chartSeries.ts — Canonical Chart Registry
 *
 * ALL charts rendered in the Macro product must be declared here.
 * Components NEVER hard-code series data, chart types, or thresholds.
 * They look up ChartSpec from this registry by metric key or chart id.
 *
 * Data flow:
 *   CHART_REGISTRY[id].seriesId → /api/macro/history?series=<seriesId>&range=<range>
 *                                → ChartDataPoint[]
 *                                → chart component
 *
 * Implementation scope tags (aligned with macroIA.config.ts):
 *   v1_now    — chart + data both ready
 *   v1_later  — chart spec defined, backend history endpoint pending
 *   v2        — metric backend pending too
 */

import type { ChartSpec } from './types';

/* ── Raw time-series point (lightweight-charts compatible) ── */
export interface ChartDataPoint {
  /** ISO date string: YYYY-MM-DD */
  time: string;
  value: number;
}

export type HistoryTimeframe = '1M' | '3M' | '6M' | '1Y' | '2Y' | 'ALL';

/* ═══════════════════════════════════════════════════════════════════
   CHART_REGISTRY
   ═══════════════════════════════════════════════════════════════════ */

export const CHART_REGISTRY: Record<string, ChartSpec> = {

  /* ──────────────────────────────────────────────
     DOMAIN: liquidity / DIMENSION: us
     ────────────────────────────────────────────── */
  us10y_yield: {
    id: 'us10y_yield', metricKey: 'us10y_yield',
    title: '10Y 美债收益率', description: '全球最重要的折现率参考利率，影响所有久期资产定价',
    chartType: 'line', unit: '%', defaultRange: '1Y',
    availableRanges: ['1M', '3M', '6M', '1Y', '2Y', 'ALL'],
    seriesId: '^TNX',
    thresholds: [
      { value: 4.5, label: '压力线', color: '#ef4444' },
      { value: 3.5, label: '宽松线', color: '#10b981' },
    ],
    domainKey: 'liquidity', dimensionSlug: 'us',
  },

  net_liquidity: {
    id: 'net_liquidity', metricKey: 'us_net_liquidity',
    title: '美国净流动性 (WALCL−TGA−RRP)', description: '联储净流动性与风险资产高度正相关',
    chartType: 'area', unit: 'B USD', defaultRange: '1Y',
    availableRanges: ['3M', '6M', '1Y', '2Y', 'ALL'],
    seriesId: 'WALCL',   // backend computes net = WALCL − TGA − RRP
    domainKey: 'liquidity', dimensionSlug: 'us',
  },

  walcl: {
    id: 'walcl', metricKey: 'walcl',
    title: '美联储总资产 WALCL', description: '美联储资产负债表规模（周度）',
    chartType: 'area', unit: 'B USD', defaultRange: '2Y',
    availableRanges: ['1Y', '2Y', 'ALL'],
    seriesId: 'WALCL',
    domainKey: 'liquidity', dimensionSlug: 'us',
  },

  rrp_balance: {
    id: 'rrp_balance', metricKey: 'rrp_balance',
    title: '隔夜逆回购 RRP', description: 'RRP 消耗速度决定净流动性释放节奏',
    chartType: 'area', unit: 'B USD', defaultRange: '1Y',
    availableRanges: ['6M', '1Y', '2Y', 'ALL'],
    seriesId: 'RRPONTSYD',
    thresholds: [{ value: 100, label: '耗尽警戒线', color: '#f59e0b' }],
    domainKey: 'liquidity', dimensionSlug: 'us',
  },

  dxy: {
    id: 'dxy', metricKey: 'dxy',
    title: '美元指数 DXY', description: '美元走强 = 全球流动性收紧',
    chartType: 'line', unit: 'index', defaultRange: '6M',
    availableRanges: ['1M', '3M', '6M', '1Y', '2Y'],
    seriesId: 'DX-Y.NYB',
    thresholds: [
      { value: 105, label: '强美元区', color: '#ef4444' },
      { value: 100, label: '中性线', color: '#737373' },
    ],
    domainKey: 'liquidity', dimensionSlug: 'us',
  },

  yield_curve_spread: {
    id: 'yield_curve_spread', metricKey: 'term_spread_10y_2y',
    title: '10Y-2Y 期限利差', description: '曲线倒挂历史上领先衰退 12-18 个月',
    chartType: 'area', unit: 'bps', defaultRange: '2Y',
    availableRanges: ['1Y', '2Y', 'ALL'],
    seriesId: 'T10Y2Y',
    thresholds: [{ value: 0, label: '倒挂线', color: '#ef4444' }],
    domainKey: 'liquidity', dimensionSlug: 'us',
  },

  /* ──────────────────────────────────────────────
     DOMAIN: economy / DIMENSION: growth
     ────────────────────────────────────────────── */
  ism_manufacturing: {
    id: 'ism_manufacturing', metricKey: 'ism_manufacturing',
    title: 'ISM 制造业 PMI', description: '制造业景气指数，领先企业盈利约 2-3 个季度',
    chartType: 'bar', unit: 'index', defaultRange: '1Y',
    availableRanges: ['6M', '1Y', '2Y', 'ALL'],
    seriesId: 'ISMMAN',
    thresholds: [
      { value: 50, label: '荣枯线', color: '#737373' },
      { value: 45, label: '衰退区', color: '#ef4444' },
    ],
    domainKey: 'economy', dimensionSlug: 'growth',
  },

  ism_services: {
    id: 'ism_services', metricKey: 'ism_services',
    title: 'ISM 服务业 PMI', description: '服务业约占 GDP 75%，是更宽泛的景气代理',
    chartType: 'bar', unit: 'index', defaultRange: '1Y',
    availableRanges: ['6M', '1Y', '2Y', 'ALL'],
    seriesId: 'ISMSVC',
    thresholds: [{ value: 50, label: '荣枯线', color: '#737373' }],
    domainKey: 'economy', dimensionSlug: 'growth',
  },

  retail_sales: {
    id: 'retail_sales', metricKey: 'retail_sales_yoy',
    title: '零售销售 MoM%', description: '消费端活力，占 GDP 约 70%',
    chartType: 'bar', unit: 'MoM%', defaultRange: '1Y',
    availableRanges: ['6M', '1Y', '2Y', 'ALL'],
    seriesId: 'RSXFSN',
    thresholds: [{ value: 0, label: '零增长', color: '#737373' }],
    domainKey: 'economy', dimensionSlug: 'growth',
  },

  industrial_production: {
    id: 'industrial_production', metricKey: 'industrial_production_yoy',
    title: '工业产出 YoY%', description: '制造业 + 采矿 + 电力综合产出',
    chartType: 'bar', unit: 'YoY%', defaultRange: '1Y',
    availableRanges: ['6M', '1Y', '2Y', 'ALL'],
    seriesId: 'INDPRO',
    thresholds: [{ value: 0, label: '零增长', color: '#737373' }],
    domainKey: 'economy', dimensionSlug: 'growth',
  },

  /* ──────────────────────────────────────────────
     DOMAIN: economy / DIMENSION: employment
     ────────────────────────────────────────────── */
  unemployment: {
    id: 'unemployment', metricKey: 'unemployment_rate',
    title: '失业率 UNRATE', description: 'U-3 失业率，Fed 第二目标',
    chartType: 'line', unit: '%', defaultRange: '2Y',
    availableRanges: ['1Y', '2Y', 'ALL'],
    seriesId: 'UNRATE',
    thresholds: [
      { value: 4.5, label: '松动警戒', color: '#f59e0b' },
      { value: 5.5, label: '衰退区', color: '#ef4444' },
    ],
    domainKey: 'economy', dimensionSlug: 'employment',
  },

  nonfarm_payrolls: {
    id: 'nonfarm_payrolls', metricKey: 'nonfarm_payrolls',
    title: '非农就业 MoM', description: '月度非农新增就业人数',
    chartType: 'bar', unit: 'K', defaultRange: '1Y',
    availableRanges: ['6M', '1Y', '2Y', 'ALL'],
    seriesId: 'PAYEMS',
    thresholds: [
      { value: 0, label: '就业萎缩', color: '#ef4444' },
      { value: 150, label: '健康增速', color: '#10b981' },
    ],
    domainKey: 'economy', dimensionSlug: 'employment',
  },

  initial_claims: {
    id: 'initial_claims', metricKey: 'initial_claims',
    title: '初请失业金 IC4WSA', description: '4周均值，周度劳动市场压力先行指标',
    chartType: 'line', unit: 'K', defaultRange: '1Y',
    availableRanges: ['6M', '1Y', '2Y', 'ALL'],
    seriesId: 'IC4WSA',
    thresholds: [
      { value: 300, label: '压力区入口', color: '#f59e0b' },
      { value: 400, label: '衰退警戒', color: '#ef4444' },
    ],
    domainKey: 'economy', dimensionSlug: 'employment',
  },

  /* ──────────────────────────────────────────────
     DOMAIN: inflation-rates / DIMENSION: inflation
     ────────────────────────────────────────────── */
  cpi_yoy: {
    id: 'cpi_yoy', metricKey: 'cpi_yoy',
    title: 'CPI 同比', description: 'CPI All Urban Consumers YoY，最广泛引用的通胀指标',
    chartType: 'line', unit: 'YoY%', defaultRange: '2Y',
    availableRanges: ['1Y', '2Y', 'ALL'],
    seriesId: 'CPIAUCSL',
    thresholds: [
      { value: 2, label: 'Fed 目标', color: '#10b981' },
      { value: 4, label: '压力线', color: '#f59e0b' },
      { value: 6, label: '高通胀区', color: '#ef4444' },
    ],
    domainKey: 'inflation-rates', dimensionSlug: 'inflation',
  },

  pce_core: {
    id: 'pce_core', metricKey: 'pce_core_yoy',
    title: '核心 PCE 同比', description: 'Fed 官方通胀参考指标，目标 2%',
    chartType: 'line', unit: 'YoY%', defaultRange: '2Y',
    availableRanges: ['1Y', '2Y', 'ALL'],
    seriesId: 'PCEPILFE',
    thresholds: [
      { value: 2, label: 'Fed 目标', color: '#10b981' },
      { value: 3.5, label: '粘性区', color: '#f59e0b' },
    ],
    domainKey: 'inflation-rates', dimensionSlug: 'inflation',
  },

  /* ──────────────────────────────────────────────
     DOMAIN: inflation-rates / DIMENSION: rates
     ────────────────────────────────────────────── */
  us10y_rates: {
    id: 'us10y_rates', metricKey: 'us10y_yield',
    title: '10Y 美债收益率', description: '长端利率，资产定价折现率核心输入',
    chartType: 'line', unit: '%', defaultRange: '1Y',
    availableRanges: ['1M', '3M', '6M', '1Y', '2Y', 'ALL'],
    seriesId: '^TNX',
    thresholds: [
      { value: 4.5, label: '高利率区', color: '#ef4444' },
      { value: 3.5, label: '估值友好线', color: '#10b981' },
    ],
    domainKey: 'inflation-rates', dimensionSlug: 'rates',
  },

  us2y_yield: {
    id: 'us2y_yield', metricKey: 'us2y_yield',
    title: '2Y 美债收益率', description: '对联储政策预期最敏感的利率',
    chartType: 'line', unit: '%', defaultRange: '1Y',
    availableRanges: ['3M', '6M', '1Y', '2Y'],
    seriesId: '^IRX',
    domainKey: 'inflation-rates', dimensionSlug: 'rates',
  },

  // P1 — pending backend
  us30y_yield: {
    id: 'us30y_yield', metricKey: 'us30y_yield',
    title: '30Y 美债收益率', description: '超长端利率，抵押贷款基准',
    chartType: 'line', unit: '%', defaultRange: '1Y',
    availableRanges: ['3M', '6M', '1Y', '2Y'],
    seriesId: '^TYX',
    domainKey: 'inflation-rates', dimensionSlug: 'rates',
  },

  yield_curve_rates: {
    id: 'yield_curve_rates', metricKey: 'term_spread_10y_2y',
    title: '10Y-2Y 期限利差', description: '收益率曲线形态信号',
    chartType: 'area', unit: 'bps', defaultRange: '2Y',
    availableRanges: ['1Y', '2Y', 'ALL'],
    seriesId: 'T10Y2Y',
    thresholds: [{ value: 0, label: '倒挂线', color: '#ef4444' }],
    domainKey: 'inflation-rates', dimensionSlug: 'rates',
  },

  /* ──────────────────────────────────────────────
     DOMAIN: inflation-rates / DIMENSION: commodities
     P1 — fetch_wti_gold() backend pending
     ────────────────────────────────────────────── */
  wti_crude: {
    id: 'wti_crude', metricKey: 'wti_crude',
    title: 'WTI 原油价格', description: '直接影响能源通胀，占 CPI 权重约 7%',
    chartType: 'line', unit: 'USD', defaultRange: '1Y',
    availableRanges: ['3M', '6M', '1Y', '2Y'],
    seriesId: 'CL=F',
    thresholds: [
      { value: 90, label: '高油价压力', color: '#ef4444' },
      { value: 70, label: '中性区', color: '#737373' },
    ],
    domainKey: 'inflation-rates', dimensionSlug: 'commodities',
  },

  gold: {
    id: 'gold', metricKey: 'gold',
    title: '黄金 XAUUSD', description: '通胀 / 避险资产，与实际利率反向',
    chartType: 'line', unit: 'USD', defaultRange: '1Y',
    availableRanges: ['3M', '6M', '1Y', '2Y'],
    seriesId: 'GC=F',
    domainKey: 'inflation-rates', dimensionSlug: 'commodities',
  },

  /* ──────────────────────────────────────────────
     DOMAIN: sentiment / DIMENSION: fear-greed
     ────────────────────────────────────────────── */
  fear_greed: {
    id: 'fear_greed', metricKey: 'fear_greed_index',
    title: '恐惧贪婪指数', description: 'CNN Fear & Greed (0=极度恐惧, 100=极度贪婪)',
    chartType: 'line', unit: 'index', defaultRange: '3M',
    availableRanges: ['1M', '3M', '6M', '1Y'],
    seriesId: 'fear_greed',   // internal CNN scraper
    thresholds: [
      { value: 25, label: '极度恐惧（买入信号）', color: '#10b981' },
      { value: 50, label: '中性线', color: '#737373' },
      { value: 75, label: '极度贪婪（风险拥挤）', color: '#ef4444' },
    ],
    domainKey: 'sentiment', dimensionSlug: 'fear-greed',
  },

  put_call_ratio: {
    id: 'put_call_ratio', metricKey: 'put_call_ratio',
    title: 'Put/Call 比率', description: '>1 = 防御情绪主导',
    chartType: 'bar', unit: 'ratio', defaultRange: '3M',
    availableRanges: ['1M', '3M', '6M'],
    seriesId: 'put_call',
    thresholds: [
      { value: 1.0, label: '中性线', color: '#737373' },
      { value: 1.3, label: '恐慌区', color: '#ef4444' },
    ],
    domainKey: 'sentiment', dimensionSlug: 'fear-greed',
  },

  /* ──────────────────────────────────────────────
     DOMAIN: sentiment / DIMENSION: volatility
     ────────────────────────────────────────────── */
  vix: {
    id: 'vix', metricKey: 'vix',
    title: 'VIX 隐含波动率', description: 'CBOE VIX 30 日隐含波动率',
    chartType: 'area', unit: 'index', defaultRange: '6M',
    availableRanges: ['1M', '3M', '6M', '1Y', '2Y'],
    seriesId: '^VIX',
    thresholds: [
      { value: 15, label: '极低波动', color: '#6366f1' },
      { value: 20, label: '中性线', color: '#737373' },
      { value: 30, label: '恐慌线', color: '#f59e0b' },
      { value: 40, label: '极端恐慌', color: '#ef4444' },
    ],
    domainKey: 'sentiment', dimensionSlug: 'volatility',
  },

  vxn: {
    id: 'vxn', metricKey: 'vxn',
    title: 'VXN 纳指隐含波动率', description: 'NASDAQ 100 隐含波动率，科技板块风险代理',
    chartType: 'line', unit: 'index', defaultRange: '3M',
    availableRanges: ['1M', '3M', '6M', '1Y'],
    seriesId: '^VXN',
    thresholds: [{ value: 25, label: '压力线', color: '#f59e0b' }],
    domainKey: 'sentiment', dimensionSlug: 'volatility',
  },

  gvz: {
    id: 'gvz', metricKey: 'gvz',
    title: 'GVZ 黄金隐含波动率', description: '黄金期权隐含波动率，避险资产压力指标',
    chartType: 'line', unit: 'index', defaultRange: '3M',
    availableRanges: ['1M', '3M', '6M'],
    seriesId: '^GVZ',
    thresholds: [{ value: 20, label: '压力线', color: '#f59e0b' }],
    domainKey: 'sentiment', dimensionSlug: 'volatility',
  },
};

/* ═══════════════════════════════════════════════════════════════════
   Accessor Helpers
   ═══════════════════════════════════════════════════════════════════ */

/** Get all chart specs for a specific dimension */
export function getChartsForDimension(domainKey: string, dimSlug: string): ChartSpec[] {
  return Object.values(CHART_REGISTRY).filter(
    (c) => c.domainKey === domainKey && c.dimensionSlug === dimSlug,
  );
}

/** Look up a single chart spec by its metric key */
export function getChartByMetric(metricKey: string): ChartSpec | undefined {
  return Object.values(CHART_REGISTRY).find((c) => c.metricKey === metricKey);
}

/** Look up a chart spec by its unique id */
export function getChartById(chartId: string): ChartSpec | undefined {
  return CHART_REGISTRY[chartId];
}

/* Re-export types for consumers who import from this file */
export type { ChartSpec } from './types';
