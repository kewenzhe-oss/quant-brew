/**
 * dimensionDetail.ts
 * Pure function — no hooks, no API calls, no side effects.
 *
 * Narrative template contract:
 *
 * Every DimensionDetailView must support:
 * 1. coreQuestion      — the framing question at the top of the page
 * 2. verdict           — top-level judgment (status / signal / confidence / one-liner)
 *                        CONCLUSION FIRST, evidence second
 * 3. interpretation    — 当前状况 / 近期趋势 / 未来展望
 * 4. modules[]         — 2–4 causal modules (NOT a flat indicator list)
 *    Each module has:
 *      moduleQuestion  — "这个板块看什么"
 *      investImplication — "投资含义"
 *      metrics[]
 *      chartMetricKey / chartLabel
 * 5. watchpoints / risks
 */

import type {
  MarketIntelligenceSnapshot,
  DimensionKey,
  DimensionAssessment,
  DimensionStatus,
  DimensionSignal,
  DimensionChange,
  DimensionMetric,
} from './types';

import {
  DIMENSION_LABELS,
  DIMENSION_DATA_QUALITY,
  DATA_QUALITY_LABELS,
  STATUS_LABELS,
  SIGNAL_LABELS,
  CHANGE_LABELS,
} from './constants';

import type { DimensionDataQuality } from './constants';

/* ═══════════════════════════════════════════════════════
   Public types — narrative template contract
   ═══════════════════════════════════════════════════════ */

export interface DimensionDetailView {
  key: DimensionKey;
  title: string;

  /** 1. Page framing question — "这个维度在回答什么问题？" */
  coreQuestion: string;

  /** 2. Top-level verdict — conclusion first */
  verdict: DimensionVerdict;

  /** 3. Three-part interpretation */
  interpretation: DimensionInterpretation;

  /** 4. Causal modules — explanatory groupings, NOT a flat indicator list */
  modules: DimensionModule[];

  /** 5. Forward-looking anchors */
  watchpoints: string[];
  risks: string[];
}

export interface DimensionVerdict {
  status: DimensionStatus;
  statusLabel: string;
  signal: DimensionSignal;
  signalLabel: string;
  change: DimensionChange;
  changeLabel: string;
  confidence: number;
  dataQuality: DimensionDataQuality;
  dataQualityLabel: string;
  /** One-line summary: the judgment in one sentence */
  oneLiner: string;
}

export interface DimensionInterpretation {
  current: string;   // 当前状况
  trend: string;     // 近期趋势
  outlook: string;   // 未来展望
}

export interface DimensionModule {
  id: string;
  /** Module name — also the causal category */
  title: string;
  /** "这个板块看什么" — what this module measures */
  moduleQuestion: string;
  /** "投资含义" — what rising/falling this metric implies for positioning */
  investImplication: string;
  metrics: DimensionMetric[];
  chartMetricKey: string | null;
  chartLabel: string;
}

/* Backwards-compat alias so any code using the old name still compiles */
export type DimensionDetailSection = DimensionModule;

/* ═══════════════════════════════════════════════════════
   Entry point
   ═══════════════════════════════════════════════════════ */

export function buildDimensionDetail(
  key: DimensionKey,
  snapshot: MarketIntelligenceSnapshot,
): DimensionDetailView {
  const dim: DimensionAssessment = snapshot.macro[key];

  return {
    key,
    title: DIMENSION_LABELS[key],
    coreQuestion: CORE_QUESTIONS[key],
    verdict: buildVerdict(key, dim),
    interpretation: buildInterpretation(key, dim),
    modules: buildModules(key, dim),
    watchpoints: dim.watchpoints ?? [],
    risks: dim.risks ?? [],
  };
}

/* ═══════════════════════════════════════════════════════
   1. Core questions per dimension
   ═══════════════════════════════════════════════════════ */

const CORE_QUESTIONS: Record<DimensionKey, string> = {
  liquidity:       '市场上的钱是多了还是少了？',
  economy:         '经济健康度是在变好还是变差？',
  inflation_rates: '物价压力如何，美联储会怎么做？',
  sentiment:       '市场在恐慌还是贪婪？',
};

