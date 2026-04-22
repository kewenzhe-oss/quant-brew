/**
 * macroIA.config.ts
 *
 * Quant-Brew Macro Information Architecture — Canonical Source of Truth
 * ─────────────────────────────────────────────────────────────────────
 * Semantic hierarchy this file encodes (strictly):
 *
 *   macro
 *    └─ domain          (liquidity | economy | inflationRates | sentiment)
 *        └─ dimension   (us | global | growth | employment | ...)
 *            └─ section (overview | fedSystem | fundingConditions | ...)
 *                └─ block   (hero | snapshot | chart | metricGrid | ...)
 *                    └─ metric  (CPI YoY, 10Y Yield, VIX ...)
 *
 * Naming conventions:
 *   - All keys: camelCase in code, kebab-case in URLs
 *   - Metric keys: snake_case (matches backend payload keys)
 *
 * Implementation scope tags (per metric / section):
 *   v1_now     — currently live in backend + frontend
 *   v1_later   — planned for next sprint
 *   v2         — mid-term roadmap
 *   schema_only — defined here but no backend integration yet
 *
 * ─────────────────────────────────────────────────────────────────────
 * Rule: UI components must ONLY read from this file to understand
 * what sections / metrics exist. They must NEVER hard-code metric
 * keys, labels, or units directly.
 * ─────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════
   Type System
   ═══════════════════════════════════════════════════════════════════ */

export type ImplScope = 'v1_now' | 'v1_later' | 'v2' | 'schema_only';

export type BlockType =
  | 'hero'
  | 'snapshot'
  | 'chart'
  | 'metricGrid'
  | 'aiBrief'
  | 'table'
  | 'definition'
  | 'riskWatch';

export type MetricUnit =
  | '%'
  | 'bps'
  | 'index'
  | 'USD'
  | 'B USD'
  | 'T USD'
  | 'K'
  | 'x'
  | 'ratio'
  | 'ppt'
  | 'MoM%'
  | 'YoY%'
  | 'pts';

/** One atomic data indicator */
export interface MetricDef {
  key: string;          // snake_case — matches backend payload key
  label: string;        // Display label (Traditional/Simplified Chinese OK)
  unit: MetricUnit;
  description: string;  // 1-line purpose
  source?: string;      // Data source (FRED series, API field, etc.)
  impl: ImplScope;
}

/** A rendered content block inside a section */
export interface BlockDef {
  id: string;
  type: BlockType;
  title?: string;
  metrics: string[];    // Array of MetricDef.key values
  impl: ImplScope;
}

/** A focused analysis sub-area within a dimension */
export interface SectionDef {
  id: string;
  title: string;
  question: string;     // The single analytical question this section answers
  blocks: BlockDef[];
  impl: ImplScope;
}

/** One analytical angle within a domain */
export interface DimensionDef {
  id: string;
  urlSlug: string;      // kebab-case URL segment
  title: string;
  question: string;     // The one question this dimension answers
  thesis: string;       // Standing assumption / investment relevance
  moduleIds?: string[]; // IDs of the modules (sections) to render inside this dimension tab
  sections: SectionDef[];
  impl: ImplScope;
}

/** A top-level macro theme */
export interface DomainDef {
  id: string;
  urlSlug: string;      // kebab-case URL segment
  title: string;
  coreQuestion: string;
  description: string;
  dimensions: DimensionDef[];
}

/** Root macro config */
export interface MacroIAConfig {
  domains: DomainDef[];
  /** Flat metric registry (key → MetricDef) for O(1) lookup */
  metrics: Record<string, MetricDef>;
}

/* ═══════════════════════════════════════════════════════════════════
   Metric Registry
   All metrics referenced in sections must be declared here.
   ═══════════════════════════════════════════════════════════════════ */

