/**
 * Macro Factor & Panel Registry
 * EXACT specification of the required fixed 4-zone layout panels.
 * This file replaces dynamic dimension configurations and locks down the IA.
 */

export const FACTORS = ['liquidity', 'economy', 'inflationRates', 'sentiment'] as const;
export type FactorType = typeof FACTORS[number];

export const PANELS: Record<FactorType, string[]> = {
  liquidity: ['us', 'global'],
  economy: ['growth', 'employment', 'credit'],
  inflationRates: ['inflation', 'rates', 'commodities'],
  sentiment: ['fearGreed', 'volatility', 'riskAppetite'],
};

export const FACTOR_LABELS: Record<FactorType, string> = {
  liquidity: '流动性',
  economy: '经济动能',
  inflationRates: '通胀与利率',
  sentiment: '市场情绪',
};

export const PANEL_LABELS: Record<string, string> = {
  us: '美国流动性',
  global: '全球流动性',
  growth: '增长动能',
  employment: '就业市场',
  credit: '信用条件',
  inflation: '通胀',
  rates: '利率定价',
  commodities: '大宗商品',
  fearGreed: '恐惧贪婪',
  volatility: '波动率',
  riskAppetite: '风险偏好',
};

/* ── Constrained config-driven types ── */

export interface PanelSnapshotConfig {
  key: string;
  label: string;
  description?: string;
}

export interface PanelChartConfig {
  key: string;
  title: string;
  description?: string;
}

export interface PanelContract {
  id: string;
  factor: FactorType;
  title: string;
  snapshots: { key: string; label: string; description: string; isProxy?: boolean; targetSource?: string }[];
  charts: { key: string; title: string; description: string; isProxy?: boolean; targetSource?: string }[];
  ExplanationComponent?: React.ComponentType;
}

import { UsLiquidityExplanation } from '@/features/macro/panels/liquidity/us/UsLiquidityExplanation';

export const US_LIQUIDITY_PANEL: PanelContract = {
  id: 'us',
  factor: 'liquidity',
  title: '美国流动性监控 (US Liquidity)',
  ExplanationComponent: UsLiquidityExplanation,
  snapshots: [
    { key: 'us_net_liquidity', label: '美国净流动性', description: 'WALCL − TGA − RRP' },
    { key: 'fed_balance_sheet', label: '美联储总资产', description: '美联储资产负债表规模' },
    { key: 'tga_balance', label: '财政部账户 TGA', description: '上升吸收市场流动性' },
    { key: 'rrp_balance', label: '隔夜逆回购 RRP', description: '下降释放净流动性' },
    { key: 'bank_reserves', label: '银行准备金', description: '商业银行在美联储资金' },
    { key: 'dollar_index', label: '美元指数', description: '全球美元流动性代理' },
    { key: 'financial_conditions_index', label: '金融条件指数', description: '> 0 意味着流动性紧缩' },
    { key: 'us10y_yield', label: '10Y 美债收益率', description: '全球折现率锚点' },
  ],
  charts: [
    { key: 'fed_balance_sheet', title: '美联储总资产 WALCL', description: '美联储资产负债表绝对规模' },
    { key: 'tga_balance', title: 'TGA 余额', description: '财政部在美联储的流动性吸收量走势' },
    { key: 'rrp_balance', title: 'RRP 余额', description: '隔夜逆回购资金池蓄水量走势' },
    { key: 'us_net_liquidity', title: '美国净流动性', description: '推升高风险资产泡沫的实际流通量' },
    { key: 'us10y_yield', title: '10Y 美债收益率', description: '无风险流资成本定价基准' },
    { key: 'dollar_index', title: '美元指数 DXY', description: '美元相对他国汇兑成本综合走势' },
  ]
};

import { EconomyGrowthExplanation } from '@/features/macro/panels/economy/growth/EconomyGrowthExplanation';

export const ECONOMY_GROWTH_PANEL: PanelContract = {
  id: 'growth',
  factor: 'economy',
  title: '宏观经济动能 (Economy Growth)',
  ExplanationComponent: EconomyGrowthExplanation,
  snapshots: [
    { key: 'ism_manufacturing', label: 'ISM 制造业 PMI', description: '美国制造业活动扩张信号' },
    { key: 'ism_services', label: 'ISM 服务业 PMI', description: '美国服务业运行状况' },
    { key: 'retail_sales_yoy', label: '零售销售增速', description: '消费终端核心体现' },
    { key: 'industrial_production_yoy', label: '工业产出增速', description: '经济实体现有生产动能' },
    { key: 'gdp_growth', label: 'GDP 增速 (实际)', description: '宏观总量增长率' },
    { key: 'consumer_confidence', label: '消费者信心指数', description: '评估消费端预期情况', isProxy: true, targetSource: 'UMich (UMCSENT)' },
    { key: 'leading_economic_index', label: '领先经济指标 (LEI)', description: '衡量经济前瞻性扩张衰退节奏', isProxy: true, targetSource: 'Philly Fed (USSLIND)' },
    { key: 'recession_probability', label: '衰退概率', description: '依据历史指标推算的硬着陆概率' },
  ],
  charts: [
    { key: 'ism_manufacturing', title: 'ISM 制造业 PMI', description: '制造业扩张/收缩分界在50' },
    { key: 'ism_services', title: 'ISM 服务业 PMI', description: '服务业作为主引擎的韧性' },
    { key: 'industrial_production_yoy', title: '工业产出 YoY', description: '工业产能趋势变化' },
    { key: 'consumer_confidence', title: '消费者信心指数', description: '代理指标 UMich 呈现的情绪走势', isProxy: true, targetSource: 'UMich (UMCSENT)' },
    { key: 'leading_economic_index', title: '领先经济综合指数', description: '经济前置景气观测', isProxy: true, targetSource: 'Philly Fed (USSLIND)' },
    { key: 'recession_probability', title: '衰退概率模型', description: '全网衰退概率统计走势' },
  ]
};

export const CONTRACT_REGISTRY: Record<FactorType, Record<string, PanelContract>> = {
  liquidity: {
    us: US_LIQUIDITY_PANEL,
  },
  economy: {
    growth: ECONOMY_GROWTH_PANEL,
  },
  inflationRates: {},
  sentiment: {}
};