/* ═══════════════════════════════════════════════════════
   2. Verdict — conclusion first
   ═══════════════════════════════════════════════════════ */

function buildVerdict(key: DimensionKey, dim: DimensionAssessment): DimensionVerdict {
  return {
    status: dim.status,
    statusLabel: STATUS_LABELS[dim.status],
    signal: dim.signal,
    signalLabel: SIGNAL_LABELS[dim.signal],
    change: dim.change,
    changeLabel: CHANGE_LABELS[dim.change],
    confidence: dim.confidence,
    dataQuality: DIMENSION_DATA_QUALITY[key],
    dataQualityLabel: DATA_QUALITY_LABELS[DIMENSION_DATA_QUALITY[key]],
    oneLiner: buildOneLiner(key, dim),
  };
}

function buildOneLiner(key: DimensionKey, dim: DimensionAssessment): string {
  const status = dim.status;
  const change = dim.change;

  switch (key) {
    case 'liquidity': {
      const us10y = dim.metrics.find((m) => m.key === 'us10y');
      if (!us10y) return '流动性数据不足，评估受限。';
      const level = us10y.value > 4.5 ? '偏高位' : us10y.value < 3.5 ? '低位' : '中性区间';
      return `10年期美债 ${us10y.value.toFixed(2)}%，处于${level}，` +
        (change === 'improving' ? '资金成本趋于缓和，流动性边际改善。' :
         change === 'weakening'  ? '利率上行，流动性趋紧。' :
                                   '金融条件窄幅震荡，无明显方向性变化。');
    }
    case 'economy': {
      const pmi = dim.metrics.find((m) => m.key === 'ism_pmi');
      if (!pmi) return `经济以市场代理评估，动能${status === 'healthy' ? '偏正' : status === 'watch' ? '偏弱' : '中性'}。`;
      return `ISM PMI ${pmi.value.toFixed(1)}，` +
        (pmi.value >= 50 ? '处于扩张区间' : '处于收缩区间') + '，' +
        (change === 'improving' ? '动能改善，软着陆路径延续。' :
         change === 'weakening'  ? '动能走弱，衰退风险需关注。' :
                                   '增速相对稳定，无强烈趋向。');
    }
    case 'inflation_rates': {
      const us10y = dim.metrics.find((m) => m.key === 'us10y');
      const cpi = dim.metrics.find((m) => m.key === 'cpi_yoy');
      if (cpi) return `CPI同比 ${cpi.value.toFixed(1)}%，` +
        (dim.signal === 'risk_headwind' ? '通胀粘性制约降息，利率维持高位压制估值。' :
         dim.signal === 'risk_supportive' ? '去通胀路径清晰，降息逻辑有效。' :
                                             '通胀路径不明，联储等待数据确认。');
      if (us10y) return `10年期美债 ${us10y.value.toFixed(2)}%，` +
        (dim.signal === 'risk_headwind' ? '利率高位持续，成长风格承压。' : '利率回落，估值空间改善。');
      return '通胀与利率数据不足，评估受限。';
    }
    case 'sentiment': {
      const vix = dim.metrics.find((m) => m.key === 'vix');
      const fg = dim.metrics.find((m) => m.key === 'fear_greed');
      if (!vix) return '情绪指标暂缺，评估受限。';
      return `VIX ${vix.value.toFixed(1)}` +
        (fg ? `，贪婪指数 ${fg.value}` : '') + '。' +
        (status === 'healthy' ? '情绪偏乐观未极端，风险偏好良好。' :
         status === 'watch'   ? '情绪升温，拥挤度需关注。' :
         status === 'pressured' ? '恐慌主导，防守优先。' :
                                  '情绪中性，无强烈方向。');
    }
  }
}

/* ═══════════════════════════════════════════════════════
   3. Interpretation — 当前 / 趋势 / 展望
   ═══════════════════════════════════════════════════════ */

function buildInterpretation(key: DimensionKey, dim: DimensionAssessment): DimensionInterpretation {
  switch (key) {
    case 'liquidity':       return buildLiquidityInterpretation(dim);
    case 'economy':         return buildEconomyInterpretation(dim);
    case 'inflation_rates': return buildInflationInterpretation(dim);
    case 'sentiment':       return buildSentimentInterpretation(dim);
  }
}