const METRIC_REGISTRY: Record<string, MetricDef> = {

  /* ── Liquidity: US ── */
  us_net_liquidity: {
    key: 'us_net_liquidity', label: '美国净流动性', unit: 'T USD',
    description: 'WALCL − TGA − RRP，衡量实际可流通资金净额',
    source: 'FRED: WALCL / WTREGEN / RRPONTSYD (weekly)',
    impl: 'v1_later',
  },
  walcl: {
    key: 'walcl', label: '美联储总资产 WALCL', unit: 'T USD',
    description: '美联储资产负债表规模',
    source: 'FRED: WALCL (weekly)',
    impl: 'v1_later',
  },
  tga_balance: {
    key: 'tga_balance', label: '财政部账户 TGA', unit: 'B USD',
    description: '财政部在美联储持有的现金账户；上升吸收市场流动性',
    source: 'FRED: WTREGEN (weekly)',
    impl: 'v1_later',
  },
  rrp_balance: {
    key: 'rrp_balance', label: '隔夜逆回购 RRP', unit: 'T USD',
    description: '货币市场基金停泊在美联储的资金；下降释放净流动性',
    source: 'FRED: RRPONTSYD (weekly)',
    impl: 'v1_later',
  },
  reserve_balances_with_fed: {
    key: 'reserve_balances_with_fed', label: '银行准备金 WRESBAL', unit: 'T USD',
    description: '商业银行在美联储持有的超额准备金',
    source: 'FRED: WRESBAL (weekly)',
    impl: 'v1_later',
  },
  financial_conditions_index: {
    key: 'financial_conditions_index', label: '金融条件指数 NFCI', unit: 'index',
    description: '芝加哥联储综合金融条件指数；> 0 偏紧，< 0 偏松',
    source: 'FRED: NFCI (weekly)',
    impl: 'v2',
  },

  /* ── Liquidity: Global ── */
  global_liquidity_index: {
    key: 'global_liquidity_index', label: '全球流动性指数', unit: 'T USD',
    description: 'Fed + ECB + BOJ 总资产 − TGA − ¼ RRP',
    source: 'Calculated: WALCL + ECBASSETSW + JPNASSETS',
    impl: 'v2',
  },
  boj_balance_sheet: {
    key: 'boj_balance_sheet', label: 'BOJ 总资产', unit: 'T USD',
    description: '日本央行资产负债表规模（按当期汇率换算）',
    source: 'BOJ Statistics / FRED',
    impl: 'v2',
  },
  boj_policy_rate: {
    key: 'boj_policy_rate', label: 'BOJ 政策利率', unit: '%',
    description: '日本央行短期利率目标；影响日元套息交易',
    source: 'BOJ',
    impl: 'v2',
  },
  ecb_balance_sheet: {
    key: 'ecb_balance_sheet', label: 'ECB 总资产', unit: 'T USD',
    description: '欧洲央行资产负债表规模（按当期汇率换算）',
    source: 'ECB / FRED: ECBASSETSW',
    impl: 'v2',
  },
  ecb_deposit_rate: {
    key: 'ecb_deposit_rate', label: 'ECB 存款利率', unit: '%',
    description: '欧洲央行存款便利利率，欧元区货币宽松程度的核心指标',
    source: 'ECB',
    impl: 'v2',
  },
  dxy: {
    key: 'dxy', label: '美元指数 DXY', unit: 'index',
    description: '美元对一篮子货币的综合强弱，影响全球美元流动性',
    source: 'yfinance: DX-Y.NYB',
    impl: 'v1_now',
  },
  usd_jpy: {
    key: 'usd_jpy', label: 'USD/JPY', unit: 'index',
    description: '日元汇率；贬值时 BOJ 宽松可能输出流动性',
    source: 'yfinance: JPY=X',
    impl: 'v2',
  },
  eur_usd: {
    key: 'eur_usd', label: 'EUR/USD', unit: 'index',
    description: '欧元美元汇率，反映跨大西洋流动性格局',
    source: 'yfinance: EURUSD=X',
    impl: 'v2',
  },

  /* ── Economy: Growth ── */
  gdp_growth: {
    key: 'gdp_growth', label: 'GDP 增速 (QoQ ann.)', unit: 'YoY%',
    description: '美国实际 GDP 季环比年化增速',
    source: 'FRED: GDPC1 (quarterly)',
    impl: 'v2',
  },
  recession_probability: {
    key: 'recession_probability', label: '衰退概率 (NY Fed)', unit: '%',
    description: '纽约联储基于收益率曲线的 12 个月衰退概率',
    source: 'FRED: RECPROUSM156N (monthly)',
    impl: 'v2',
  },
  ism_manufacturing: {
    key: 'ism_manufacturing', label: 'ISM 制造业 PMI', unit: 'index',
    description: '制造业景气指数；>50 扩张，<50 收缩',
    source: 'FRED: ISMMAN (monthly)',
    impl: 'v1_now',
  },
  ism_services: {
    key: 'ism_services', label: 'ISM 服务业 PMI', unit: 'index',
    description: '服务业景气指数；>50 扩张，<50 收缩',
    source: 'FRED: ISMSVC (monthly)',
    impl: 'v1_now',
  },
  retail_sales_yoy: {
    key: 'retail_sales_yoy', label: '零售销售 MoM', unit: 'MoM%',
    description: '月度零售销售环比变化，衡量消费端活力',
    source: 'FRED: RSXFSN (monthly)',
    impl: 'v1_now',
  },
  industrial_production_yoy: {
    key: 'industrial_production_yoy', label: '工业产出 YoY', unit: 'YoY%',
    description: '工业生产指数同比变化',
    source: 'FRED: INDPRO (monthly)',
    impl: 'v1_now',
  },
  consumer_confidence: {
    key: 'consumer_confidence', label: '消费者信心指数', unit: 'index',
    description: 'Conference Board 消费者信心，领先消费支出约 3 个月',
    source: 'Conference Board / FRED: CONCCONF',
    impl: 'v2',
  },
  leading_economic_index: {
    key: 'leading_economic_index', label: '领先经济指数 LEI', unit: 'index',
    description: 'Conference Board 综合领先指数，领先经济拐点 6-9 个月',
    source: 'FRED: USSLIND (monthly)',
    impl: 'v2',
  },

  /* ── Economy: Employment ── */
  unemployment_rate: {
    key: 'unemployment_rate', label: '失业率 UNRATE', unit: '%',
    description: 'U-3 失业率；Fed 第二工作目标',
    source: 'FRED: UNRATE (monthly)',
    impl: 'v1_now',
  },
  nonfarm_payrolls: {
    key: 'nonfarm_payrolls', label: '非农就业人数 MoM', unit: 'K',
    description: '月度非农新增就业人数',
    source: 'FRED: PAYEMS (monthly)',
    impl: 'v1_now',
  },
  initial_claims: {
    key: 'initial_claims', label: '初请失业金 IC4WSA', unit: 'K',
    description: '4 周移动平均首次申请失业救济人数',
    source: 'FRED: IC4WSA (weekly)',
    impl: 'v1_now',
  },
  continuing_claims: {
    key: 'continuing_claims', label: '持续申请失业金', unit: 'K',
    description: '持续申请失业金人数，衡量再就业难度',
    source: 'FRED: CCSA (weekly)',
    impl: 'v2',
  },
  jolts_openings: {
    key: 'jolts_openings', label: 'JOLTS 职位空缺', unit: 'K',
    description: '空缺职位数量；衡量劳动需求强度',
    source: 'FRED: JTSJOL (monthly)',
    impl: 'v2',
  },
  average_hourly_earnings: {
    key: 'average_hourly_earnings', label: '平均时薪 YoY', unit: 'YoY%',
    description: '平均时薪同比，衡量工资通胀压力',
    source: 'FRED: CES0500000003 (monthly)',
    impl: 'v2',
  },
  labor_force_participation: {
    key: 'labor_force_participation', label: '劳动参与率 LFPR', unit: '%',
    description: '劳动年龄人口中参与劳动力市场的比例',
    source: 'FRED: CIVPART (monthly)',
    impl: 'v2',
  },

  /* ── Economy: Credit ── */
  hy_spread: {
    key: 'hy_spread', label: 'HY 利差 OAS', unit: 'bps',
    description: '高收益债利差；上行暗示信用压力或避险情绪',
    source: 'FRED: BAMLH0A0HYM2 (daily)',
    impl: 'v2',
  },
  ig_spread: {
    key: 'ig_spread', label: 'IG 利差 OAS', unit: 'bps',
    description: '投资级债利差；反映大企业信用成本',
    source: 'FRED: BAMLC0A0CM (daily)',
    impl: 'v2',
  },
  bbb_spread: {
    key: 'bbb_spread', label: 'BBB 利差', unit: 'bps',
    description: 'BBB 级债券利差（投资级底部），降级风险的先行指标',
    source: 'FRED: BAMLC0A4CBBB (daily)',
    impl: 'v2',
  },
  bank_lending_standards: {
    key: 'bank_lending_standards', label: '银行贷款标准 SLOOS', unit: 'ppt',
    description: '高级贷款官员调查；正值 = 收紧标准（信贷收缩信号）',
    source: 'FRED: DRTSCILM (quarterly)',
    impl: 'v2',
  },

  /* ── InflationRates: Inflation ── */
  cpi_yoy: {
    key: 'cpi_yoy', label: 'CPI 同比', unit: 'YoY%',
    description: 'CPI All Urban Consumers YoY，最广泛引用的通胀指标',
    source: 'FRED: CPIAUCSL (monthly)',
    impl: 'v1_now',
  },
  core_cpi_yoy: {
    key: 'core_cpi_yoy', label: '核心 CPI 同比', unit: 'YoY%',
    description: '剔除食品和能源的 CPI 同比，更稳定的通胀核心',
    source: 'FRED: CPILFESL (monthly)',
    impl: 'v1_later',
  },
  pce_core_yoy: {
    key: 'pce_core_yoy', label: '核心 PCE 同比', unit: 'YoY%',
    description: 'Fed 官方通胀参考指标；目标 2%',
    source: 'FRED: PCEPILFE (monthly)',
    impl: 'v1_now',
  },
  ppi_yoy: {
    key: 'ppi_yoy', label: 'PPI 同比', unit: 'YoY%',
    description: '生产者价格指数同比，领先 CPI 约 2-3 个月',
    source: 'FRED: PPIACO (monthly)',
    impl: 'v2',
  },
  shelter_inflation: {
    key: 'shelter_inflation', label: '住房通胀 YoY', unit: 'YoY%',
    description: '住房分项占 CPI 权重约 1/3，是核心 CPI 粘性关键来源',
    source: 'FRED: CUSR0000SAH1 (monthly)',
    impl: 'v2',
  },
  supercore_inflation: {
    key: 'supercore_inflation', label: 'SuperCore 通胀', unit: 'YoY%',
    description: '剔除住房的核心服务通胀，Fed Main Street 关注指标',
    source: 'BLS (calculated)',
    impl: 'v2',
  },
  inflation_expectations_1y: {
    key: 'inflation_expectations_1y', label: '1年通胀预期', unit: '%',
    description: '密歇根大学/纽约联储 1 年期消费者通胀预期',
    source: 'FRED: MICH / EXPINF1YR',
    impl: 'v2',
  },
  inflation_expectations_5y: {
    key: 'inflation_expectations_5y', label: '5年通胀预期', unit: '%',
    description: '市场对长期通胀的定价，锚定通胀预期是否牢固',
    source: 'FRED: T5YIE (5Y Breakeven)',
    impl: 'v2',
  },

  /* ── InflationRates: Rates ── */
  fed_funds_rate: {
    key: 'fed_funds_rate', label: '联邦基金利率', unit: '%',
    description: '当前 FOMC 政策利率目标区间上限',
    source: 'FRED: DFEDTARU (daily)',
    impl: 'v1_later',
  },
  us2y_yield: {
    key: 'us2y_yield', label: '2Y 美债收益率', unit: '%',
    description: '对联储政策预期最敏感的利率',
    source: 'yfinance: ^IRX',
    impl: 'v1_now',
  },
  us10y_yield: {
    key: 'us10y_yield', label: '10Y 美债收益率', unit: '%',
    description: '全球最重要的折现率参考利率',
    source: 'yfinance: ^TNX',
    impl: 'v1_now',
  },
  us30y_yield: {
    key: 'us30y_yield', label: '30Y 美债收益率', unit: '%',
    description: '长期利率预期，抵押贷款利率基准',
    source: 'FRED: DGS30 (daily)',
    impl: 'v1_later',
  },
  term_spread_10y_2y: {
    key: 'term_spread_10y_2y', label: '10Y-2Y 期限利差', unit: 'bps',
    description: '收益率曲线斜率；倒挂历史上领先衰退 12-18 个月',
    source: 'Calculated: TNX − IRX',
    impl: 'v1_now',
  },
  real_yield_10y: {
    key: 'real_yield_10y', label: '10Y 实际利率 TIPS', unit: '%',
    description: '名义利率扣除通胀预期；黄金和股权估值的重要驱动',
    source: 'FRED: DFII10 (daily)',
    impl: 'v2',
  },
  breakeven_10y: {
    key: 'breakeven_10y', label: '10Y 盈亏平衡通胀率', unit: '%',
    description: '市场对未来 10 年年化通胀的定价',
    source: 'FRED: T10YIE (daily)',
    impl: 'v2',
  },
  sofr: {
    key: 'sofr', label: 'SOFR 利率', unit: '%',
    description: '担保隔夜融资利率，替代 LIBOR 的美元基准利率',
    source: 'FRED: SOFR (daily)',
    impl: 'v2',
  },

  /* ── InflationRates: Commodities ── */
  wti_crude: {
    key: 'wti_crude', label: 'WTI 原油', unit: 'USD',
    description: '美国基准原油价格，直接影响能源通胀',
    source: 'yfinance: CL=F',
    impl: 'v1_later',
  },
  brent_crude: {
    key: 'brent_crude', label: 'Brent 原油', unit: 'USD',
    description: '全球基准原油价格',
    source: 'yfinance: BZ=F',
    impl: 'v1_later',
  },
  natural_gas: {
    key: 'natural_gas', label: '天然气', unit: 'USD',
    description: '天然气期货；欧洲通胀敏感指标',
    source: 'yfinance: NG=F',
    impl: 'v2',
  },
  copper: {
    key: 'copper', label: '铜价', unit: 'USD',
    description: '经济活动的领先指标（"铜博士"）',
    source: 'yfinance: HG=F',
    impl: 'v2',
  },
  gold: {
    key: 'gold', label: '黄金', unit: 'USD',
    description: '通胀 / 避险资产；与实际利率反向',
    source: 'yfinance: GC=F',
    impl: 'v1_later',
  },
  broad_commodity_index: {
    key: 'broad_commodity_index', label: '商品综合指数', unit: 'index',
    description: '布隆伯格商品指数，综合能源+金属+农产品',
    source: 'Calculated / Bloomberg',
    impl: 'v2',
  },

  /* ── Sentiment: Fear & Greed ── */
  fear_greed_index: {
    key: 'fear_greed_index', label: '恐惧贪婪指数', unit: 'index',
    description: 'CNN Fear & Greed Index (0=极度恐惧, 100=极度贪婪)',
    source: 'CNN Market API / internal scraper',
    impl: 'v1_now',
  },
  put_call_ratio: {
    key: 'put_call_ratio', label: 'Put/Call 比率', unit: 'ratio',
    description: 'CBOE 期权 Put/Call 成交量比；>1 = 防御情绪',
    source: 'Internal fetch: put_call_ratio',
    impl: 'v1_now',
  },
  junk_bond_demand: {
    key: 'junk_bond_demand', label: '高收益债需求', unit: 'bps',
    description: '高收益债利差反向衡量市场风险偏好',
    source: 'FRED: BAMLH0A0HYM2',
    impl: 'v2',
  },
  safe_haven_demand: {
    key: 'safe_haven_demand', label: '避险需求', unit: 'ratio',
    description: '国债 vs 股票 3 个月相对表现，衡量避险情绪',
    source: 'Calculated',
    impl: 'v2',
  },
  stock_price_breadth: {
    key: 'stock_price_breadth', label: '涨跌广度 A/D', unit: 'ratio',
    description: 'NYSE 上涨股/下跌股比，衡量市场参与广度',
    source: 'Calculated / external data',
    impl: 'v2',
  },
  market_momentum: {
    key: 'market_momentum', label: '市场动能', unit: 'index',
    description: 'SPX vs 125日移动平均比较，衡量趋势强度',
    source: 'Calculated: SPX / SMA125',
    impl: 'v2',
  },

  /* ── Sentiment: Volatility ── */
  vix: {
    key: 'vix', label: 'VIX 隐含波动率', unit: 'index',
    description: 'S&P 500 30 日隐含波动率；> 30 = 极端恐慌',
    source: 'yfinance: ^VIX',
    impl: 'v1_now',
  },
  vxn: {
    key: 'vxn', label: 'VXN 纳指波动率', unit: 'index',
    description: 'NASDAQ 100 隐含波动率，科技板块风险代理',
    source: 'Internal fetch: vxn',
    impl: 'v1_now',
  },
  gvz: {
    key: 'gvz', label: 'GVZ 黄金波动率', unit: 'index',
    description: '黄金期权隐含波动率，避险资产压力指标',
    source: 'Internal fetch: gvz',
    impl: 'v1_now',
  },
  vvix: {
    key: 'vvix', label: 'VVIX (VIX of VIX)', unit: 'index',
    description: 'VIX 期权的隐含波动率；衡量尾部风险定价',
    source: 'CBOE',
    impl: 'v2',
  },
  move_index: {
    key: 'move_index', label: 'MOVE 债市波动率', unit: 'index',
    description: '美债期权隐含波动率，利率不确定性代理',
    source: 'ICE / Bloomberg',
    impl: 'v2',
  },
  vix_term_structure: {
    key: 'vix_term_structure', label: 'VIX 期限结构', unit: 'ratio',
    description: '近月 VIX / 远月 VIX；倒挂 = 事件性而非周期性恐慌',
    source: 'Calculated: VIX / VX3M',
    impl: 'v2',
  },
  skew_index: {
    key: 'skew_index', label: 'SKEW 尾部风险指数', unit: 'index',
    description: 'CBOE SKEW；高值 = 市场为左尾事件定价保险',
    source: 'CBOE',
    impl: 'v2',
  },

  /* ── Sentiment: Risk Appetite ── */
  high_beta_vs_low_vol: {
    key: 'high_beta_vs_low_vol', label: '高Beta/低波动相对强弱', unit: 'ratio',
    description: '高 Beta 股 vs 低波动股，衡量风险偏好质量',
    source: 'Calculated: SPHB / SPLV',
    impl: 'v2',
  },
  small_caps_vs_large: {
    key: 'small_caps_vs_large', label: '小盘 vs 大盘', unit: 'ratio',
    description: '小盘股相对大盘股表现，衡量市场风险承受',
    source: 'Calculated: IWM / SPY',
    impl: 'v2',
  },
  growth_vs_value: {
    key: 'growth_vs_value', label: '成长 vs 价值', unit: 'ratio',
    description: '成长 vs 价值风格轮动，对利率敏感',
    source: 'Calculated: IVW / IVE',
    impl: 'v2',
  },
  equity_fund_flows: {
    key: 'equity_fund_flows', label: '股票基金净流入', unit: 'B USD',
    description: '周度股票 ETF/基金净资金流向',
    source: 'ICI / EPFR (weekly)',
    impl: 'v2',
  },
  advance_decline_line: {
    key: 'advance_decline_line', label: '涨跌线 A/D Line', unit: 'pts',
    description: 'NYSE 涨跌线，市场广度先行指标',
    source: 'Calculated: cumulative A/D',
    impl: 'v2',
  },
};

