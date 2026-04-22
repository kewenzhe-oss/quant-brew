import type {
  DimensionKey,
  DimensionStatus,
  DimensionSignal,
  DimensionChange,
  VerdictStance,
  MarketSession,
} from './types';

/* ── Dimension keys ── */

export const DIMENSION_KEYS: readonly DimensionKey[] = [
  'liquidity',
  'economy',
  'inflation_rates',
  'sentiment',
] as const;

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  liquidity: '流动性',
  economy: '经济',
  inflation_rates: '通胀与利率',
  sentiment: '情绪',
};

/* ── Domain IA mapping ──────────────────────────────────────────────────────
 *
 * Maps URL domain keys (kebab-case) to IA metadata:
 *   key:  internal DimensionKey used in assess.ts / constants
 *   url:  the URL segment used in routing
 *   dims: sub-dimensions for Layer 3 detail pages
 *
 * This is the single source of truth for the Macro 3-layer IA.
 * ─────────────────────────────────────────────────────────────────────────── */

export interface DomainDimension {
  slug: string;       // URL segment  e.g. 'us', 'growth', 'inflation', 'fear-greed'
  title: string;      // Display title
  question: string;   // The one question this dimension answers
  thesis: string;     // Standing analytical assumption
}

export interface DomainMeta {
  key: DimensionKey;          // Internal code key (matches MacroDimensions)
  urlKey: string;             // URL segment (kebab-case)
  title: string;              // Domain display title
  description: string;        // One-line domain description
  coreQuestion: string;       // The question this domain answers
  dims: DomainDimension[];    // Sub-dimensions (Layer 3 entries)
}

export const DOMAIN_ROUTE_MAP: Record<string, DomainMeta> = {
  liquidity: {
    key: 'liquidity',
    urlKey: 'liquidity',
    title: '流动性',
    description: '资金供给与成本条件是风险资产的底色',
    coreQuestion: '市场上的钱是多了还是少了？利率环境在收紧还是放松？',
    dims: [
      {
        slug: 'us',
        title: '美国流动性',
        question: '美联储净流动性向上还是向下？资金成本贵不贵？',
        thesis: '美联储净流动性（WALCL−TGA−RRP）是风险资产的直接底色',
      },
      {
        slug: 'global',
        title: '全球流动性',
        question: '全球主要央行是在扩张还是收缩流动性？',
        thesis: 'G3 央行协同行动决定全球美元流动性基调',
      },
    ],
  },
  economy: {
    key: 'economy',
    urlKey: 'economy',
    title: '经济',
    description: '实体经济基本面是企业盈利和资产估值周期的终极驱动力',
    coreQuestion: '经济动能是在延续还是走弱？就业与消费是否支撑盈利预期？',
    dims: [
      {
        slug: 'growth',
        title: '增长动能',
        question: '经济活动是在扩张还是收缩？软硬数据信号是否一致？',
        thesis: 'PMI < 50 往往领先企业盈利下调 2-3 个季度',
      },
      {
        slug: 'employment',
        title: '就业市场',
        question: '就业市场是否出现实质性松动？工资增速是否是通胀粘性来源？',
        thesis: '就业市场是消费端韧性的基础，也是 Fed 的第二目标',
      },
      {
        slug: 'credit',
        title: '信用条件',
        question: '企业融资成本是否上升？银行信贷标准有没有收紧？',
        thesis: 'HY 利差是金融压力的先行指标，往往领先市场拐点',
      },
    ],
  },
  'inflation-rates': {
    key: 'inflation_rates',
    urlKey: 'inflation-rates',
    title: '通胀与利率',
    description: '通胀粘性决定 Fed 政策空间，进而决定资产估值上限',
    coreQuestion: '通胀是否还在压制降息？利率路径是否逐步清晰？',
    dims: [
      {
        slug: 'inflation',
        title: '物价压力',
        question: '通胀是否还在给降息创造阻力？去通胀进程可持续吗？',
        thesis: 'CPI/PCE 的粘性决定 Fed 的政策空间，进而决定估值上限',
      },
      {
        slug: 'rates',
        title: '利率定价',
        question: '市场如何定价降息预期？收益率曲线在传递什么信号？',
        thesis: '利率曲线形态和实际利率是所有久期资产的折现率输入',
      },
      {
        slug: 'commodities',
        title: '大宗商品',
        question: '能源和金属价格变化是否会推升通胀？大宗商品是否在发出经济信号？',
        thesis: '原油是通胀最直接的传导变量，铜价是经济活动的领先信号',
      },
    ],
  },
  sentiment: {
    key: 'sentiment',
    urlKey: 'sentiment',
    title: '市场情绪',
    description: '情绪极端往往是均值回归的预兆，提供逆向操作机会',
    coreQuestion: '市场在恐慌还是贪婪？短期定价是否偏离基本面？',
    dims: [
      {
        slug: 'fear-greed',
        title: '恐惧贪婪',
        question: '当前市场情绪处于恐惧、贪婪还是中性？是否出现极端读数？',
        thesis: 'F&G 指数 < 25 往往是中期底部，> 75 时拥挤风险上升',
      },
      {
        slug: 'volatility',
        title: '波动率',
        question: '市场在为多大的尾部风险定价？是事件性还是周期性恐慌？',
        thesis: 'VIX 期限结构形态是判断市场风险性质的关键信号',
      },
      {
        slug: 'risk-appetite',
        title: '风险偏好',
        question: '资金流向高风险资产还是避险资产？市场广度是否支撑当前趋势？',
        thesis: '风险偏好轮动（高Beta/小盘/成长 vs 避险）是市场健康程度的验证',
      },
    ],
  },
};