function buildLiquidityInterpretation(dim: DimensionAssessment): DimensionInterpretation {
  const us10y  = dim.metrics.find((m) => m.key === 'us10y');
  const spread = dim.metrics.find((m) => m.key === 'yield_spread_2s10s');

  const current = us10y
    ? `10年期名义利率处于 ${us10y.value.toFixed(2)}% 水位。` +
      (spread
        ? spread.value > 0
          ? ` 收益率曲线利差已转正（${spread.value.toFixed(0)}bps），倒挂结束，流动性传导改善。`
          : ` 曲线仍倒挂（${spread.value.toFixed(0)}bps），金融体系存在系统性压力信号。`
        : '')
    : '利率数据暂缺，流动性评估受限。';

  return {
    current,
    trend:
      dim.change === 'improving' ? '长端收益率回落，金融条件边际改善，资金成本压力趋缓。'
      : dim.change === 'weakening' ? '长端收益率上行，金融条件趋紧，资产估值面临折现率抬升压力。'
      : '利率环境窄幅震荡，流动性边际变化有限。',
    outlook:
      dim.status === 'healthy'   ? '流动性环境相对宽松，当前信号支持风险偏好维持。'
      : dim.status === 'watch'   ? '流动性条件边际收紧，需关注后续利率与信用利差动向以判断是否恶化。'
      : dim.status === 'pressured' ? '流动性明显承压，金融条件收紧可能传导至信贷与风险资产，防守优先。'
      : '流动性条件中性，无强烈方向性信号，保持观察。',
  };
}

function buildEconomyInterpretation(dim: DimensionAssessment): DimensionInterpretation {
  const pmi    = dim.metrics.find((m) => m.key === 'ism_pmi');
  const claims = dim.metrics.find((m) => m.key === 'initial_claims');
  const gdp    = dim.metrics.find((m) => m.key === 'gdp_nowcast');

  const current = pmi
    ? `ISM制造业PMI ${pmi.value.toFixed(1)}，${pmi.value >= 50 ? '处于扩张区间' : '处于收缩区间'}。` +
      (claims ? ` 初请失业金 ${claims.value}K，劳动力市场${claims.value < 250 ? '维持健康' : '开始松动'}。` : '') +
      (gdp    ? ` GDP Nowcast指向 ${gdp.value.toFixed(1)}% 增速。` : '')
    : `经济维度当前通过市场指数广度代理评估（置信度 ${dim.confidence}%），实体数据暂未接入。`;

  return {
    current,
    trend:
      dim.change === 'improving' ? '经济动能改善，领先指标转向扩张区间，软着陆路径延续。'
      : dim.change === 'weakening' ? '经济动能走弱，需警惕领先指标进一步恶化触发衰退定价。'
      : '经济增速相对稳定，无明显趋向性变化。',
    outlook:
      dim.status === 'healthy' ? '当前经济基本面支撑企业盈利与风险偏好，无需防御。'
      : dim.status === 'watch'   ? '增长动能存在隐患，关注后续PMI与就业数据是否持续走弱。'
      : '经济下行压力明显，防御性配置逻辑增强。',
  };
}

function buildInflationInterpretation(dim: DimensionAssessment): DimensionInterpretation {
  const cpi   = dim.metrics.find((m) => m.key === 'cpi_yoy');
  const pce   = dim.metrics.find((m) => m.key === 'pce_core_yoy');
  const us10y = dim.metrics.find((m) => m.key === 'us10y');

  const current = cpi || pce
    ? [
        cpi   ? `CPI同比 ${cpi.value.toFixed(1)}%`   : '',
        pce   ? `核心PCE ${pce.value.toFixed(1)}%`    : '',
        us10y ? `10Y美债 ${us10y.value.toFixed(2)}%` : '',
      ].filter(Boolean).join('，') + '。'
    : `通胀与利率维度目前以名义利率作为代理（置信度 ${dim.confidence}%）。`;

  return {
    current,
    trend:
      dim.change === 'improving' ? '通胀高峰已过，去通胀进程延续，利率下行路径逐步清晰。'
      : dim.change === 'weakening' ? '通胀路径出现反弹迹象，降息预期面临重新定价压力。'
      : '通胀降温节奏放缓，联储处于观望状态，利率路径存在不确定性。',
    outlook:
      dim.signal === 'risk_headwind'   ? '通胀粘性制约降息进度，利率高位持续将压制成长风格估值。'
      : dim.signal === 'risk_supportive' ? '去通胀进程清晰，降息路径已基本定价，利率环境对风险资产友好。'
      : '通胀与利率路径尚不明朗，保持中性等待更多数据确认。',
  };
}