/* ═══════════════════════════════════════════════════════════════════
   Domain / Dimension / Section Config
   ═══════════════════════════════════════════════════════════════════ */

export const MACRO_IA: MacroIAConfig = {
  metrics: METRIC_REGISTRY,
  domains: [

    /* ─────────────────────────────────────────────────────────
       DOMAIN 1: LIQUIDITY
       ───────────────────────────────────────────────────────── */
    {
      id: 'liquidity',
      urlSlug: 'liquidity',
      title: '流动性',
      coreQuestion: '市场上的钱是多了还是少了？利率环境在收紧还是放松？',
      description: '资金供给与成本条件是风险资产的底色',
      dimensions: [
        {
          id: 'us',
          urlSlug: 'us',
          moduleIds: ['net_liquidity', 'balance_sheet', 'm2', 'financial_conditions'],
          title: '美国流动性',
          question: '美联储净流动性向上还是向下？资金成本贵不贵？',
          thesis: '美联储净流动性（WALCL−TGA−RRP）是风险资产的直接底色，与资产价格高度正相关',
          impl: 'v1_now',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '美国流动性当前处于什么状态？',
              impl: 'v1_now',
              blocks: [
                { id: 'hero', type: 'hero', metrics: ['us_net_liquidity', 'dxy'], impl: 'v1_now' },
                { id: 'snapshot', type: 'snapshot', metrics: ['walcl', 'tga_balance', 'rrp_balance'], impl: 'v1_now' },
              ],
            },
            {
              id: 'fedSystem',
              title: '美联储系统',
              question: '美联储的资产负债表在扩张还是收缩？三大资金池如何流动？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['walcl', 'tga_balance', 'rrp_balance', 'reserve_balances_with_fed'],
                  impl: 'v1_now',
                },
                { id: 'chart_walcl', type: 'chart', metrics: ['walcl'], impl: 'v1_now' },
              ],
            },
            {
              id: 'fundingConditions',
              title: '资金成本条件',
              question: '企业和个人的借贷成本有多贵？金融条件在松还是在紧？',
              impl: 'v1_later',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['us10y_yield', 'term_spread_10y_2y', 'dxy', 'financial_conditions_index'],
                  impl: 'v1_later',
                },
              ],
            },
            {
              id: 'liquiditySignals',
              title: '流动性信号',
              question: '资金条件的综合信号是支撑还是压制风险资产？',
              impl: 'v1_later',
              blocks: [
                { id: 'aiBrief', type: 'aiBrief', metrics: [], impl: 'v1_later' },
                { id: 'riskWatch', type: 'riskWatch', metrics: [], impl: 'v1_later' },
              ],
            },
          ],
        },
        {
          id: 'global',
          urlSlug: 'global',
          moduleIds: ['global_liquidity'],
          title: '全球流动性',
          question: '全球主要央行在扩张还是收缩流动性？',
          thesis: 'G3 央行（Fed + ECB + BOJ）的协同行动决定全球美元流动性基调',
          impl: 'v2',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '全球流动性指数当前方向？',
              impl: 'v2',
              blocks: [
                { id: 'hero', type: 'hero', metrics: ['global_liquidity_index', 'dxy'], impl: 'v2' },
              ],
            },
            {
              id: 'globalLiquidityIndex',
              title: '全球流动性指数',
              question: 'G3 中央银行合并资产负债表净变化？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['global_liquidity_index', 'boj_balance_sheet', 'ecb_balance_sheet'],
                  impl: 'v2',
                },
              ],
            },
            {
              id: 'japan',
              title: '日本央行 BOJ',
              question: 'BOJ 的宽松/加息路径如何影响全球资金流？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['boj_balance_sheet', 'boj_policy_rate', 'usd_jpy'],
                  impl: 'v2',
                },
              ],
            },
            {
              id: 'europe',
              title: '欧洲央行 ECB',
              question: 'ECB 的政策如何影响欧元流动性和全球资产？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['ecb_balance_sheet', 'ecb_deposit_rate', 'eur_usd'],
                  impl: 'v2',
                },
              ],
            },
          ],
        },
      ],
    },

    /* ─────────────────────────────────────────────────────────
       DOMAIN 2: ECONOMY
       ───────────────────────────────────────────────────────── */
    {
      id: 'economy',
      urlSlug: 'economy',
      title: '经济',
      coreQuestion: '经济动能是在延续还是走弱？就业与消费是否支撑盈利预期？',
      description: '实体经济基本面是企业盈利和资产估值周期的终极驱动力',
      dimensions: [
        {
          id: 'growth',
          urlSlug: 'growth',
          moduleIds: ['growth', 'growth_pending', 'market_proxy'],
          title: '增长动能',
          question: '经济活动是在扩张还是收缩？软硬数据信号是否一致？',
          thesis: 'PMI < 50 往往领先企业盈利下调 2-3 个季度，是最重要的景气先行指标',
          impl: 'v1_now',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '当前经济增长动能总体如何？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'snapshot', type: 'snapshot',
                  metrics: ['ism_manufacturing', 'ism_services', 'industrial_production_yoy'],
                  impl: 'v1_now',
                },
              ],
            },
            {
              id: 'activity',
              title: '景气活跃度',
              question: '制造业与服务业的扩张/收缩状态？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['ism_manufacturing', 'ism_services'],
                  impl: 'v1_now',
                },
                { id: 'chart_ism_m', type: 'chart', metrics: ['ism_manufacturing'], impl: 'v1_now' },
              ],
            },
            {
              id: 'demand',
              title: '需求端',
              question: '消费和工业需求是否支撑经济继续扩张？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['retail_sales_yoy', 'industrial_production_yoy', 'consumer_confidence'],
                  impl: 'v1_now',
                },
              ],
            },
            {
              id: 'leadingSignals',
              title: '领先信号',
              question: '领先指标（LEI / 衰退概率）在释放什么前瞻信号？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['leading_economic_index', 'recession_probability', 'gdp_growth'],
                  impl: 'v2',
                },
              ],
            },
          ],
        },
        {
          id: 'employment',
          urlSlug: 'employment',
          moduleIds: ['labor'],
          title: '就业市场',
          question: '就业市场是否出现实质性松动？工资增速是否仍是通胀粘性来源？',
          thesis: '就业市场是消费端韧性的基础，也是 Fed 双重使命的第二目标',
          impl: 'v1_now',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '当前就业市场整体健康程度？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'snapshot', type: 'snapshot',
                  metrics: ['unemployment_rate', 'nonfarm_payrolls', 'initial_claims'],
                  impl: 'v1_now',
                },
              ],
            },
            {
              id: 'payrolls',
              title: '就业人数',
              question: '非农就业是否持续增加？新增速度是否支撑消费？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['nonfarm_payrolls', 'average_hourly_earnings', 'labor_force_participation'],
                  impl: 'v1_now',
                },
                { id: 'chart_payrolls', type: 'chart', metrics: ['nonfarm_payrolls'], impl: 'v1_now' },
              ],
            },
            {
              id: 'laborStress',
              title: '就业压力指标',
              question: '初请失业金和职位空缺在发出什么压力信号？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['initial_claims', 'continuing_claims', 'jolts_openings'],
                  impl: 'v1_now',
                },
                { id: 'chart_ic', type: 'chart', metrics: ['initial_claims'], impl: 'v1_now' },
              ],
            },
          ],
        },
        {
          id: 'credit',
          urlSlug: 'credit',
          moduleIds: ['credit_spreads'],
          title: '信用条件',
          question: '企业融资成本和银行信贷标准是否释放金融压力？债务偿付压力上升了吗？',
          thesis: '信用利差是金融压力的先行指标，HY 利差大幅收窄或扩张往往预示市场拐点',
          impl: 'v2',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '当前信用状况宽松还是收紧？',
              impl: 'v2',
              blocks: [
                {
                  id: 'snapshot', type: 'snapshot',
                  metrics: ['hy_spread', 'ig_spread', 'bbb_spread'],
                  impl: 'v2',
                },
              ],
            },
            {
              id: 'spreads',
              title: '信用利差',
              question: 'HY/IG 利差处于历史什么分位？是否出现明显趋势？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['hy_spread', 'ig_spread', 'bbb_spread'],
                  impl: 'v2',
                },
              ],
            },
            {
              id: 'defaultsAndFinancing',
              title: '信贷标准与违约',
              question: '银行是否收紧贷款标准？企业违约率是否抬升？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['bank_lending_standards'],
                  impl: 'v2',
                },
              ],
            },
          ],
        },
      ],
    },

    /* ─────────────────────────────────────────────────────────
       DOMAIN 3: INFLATION & RATES
       ───────────────────────────────────────────────────────── */
    {
      id: 'inflationRates',
      urlSlug: 'inflation-rates',
      title: '通胀与利率',
      coreQuestion: '通胀是否还在压制降息？利率路径是否逐步清晰？',
      description: '通胀粘性决定 Fed 政策空间，进而决定资产估值上限',
      dimensions: [
        {
          id: 'inflation',
          urlSlug: 'inflation',
          moduleIds: ['inflation'],
          title: '物价压力',
          question: '通胀是否还在给降息创造阻力？去通胀进程可持续吗？',
          thesis: 'CPI/PCE 的粘性决定 Fed 的政策空间，高通胀 = 高利率 = 低估值上限',
          impl: 'v1_now',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '当前通胀水平处于什么区间？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'snapshot', type: 'snapshot',
                  metrics: ['cpi_yoy', 'pce_core_yoy', 'core_cpi_yoy'],
                  impl: 'v1_now',
                },
              ],
            },
            {
              id: 'cpi',
              title: 'CPI 分析',
              question: 'CPI 和核心 CPI 的趋势与分项？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['cpi_yoy', 'core_cpi_yoy', 'shelter_inflation'],
                  impl: 'v1_now',
                },
                { id: 'chart_cpi', type: 'chart', metrics: ['cpi_yoy'], impl: 'v1_now' },
              ],
            },
            {
              id: 'pce',
              title: 'PCE 分析',
              question: 'Fed 首选的 PCE 指标路径如何？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['pce_core_yoy', 'supercore_inflation'],
                  impl: 'v1_now',
                },
                { id: 'chart_pce', type: 'chart', metrics: ['pce_core_yoy'], impl: 'v1_now' },
              ],
            },
            {
              id: 'inflationBreakdown',
              title: '通胀预期',
              question: '通胀预期是否已被锚定？短期与长期预期是否出现分歧？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['inflation_expectations_1y', 'inflation_expectations_5y', 'breakeven_10y'],
                  impl: 'v2',
                },
              ],
            },
          ],
        },
        {
          id: 'rates',
          urlSlug: 'rates',
          moduleIds: ['rates'],
          title: '利率定价',
          question: '市场如何定价降息预期？曲线形态在传递什么经济信号？',
          thesis: '利率曲线形态和实际利率是资产估值的折现率输入，影响所有久期资产',
          impl: 'v1_now',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '当前美债收益率曲线状态？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'snapshot', type: 'snapshot',
                  metrics: ['us2y_yield', 'us10y_yield', 'term_spread_10y_2y'],
                  impl: 'v1_now',
                },
              ],
            },
            {
              id: 'fedPolicy',
              title: '联储政策路径',
              question: 'Fed 当前利率政策立场？降息路径是否已被清晰定价？',
              impl: 'v1_later',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['fed_funds_rate', 'sofr'],
                  impl: 'v1_later',
                },
              ],
            },
            {
              id: 'treasuryCurve',
              title: '国债曲线',
              question: '收益率曲线形态（正常/倒挂/平坦）在释放什么信号？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['us2y_yield', 'us10y_yield', 'us30y_yield', 'term_spread_10y_2y'],
                  impl: 'v1_now',
                },
                { id: 'chart_10y', type: 'chart', metrics: ['us10y_yield'], impl: 'v1_now' },
              ],
            },
            {
              id: 'realRates',
              title: '实际利率',
              question: '扣除通胀后，实际利率是否仍在抑制增长和成长资产？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['real_yield_10y', 'breakeven_10y'],
                  impl: 'v2',
                },
              ],
            },
          ],
        },
        {
          id: 'commodities',
          urlSlug: 'commodities',
          moduleIds: ['commodities'],
          title: '大宗商品',
          question: '能源和金属价格变化是否会推升通胀？大宗商品是否在发出经济信号？',
          thesis: '原油价格是通胀最直接的传导变量，铜价则是经济活动的领先信号',
          impl: 'v1_later',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '大宗商品整体动向？',
              impl: 'v1_later',
              blocks: [
                {
                  id: 'snapshot', type: 'snapshot',
                  metrics: ['wti_crude', 'gold', 'copper'],
                  impl: 'v1_later',
                },
              ],
            },
            {
              id: 'energy',
              title: '能源',
              question: '油价走势对通胀路径有何影响？',
              impl: 'v1_later',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['wti_crude', 'brent_crude', 'natural_gas'],
                  impl: 'v1_later',
                },
              ],
            },
            {
              id: 'metals',
              title: '金属',
              question: '黄金和铜在传递什么宏观信号？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['gold', 'copper', 'broad_commodity_index'],
                  impl: 'v2',
                },
              ],
            },
          ],
        },
      ],
    },

    /* ─────────────────────────────────────────────────────────
       DOMAIN 4: SENTIMENT
       ───────────────────────────────────────────────────────── */
    {
      id: 'sentiment',
      urlSlug: 'sentiment',
      title: '市场情绪',
      coreQuestion: '市场在恐慌还是贪婪？短期定价是否偏离基本面？',
      description: '情绪极端往往是均值回归的预兆，提供逆向操作机会',
      dimensions: [
        {
          id: 'fearGreed',
          urlSlug: 'fear-greed',
          moduleIds: ['positioning'],
          title: '恐惧贪婪',
          question: '当前市场情绪处于恐惧、贪婪还是中性？是否出现极端读数？',
          thesis: 'CNN F&G 指数低于 25 时往往是中期底部，高于 75 时拥挤风险上升',
          impl: 'v1_now',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '恐惧贪婪综合读数当前处于什么区间？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'hero', type: 'hero',
                  metrics: ['fear_greed_index', 'vix'],
                  impl: 'v1_now',
                },
              ],
            },
            {
              id: 'sevenSignals',
              title: '七大子信号',
              question: '构成恐惧贪婪指数的七个子信号分别指向什么方向？',
              impl: 'v2',  // needs full CNN signal breakdown
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: [
                    'market_momentum', 'stock_price_breadth', 'put_call_ratio',
                    'junk_bond_demand', 'safe_haven_demand',
                  ],
                  impl: 'v2',
                },
              ],
            },
          ],
        },
        {
          id: 'volatility',
          urlSlug: 'volatility',
          moduleIds: ['volatility'],
          title: '波动率',
          question: '市场在为多大的尾部风险定价？是事件性还是周期性恐慌？',
          thesis: 'VIX 期限结构形态是判断市场风险性质（事件性 vs 周期性）的关键信号',
          impl: 'v1_now',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '当前波动率水平与历史分位？',
              impl: 'v1_now',
              blocks: [
                {
                  id: 'snapshot', type: 'snapshot',
                  metrics: ['vix', 'vxn', 'gvz'],
                  impl: 'v1_now',
                },
              ],
            },
            {
              id: 'vixVvix',
              title: 'VIX & VVIX',
              question: 'VIX 的波动率（VVIX）在告诉我们什么？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['vix', 'vvix', 'move_index'],
                  impl: 'v2',
                },
              ],
            },
            {
              id: 'volTermStructure',
              title: '期限结构',
              question: 'VIX 近月与远月的关系在释放什么前瞻信号？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['vix_term_structure', 'skew_index'],
                  impl: 'v2',
                },
              ],
            },
          ],
        },
        {
          id: 'riskAppetite',
          urlSlug: 'risk-appetite',
          moduleIds: ['risk_appetite'],
          title: '风险偏好',
          question: '资金流向高风险资产还是避险资产？市场广度是否支撑当前趋势？',
          thesis: '风险偏好轮动（高Beta/小盘/成长 vs 避险）是市场结构健康程度的关键验证',
          impl: 'v2',
          sections: [
            {
              id: 'overview',
              title: '概览',
              question: '风险偏好整体倾向于进攻还是防守？',
              impl: 'v2',
              blocks: [
                {
                  id: 'snapshot', type: 'snapshot',
                  metrics: ['high_beta_vs_low_vol', 'small_caps_vs_large', 'growth_vs_value'],
                  impl: 'v2',
                },
              ],
            },
            {
              id: 'breadthAndOptions',
              title: '广度与期权',
              question: '市场广度是否支撑指数新高？期权定价是否出现过度单边？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['advance_decline_line', 'put_call_ratio', 'stock_price_breadth'],
                  impl: 'v2',
                },
              ],
            },
            {
              id: 'creditAndSafeHaven',
              title: '信用与避险资产',
              question: '资金是在流向高收益债/股票，还是转向黄金/美债等避险资产？',
              impl: 'v2',
              blocks: [
                {
                  id: 'metricGrid', type: 'metricGrid',
                  metrics: ['junk_bond_demand', 'safe_haven_demand', 'equity_fund_flows'],
                  impl: 'v2',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/* ═══════════════════════════════════════════════════════════════════
   Accessor Helpers
   ═══════════════════════════════════════════════════════════════════ */

/** Look up a domain by URL slug */
export function getDomain(urlSlug: string): DomainDef | undefined {
  return MACRO_IA.domains.find((d) => d.urlSlug === urlSlug);
}

/** Look up a dimension within a domain by URL slug */
export function getDimension(domainSlug: string, dimSlug: string): DimensionDef | undefined {
  return getDomain(domainSlug)?.dimensions.find((d) => d.urlSlug === dimSlug);
}

/** Get all metrics for a dimension (flattened, deduplicated) */
export function getDimensionMetrics(domainSlug: string, dimSlug: string): MetricDef[] {
  const dim = getDimension(domainSlug, dimSlug);
  if (!dim) return [];
  const keys = new Set<string>();
  dim.sections.forEach((s) =>
    s.blocks.forEach((b) =>
      b.metrics.forEach((k) => keys.add(k)),
    ),
  );
  return [...keys].map((k) => MACRO_IA.metrics[k]).filter((m): m is MetricDef => m !== undefined);
}

/** Get all metrics for a section */
export function getSectionMetrics(
  domainSlug: string,
  dimSlug: string,
  sectionId: string,
): MetricDef[] {
  const dim = getDimension(domainSlug, dimSlug);
  if (!dim) return [];
  const section = dim.sections.find((s) => s.id === sectionId);
  if (!section) return [];
  const keys = new Set<string>();
  section.blocks.forEach((b) => b.metrics.forEach((k) => keys.add(k)));
  return [...keys].map((k) => MACRO_IA.metrics[k]).filter((m): m is MetricDef => m !== undefined);
}

/** Get implementation scope for a dimension */
export function getDimImplScope(domainSlug: string, dimSlug: string): ImplScope {
  return getDimension(domainSlug, dimSlug)?.impl ?? 'schema_only';
}

/** Check if a metric is currently live */
export function isMetricLive(key: string): boolean {
  return MACRO_IA.metrics[key]?.impl === 'v1_now';
}