/* Helper: resolve domainKey from URL param */
export function resolveDomain(urlKey: string): DomainMeta | null {
  return DOMAIN_ROUTE_MAP[urlKey] ?? null;
}


/* ── Status enums ── */

export const DIMENSION_STATUSES: readonly DimensionStatus[] = [
  'healthy',
  'neutral',
  'watch',
  'pressured',
] as const;

export const STATUS_LABELS: Record<DimensionStatus, string> = {
  healthy: '健康',
  neutral: '中性',
  watch: '关注',
  pressured: '承压',
};

/* ── Signal enums ── */

export const DIMENSION_SIGNALS: readonly DimensionSignal[] = [
  'risk_supportive',
  'mixed',
  'risk_headwind',
  'defensive',
] as const;

export const SIGNAL_LABELS: Record<DimensionSignal, string> = {
  risk_supportive: '风险偏好支撑',
  mixed: '混合信号',
  risk_headwind: '风险逆风',
  defensive: '防御',
};

/* ── Change enums ── */

export const DIMENSION_CHANGES: readonly DimensionChange[] = [
  'improving',
  'stable',
  'weakening',
] as const;

export const CHANGE_LABELS: Record<DimensionChange, string> = {
  improving: '改善',
  stable: '稳定',
  weakening: '走弱',
};

/**
 * Per-dimension data quality declaration.
 * Updated here as real data sources are connected.
 * Components use this to show honest source labels on each dimension card.
 */
export type DimensionDataQuality = 'real' | 'proxy' | 'partial';

export const DIMENSION_DATA_QUALITY: Record<DimensionKey, DimensionDataQuality> = {
  // 10Y yield + DXY + yield curve — financial CONDITIONS proxy, not liquidity data
  // True liquidity (WALCL/TGA/RRP/M2) is not connected yet → proxy
  liquidity: 'proxy',
  // Index breadth proxy — no direct PMI/jobless/GDP in current API
  economy: 'proxy',
  // 10Y + yield curve spread — real from useSentiment
  inflation_rates: 'real',
  // VIX + Fear&Greed + Put/Call — real from useSentiment, highest quality
  sentiment: 'real',
};

export const DATA_QUALITY_LABELS: Record<DimensionDataQuality, string> = {
  real: '实时数据',
  proxy: '代理指标',
  partial: '部分数据',
};

/* ── Verdict stance ── */

export const VERDICT_STANCES: readonly VerdictStance[] = [
  'offensive',
  'cautious_offensive',
  'neutral',
  'cautious_defensive',
  'defensive',
] as const;

export const STANCE_LABELS: Record<VerdictStance, string> = {
  offensive: '进攻',
  cautious_offensive: '偏多',
  neutral: '中性',
  cautious_defensive: '防守',
  defensive: '全面防守',
};

export const STANCE_ASSET_ADVICE: Record<VerdictStance, string> = {
  offensive: '股 ＞ 债，增配风险资产与成长风格，关注做空美债机会。',
  cautious_offensive: '股 ＝ 债（偏股），均衡配置，防守反击心态。',
  neutral: '维持核心资产配置，多看少动，等待多空博弈明朗。',
  cautious_defensive: '债 ＞ 股，降低高估值风险暴露，关注防御性板块。',
  defensive: '现金 ＝ 债 ＞ 股，全面防御，增配短债及避险资产。',
};

/* ── Market session ── */

export const SESSION_LABELS: Record<MarketSession, string> = {
  pre_market: '盘前',
  regular: '交易中',
  after_hours: '盘后',
  closed: '已收盘',
};

/* ── Ticker key registry ── */

export const TICKER_KEYS = {
  SPX: 'spx',
  NDX: 'ndx',
  DJI: 'dji',
  US10Y: 'us10y',
  US2Y: 'us2y',
  DXY: 'dxy',
  VIX: 'vix',
  BTC: 'btc',
  ETH: 'eth',
  GOLD: 'gold',
  WTI: 'wti',
} as const;

export type TickerKey = (typeof TICKER_KEYS)[keyof typeof TICKER_KEYS];