function buildSentimentInterpretation(dim: DimensionAssessment): DimensionInterpretation {
  const vix = dim.metrics.find((m) => m.key === 'vix');
  const fg  = dim.metrics.find((m) => m.key === 'fear_greed');
  const pc  = dim.metrics.find((m) => m.key === 'put_call_ratio');

  const current = vix
    ? `VIX ${vix.value.toFixed(1)}` +
      (fg ? `，恐惧贪婪指数 ${fg.value}（${fg.context ?? ''}）` : '') +
      (pc ? `，Put/Call比率 ${pc.value.toFixed(2)}` : '') + '。'
    : '情绪指标暂缺，维度评估受限。';

  return {
    current,
    trend:
      dim.change === 'improving' ? '波动率回落，情绪从恐慌中修复，风险偏好逐步回升。'
      : dim.change === 'weakening' ? '情绪指标恶化，恐慌情绪蔓延，市场避险情绪上升。'
      : '情绪指标总体稳定，市场参与者处于观望状态。',
    outlook:
      dim.status === 'healthy'   ? '情绪偏乐观但未极端，当前信号支持风险偏好维持。'
      : dim.status === 'watch'   ? '情绪升温，拥挤度提升，需关注动量反转风险。'
      : dim.status === 'pressured' ? '恐慌情绪主导，建议防守，等待波动率高峰信号出现后再考虑布局。'
      : '情绪中性，无强烈方向性信号。',
  };
}

/* ═══════════════════════════════════════════════════════
   4. Causal modules — explanatory groups, not flat lists
   ═══════════════════════════════════════════════════════ */

function buildModules(key: DimensionKey, dim: DimensionAssessment): DimensionModule[] {
  switch (key) {
    case 'liquidity':       return buildLiquidityModules(dim);
    case 'economy':         return buildEconomyModules(dim);
    case 'inflation_rates': return buildInflationModules(dim);
    case 'sentiment':       return buildSentimentModules(dim);
  }
}

/* ── 流动性 modules — four causal steps ── */

function buildLiquidityModules(dim: DimensionAssessment): DimensionModule[] {
  // Separate: real (financial conditions proxies) vs. not-yet-real (balance sheet)
  const financialConditionsMetrics = dim.metrics.filter((m) =>
    ['us10y', 'yield_spread_2s10s', 'dxy'].includes(m.key),
  );

  return [

    /* 01 净流动性 — market-usable money (WALCL − TGA − RRP) */
    {
      id: 'net_liquidity',
      title: '01  净流动性',
      moduleQuestion: '扣除财政部账户与逆回购后，市场上实际可流通的资金净额是多少？',
      investImplication:
        '净流动性上升 → 市场可用资金增加，风险资产倾向于上涨。\n净流动性下降 → 市场资金收缩，即使指数表面稳定，流动性条件已收紧。\n公式：净流动性 = WALCL（美联储总资产）− TGA（财政部账户）− RRP（隔夜逆回购）',
      metrics: [], // WALCL, TGA, RRP — not in API yet
      chartMetricKey: 'net_liquidity',
      chartLabel: '美国净流动性走势',
    },

    /* 02 资产负债表 — source and drain mechanics */
    {
      id: 'balance_sheet',
      title: '02  资产负债表',
      moduleQuestion: '美联储在扩张还是收缩？财政部和逆回购在吸收还是释放流动性？',
      investImplication:
        'WALCL 扩张 → 美联储注资，流动性来源增加。\nTGA 上升 → 财政部积累资金，从市场吸收流动性。\nRRP 下降 → 货币市场基金将资金从美联储转回市场，净流动性增加。\nWRESBAL 下降 → 银行准备金减少，信贷扩张空间收窄。',
      metrics: [], // WALCL, TGA, RRP, WRESBAL — not in API yet
      chartMetricKey: 'walcl',
      chartLabel: '美联储总资产（WALCL）走势',
    },

    /* 03 货币供应 M2 — transmission to broad money */
    {
      id: 'm2',
      title: '03  货币供应 M2',
      moduleQuestion: '流动性投入是否已从金融体系传导至更广泛的货币与信贷供给？',
      investImplication:
        'M2 同比由负转正 → 实体经济货币供给恢复增长，信贷扩张信号。\nM2 持续收缩或停滞 → 货币传导受阻，实体流动性偏紧，抑制消费与投资。\n注意：M2 变化通常滞后于美联储操作 6–12 个月。',
      metrics: [], // M2SL — not in API yet
      chartMetricKey: 'm2sl',
      chartLabel: 'M2 货币供应同比走势',
    },

    /* 04 金融条件 — price and difficulty of money */
    {
      id: 'financial_conditions',
      title: '04  金融条件',
      moduleQuestion: '资金现在是便宜还是昂贵？借贷成本是否对消费和投资形成压制？',
      investImplication:
        '10Y 收益率上行 → 折现率抬升，长久期资产（成长股、债券）估值承压。\n曲线深度倒挂 → 历史上领先衰退 12–18 个月，信贷传导受阻。\nDXY 走强 → 全球美元流动性回流，新兴市场及大宗商品承压。\nSOFR / NFCI 数据接入后将量化实际借贷成本与整体金融条件松紧度。',
      metrics: financialConditionsMetrics, // real: 10Y, spread, DXY
      chartMetricKey: 'us10y',
      chartLabel: '10Y 美债收益率',
    },

  ];
}

/* ── 经济 modules ── */

function buildEconomyModules(dim: DimensionAssessment): DimensionModule[] {
  const growthMetrics = dim.metrics.filter((m) =>
    ['ism_pmi', 'gdp_nowcast', 'industrial_production'].includes(m.key),
  );
  const laborMetrics = dim.metrics.filter((m) =>
    ['initial_claims', 'unemployment_rate', 'nonfarm_payrolls'].includes(m.key),
  );
  const indexMetrics = dim.metrics.filter((m) => m.key.startsWith('idx_'));

  const modules: DimensionModule[] = [];

  if (growthMetrics.length > 0) {
    modules.push({
      id: 'growth',
      title: '增长动能',
      moduleQuestion: '实体经济处于扩张还是收缩？制造业与服务业的活跃度如何？',
      investImplication: 'PMI > 50 + 上行 → 经济加速，周期/成长享受盈利预期修复。\nPMI < 50 + 下行 → 衰退信号，防御板块相对抗跌。',
      metrics: growthMetrics,
      chartMetricKey: 'ism_pmi',
      chartLabel: 'ISM 制造业 PMI',
    });
  }

  if (laborMetrics.length > 0) {
    modules.push({
      id: 'labor',
      title: '就业市场',
      moduleQuestion: '消费者端的经济韧性是否依然完好？劳动市场是否开始松动？',
      investImplication: '初请失业金上升 → 就业市场松动，消费韧性受损，衰退预警升级。\n低位稳定 → 消费端稳健，经济软着陆叙事维持。',
      metrics: laborMetrics,
      chartMetricKey: 'initial_claims',
      chartLabel: '初请失业金（周度）',
    });
  }

  if (indexMetrics.length > 0) {
    modules.push({
      id: 'market_proxy',
      title: '市场代理（增长预期）',
      moduleQuestion: '在缺乏直接经济数据的情况下，宽基指数的广度表现反映了什么？',
      investImplication: '宽基指数同步下行 → 市场定价增长放缓，盈利预期下修压力。\n同步上行 + 广度强 → 市场整体乐观，增长预期改善。\n注意：代理精度低于直接 PMI / 就业数据，谨慎解读。',
      metrics: indexMetrics,
      chartMetricKey: null,
      chartLabel: '',
    });
  }

  if (modules.length === 0) {
    modules.push({
      id: 'proxy',
      title: '市场代理指标（增长预期）',
      moduleQuestion: '当前经济实体数据暂未接入，宽基指数广度作为临时代理。',
      investImplication: '置信度较低，仅供参考方向。实体数据接入后将替换本模块。',
      metrics: dim.metrics,
      chartMetricKey: null,
      chartLabel: '',
    });
  }

  return modules;
}

/* ── 通胀与利率 modules ── */

function buildInflationModules(dim: DimensionAssessment): DimensionModule[] {
  const inflationMetrics = dim.metrics.filter((m) =>
    ['cpi_yoy', 'pce_core_yoy', 'breakeven_5y', 'breakeven_10y'].includes(m.key),
  );
  const ratesMetrics = dim.metrics.filter((m) =>
    ['us10y', 'us2y', 'yield_spread_2s10s'].includes(m.key),
  );

  const modules: DimensionModule[] = [];

  modules.push({
    id: 'inflation',
    title: '物价压力',
    moduleQuestion: '通胀是否还在给美联储施压？去通胀进程是否可持续？',
    investImplication: 'CPI / 核心PCE 粘性高 → 降息延迟 → 高利率持续 → 成长/长久期资产承压。\n通胀持续回落 + 接近 2% → 降息路径打开 → 利率敏感资产估值修复。',
    metrics: inflationMetrics.length > 0 ? inflationMetrics : dim.metrics.slice(0, 2),
    chartMetricKey: 'cpi_yoy',
    chartLabel: 'CPI 同比',
  });

  if (ratesMetrics.length > 0) {
    modules.push({
      id: 'rates',
      title: '利率定价',
      moduleQuestion: '市场如何定价降息预期？曲线形态在传递什么经济信号？',
      investImplication: '10Y 上行 → 债券贬值，股票折现率抬升，特别压制高估值板块。\n曲线转正（2s10s > 0）→ 衰退信号解除，复苏预期定价开始。\n曲线深度倒挂 → 经济前景悲观，历史上领先衰退 12–18 个月。',
      metrics: ratesMetrics,
      chartMetricKey: 'us10y',
      chartLabel: '10Y 美债收益率',
    });
  }

  return modules;
}

/* ── 情绪 modules ── */

function buildSentimentModules(dim: DimensionAssessment): DimensionModule[] {
  const volatilityMetrics = dim.metrics.filter((m) =>
    ['vix', 'vxn', 'gvz'].includes(m.key),
  );
  const positioningMetrics = dim.metrics.filter((m) =>
    ['fear_greed', 'put_call_ratio', 'aaii_bull_bear'].includes(m.key),
  );

  const modules: DimensionModule[] = [];

  modules.push({
    id: 'volatility',
    title: '波动率',
    moduleQuestion: '市场在为多大程度的风险事件定价保险？波动率曲线在释放什么信号？',
    investImplication: 'VIX > 30 → 极端恐慌，历史上往往是反向买入机会，但需确认系统性风险未升级。\nVIX < 15 → 市场定价平稳，但过度低波动率可能是拥挤前兆，尾险低价。\nVIX 期限结构倒挂 → 短期恐慌超过长期 → 市场认为事件性风险而非周期性衰退。',
    metrics: volatilityMetrics.length > 0 ? volatilityMetrics : dim.metrics.slice(0, 1),
    chartMetricKey: 'vix',
    chartLabel: 'VIX 隐含波动率',
  });

  if (positioningMetrics.length > 0) {
    modules.push({
      id: 'positioning',
      title: '情绪与持仓',
      moduleQuestion: '资金在恐慌还是贪婪？仓位拥挤度是否到达均值回归的临界点？',
      investImplication: '贪婪指数 > 75 → 情绪过热，拥挤风险上升，动量策略面临逆转风险。\n恐惧指数 < 25 → 情绪低谷，历史上往往伴随超跌反弹机会。\nPut/Call 偏低 → 市场看涨拥挤，Gamma 挤压风险需关注。',
      metrics: positioningMetrics,
      chartMetricKey: 'fear_greed',
      chartLabel: '恐惧贪婪指数',
    });
  }

  return modules;
}
