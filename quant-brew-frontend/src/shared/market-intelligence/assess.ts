/**
 * Phase C — rule-based macro dimension assessment from real API shapes.
 * No LLM. Inputs: MarketOverview + SentimentData (same as normalize).
 * Output: MacroDimensions matching the shared schema exactly.
 */

import type { MarketOverview, SentimentData } from '@/shared/api/types';
import type {
  MacroDimensions,
  DimensionAssessment,
  DimensionMetric,
  MacroVerdict,
  DimensionStatus,
  DimensionSignal,
  DimensionChange,
  VerdictStance,
} from './types';

export function canAssessMacro(
  overview: MarketOverview | undefined,
  sentiment: SentimentData | undefined,
): boolean {
  return !!sentiment || !!(overview?.us_indices?.length);
}

export function assessMacroDimensions(
  overview: MarketOverview | undefined,
  sentiment: SentimentData | undefined,
): MacroDimensions {
  const liquidity = assessLiquidity(sentiment);
  const economy = assessEconomy(overview);
  const inflationRates = assessInflationRates(sentiment);
  const sentimentDim = assessSentimentDimension(sentiment);

  const overall_verdict = aggregateVerdict({
    liquidity,
    economy,
    inflation_rates: inflationRates,
    sentiment: sentimentDim,
  });

  return {
    liquidity,
    economy,
    inflation_rates: inflationRates,
    sentiment: sentimentDim,
    overall_verdict,
  };
}

/* ── Liquidity
 *
 * True liquidity inputs (WALCL, TGA, RRP, WRESBAL, M2SL, SOFR, EFFR, NFCI)
 * are not available in the current API pipeline.
 *
 * Available proxy: 10Y yield + yield curve spread from SentimentData.
 * These are correctly classified as `金融条件` (financial conditions) inputs,
 * not direct balance-sheet liquidity data.
 *
 * The assessment is marked as partial/proxy until real Fed data is connected.
 * Confidence is capped at 45 to reflect this.
 */

function assessLiquidity(s: SentimentData | undefined): DimensionAssessment {
  if (!s?.us10y) {
    return placeholderDimension(
      'liquidity',
      '流动性核心数据（WALCL / TGA / RRP / M2）尚未接入，评估受限。',
    );
  }

  const y10       = s.us10y.value;
  const y10Change = s.us10y.change;
  const spread    = s.yield_curve?.spread;
  const dxy       = s.dxy;

  // Financial conditions proxy metrics (all that's available now)
  const metrics: DimensionMetric[] = [
    {
      key: 'us10y',
      label: '10Y 美债（金融条件代理）',
      value: y10,
      unit: '%',
      change: y10Change,
      change_unit: '%',
      context: y10Change < -0.01 ? '收益率回落，金融条件偏松' : y10Change > 0.01 ? '收益率上行，资金成本抬升' : '窄幅震荡',
    },
  ];

  if (spread !== undefined) {
    metrics.push({
      key: 'yield_spread_2s10s',
      label: '2s10s 利差（曲线形态）',
      value: spread,
      unit: 'bps',
      change: null,
      change_unit: 'bps',
      context: spread > 0 ? '曲线转正，倒挂解除' : spread < -20 ? '深度倒挂，流动性收紧信号' : '倒挂收窄中',
    });
  }

  if (dxy) {
    metrics.push({
      key: 'dxy',
      label: '美元指数（全球流动性代理）',
      value: dxy.value,
      unit: 'index',
      change: dxy.change,
      change_unit: 'pts',
      context: dxy.change_percent > 0.3 ? '美元走强，全球流动性收紧压力上升' : dxy.change_percent < -0.3 ? '美元走弱，全球流动性压力缓释' : '美元窄幅震荡',
    });
  }

  // Status derived from financial conditions proxy (partial confidence only)
  let status: DimensionStatus = 'neutral';
  let signal: DimensionSignal = 'mixed';
  let change: DimensionChange = 'stable';

  if (y10Change < -0.02) {
    change = 'improving';
    signal = 'risk_supportive';
    status = 'neutral'; // cannot say "healthy" without real liquidity data
  } else if (y10Change > 0.03 || (spread !== undefined && spread < -30)) {
    change = 'weakening';
    signal = 'risk_headwind';
    status = 'watch';
  }

  const why_it_matters = [
    '净流动性（WALCL − TGA − RRP）是市场可用资金的最直接度量，但该数据尚未接入。',
    '当前以10Y收益率与曲线形态作为金融条件的部分代理，置信度受限。',
    'M2货币供应量（M2SL）与准备金余额（WRESBAL）将在数据接入后补充本维度。',
  ];

  const risks: string[] = [];
  if (y10Change > 0.03) risks.push('金融条件代理显示收紧，实际净流动性状态待真实数据确认。');
  if (spread !== undefined && spread < -20) risks.push('曲线深度倒挂暗示流动性传导受阻。');

  const watchpoints = [
    '美联储资产负债表（WALCL）周度更新：净扩张或收缩方向',
    '财政部TGA账户余额变化：余额下降释放流动性，上升吸收流动性',
    '隔夜逆回购（RRP）存量：余额持续下降意味着流动性从美联储释放回市场',
    'M2同比增速是否出现正增长拐点',
  ];

  // Confidence hard-capped at 45 — proxy only, no real liquidity data yet
  const confidence = 45;
  const summary =
    `当前流动性评估以金融条件代理（10Y ${y10.toFixed(2)}%` +
    (spread !== undefined ? `，曲线利差 ${spread.toFixed(0)}bps` : '') +
    `）为基础，置信度受限（${confidence}%）。` +
    `净流动性核心指标（WALCL/TGA/RRP）数据接入后将替换本评估。`;

  return {
    status,
    signal,
    change,
    confidence,
    summary,
    metrics,
    why_it_matters,
    risks,
    watchpoints,
  };
}

/* ── Economy (index breadth proxy; no PMI in API) ── */


function assessEconomy(o: MarketOverview | undefined): DimensionAssessment {
  const indices = o?.us_indices?.slice(0, 5) ?? [];
  if (indices.length === 0) {
    return placeholderDimension(
      'economy',
      '暂无主要指数数据，经济增长预期以指数表现为代理指标。',
    );
  }

  const avgChg =
    indices.reduce((acc, x) => acc + x.change_percent, 0) / indices.length;

  const metrics: DimensionMetric[] = indices.slice(0, 3).map((idx) => ({
    key: `idx_${idx.symbol ?? idx.name}`,
    label: idx.name,
    value: idx.price,
    unit: 'pts',
    change: idx.change_percent,
    change_unit: '%',
    context: `${idx.change_percent >= 0 ? '上涨' : '下跌'} ${Math.abs(idx.change_percent).toFixed(2)}%`,
  }));

  let status: DimensionStatus = 'neutral';
  let signal: DimensionSignal = 'mixed';
  let change: DimensionChange = 'stable';

  if (avgChg > 0.4) {
    status = 'healthy';
    signal = 'risk_supportive';
    change = 'improving';
  } else if (avgChg < -0.4) {
    status = 'watch';
    signal = 'risk_headwind';
    change = 'weakening';
  }

  const why_it_matters = [
    '宏观经济基本面是企业盈利和资产周期的终极驱动力。',
    '当前系统尚未接入实时的 PMI / 职位空缺 / GDP Nowcast 数据，因此经济增长预期以美股核心宽基指数的广度表现（Index Breadth）作为代理指标。',
  ];

  const risks = [];
  if (avgChg < -0.4) risks.push('宽基指数同步走弱，可能定价了短期的衰退风险。');
  if (indices.length < 3) risks.push('核心指数样本不足，经济动能代理数据的置信度受限。');

  const watchpoints = [
    'ISM 制造业/非制造业 PMI 读数的衰退预警线 (50)',
    '每周初请失业金人数是否出现非线性上升',
  ];

  const summary =
    `宽基指数平均涨跌幅 ${avgChg >= 0 ? '+' : ''}${avgChg.toFixed(2)}%，` +
    (avgChg > 0.4 ? '整体偏多，增长预期相对乐观。' : avgChg < -0.4 ? '宽基走弱，增长预期趋于谨慎。' : '涨跌互现，动能中性。') +
    ` 当前以指数广度作为经济动能代理（置信度 45%，实体数据接入后更新）。`;

  return {
    status,
    signal,
    change,
    // 45 = index-breadth proxy only; will increase when PMI/jobless data is connected
    confidence: 45,
    summary,
    metrics,
    why_it_matters,
    risks,
    watchpoints,
  };
}

/* ── Inflation & rates (10Y + curve) ── */

function assessInflationRates(s: SentimentData | undefined): DimensionAssessment {
  if (!s?.us10y) {
    return placeholderDimension(
      'inflation_rates',
      '暂无利率数据，通胀与利率环境评估受限。',
    );
  }

  const y10 = s.us10y.value;
  const spread = s.yield_curve?.spread;

  const metrics: DimensionMetric[] = [
    {
      key: 'us10y',
      label: '10Y 美债（通胀预期锚）',
      value: y10,
      unit: '%',
      change: s.us10y.change,
      change_unit: '%',
      context: y10 > 4.5 ? '名义利率偏高区间' : y10 > 3.5 ? '中性偏高' : '相对温和',
    },
  ];

  if (spread !== undefined) {
    metrics.push({
      key: 'yield_spread_2s10s',
      label: '曲线利差',
      value: spread,
      unit: 'bps',
      change: null,
      change_unit: 'bps',
      context: spread < 0 ? '曲线倒挂，关注衰退与通胀路径' : '倒挂缓解',
    });
  }

  let status: DimensionStatus = 'neutral';
  let signal: DimensionSignal = 'mixed';
  let change: DimensionChange = 'stable';

  if (y10 > 4.6 && (spread === undefined || spread < -20)) {
    status = 'watch';
    signal = 'risk_headwind';
  } else if (s.us10y.change < -0.02) {
    change = 'improving';
    signal = 'risk_supportive';
  } else if (s.us10y.change > 0.03) {
    change = 'weakening';
  }

  const why_it_matters = [
    '高通胀会迫使央行收紧货币政策，压制估值；而在去通胀周期，利率回落往往提供估值支撑。',
    '当前系统暂无实时盈亏平衡通胀率先行数据，故使用名义利率水位结合倒挂形态作为通胀及降息路径重定价的代理测度。',
  ];

  const risks = [];
  if (y10 > 4.6) risks.push('名义利率长期处于偏高区间，可能触发再通胀担忧。');
  if (s.us10y.change > 0.03) risks.push('短线利率快速上升对成长股风格形成估值逆风。');

  const watchpoints = [
    '核心 CPI 与 PCE 环比数据是否出现粘性反弹',
    '大宗商品（特别是能源与工业金属）的共振上涨信号',
  ];

  const summary =
    `10年期美债 ${y10.toFixed(2)}%` +
    (signal === 'risk_headwind' ? '，利率偏高区间，通胀路径存在不确定性。' : signal === 'risk_supportive' ? '，利率回落，去通胀叙事延续。' : '，利率中性震荡，等待通胀数据确认。') +
    (spread !== undefined ? ` 曲线利差 ${spread.toFixed(0)}bps。` : '');

  return {
    status,
    signal,
    change,
    confidence: spread !== undefined ? 66 : 52,
    summary,
    metrics,
    why_it_matters,
    risks,
    watchpoints,
  };
}

/* ── Sentiment (VIX, F&G, put/call) ── */

function assessSentimentDimension(s: SentimentData | undefined): DimensionAssessment {
  if (!s?.vix) {
    return placeholderDimension(
      'sentiment',
      '暂无波动率与情绪指标，情绪维度评估受限。',
    );
  }

  const vix = s.vix.value;
  const fg = s.fear_greed?.value;
  const pc = s.put_call_ratio?.value;

  const metrics: DimensionMetric[] = [
    {
      key: 'vix',
      label: 'VIX',
      value: vix,
      unit: 'index',
      change: s.vix.change,
      change_unit: '%',
      context: vix < 16 ? '隐含波动偏低' : vix < 22 ? '中性区间' : vix < 30 ? '波动抬升' : '恐慌抬升',
    },
  ];

  if (fg !== undefined) {
    metrics.push({
      key: 'fear_greed',
      label: '恐惧贪婪指数',
      value: fg,
      unit: 'index',
      change: fg - (s.fear_greed?.previous ?? fg),
      change_unit: 'pts',
      context: s.fear_greed?.label ?? '',
    });
  }

  if (pc !== undefined) {
    metrics.push({
      key: 'put_call_ratio',
      label: 'Put/Call 比率',
      value: pc,
      unit: 'ratio',
      change: null,
      change_unit: 'pts',
      context: pc < 0.85 ? '看涨期权偏多' : pc > 1.1 ? '看跌对冲偏多' : '中性',
    });
  }

  let status: DimensionStatus = 'neutral';
  if (vix < 15) status = 'healthy';
  else if (vix < 20) status = 'neutral';
  else if (vix < 28) status = 'watch';
  else status = 'pressured';

  let signal: DimensionSignal = 'mixed';
  if (vix < 18 && (fg === undefined || (fg >= 40 && fg <= 75))) {
    signal = 'risk_supportive';
  } else if (vix > 25 || (fg !== undefined && fg < 30)) {
    signal = 'defensive';
  } else if (vix > 20) {
    signal = 'risk_headwind';
  }

  let change: DimensionChange = 'stable';
  if (s.vix.change_percent < -3) change = 'improving';
  else if (s.vix.change_percent > 3) change = 'weakening';

  const why_it_matters = [
    '情绪维度反映了资金的交易拥挤度和风险偏好的瞬时温度。极端情绪往往预示着均值回归。',
    '当前由 VIX (期权隐含波动)、恐慌贪婪指数及 Put/Call 仓位构建的情绪矩阵体系属于高置信度的直接观测数据，未经代理转换。',
  ];

  const risks = [];
  if (vix > 25) risks.push('隐含波动率急剧抬升，市场存在抛售踩踏风险。');
  if (fg !== undefined && fg > 75) risks.push('贪婪指数过高，需警惕动量透支带来的拥挤度平仓。');
  if (pc !== undefined && pc < 0.7) risks.push('看涨期权交易极度拥挤，随时面临 Gamma 挤压逆转。');

  const watchpoints = [
    'VIX 期限结构是否形成倒挂（即短期恐慌超过中长期）',
    '动量反冲：高 Beta 板块是否出现放量滞涨',
  ];

  const summary =
    `VIX ${vix.toFixed(1)}` +
    (fg !== undefined ? `，恐惧贪婪指数 ${fg}（${metrics.find((m) => m.key === 'fear_greed')?.context ?? ''}）` : '') +
    (pc !== undefined ? `，Put/Call ${pc.toFixed(2)}` : '') +
    `。${status === 'healthy' ? '情绪偏乐观，风险偏好良好。' : status === 'watch' ? '情绪升温，关注动量逆转风险。' : status === 'pressured' ? '恐慌情绪主导，建议谨慎。' : '情绪中性，无强烈方向性信号。'}`;

  return {
    status,
    signal,
    change,
    confidence: fg !== undefined && pc !== undefined ? 78 : fg !== undefined ? 72 : 65,
    summary,
    metrics,
    why_it_matters,
    risks,
    watchpoints,
  };
}

function placeholderDimension(
  kind: 'liquidity' | 'economy' | 'inflation_rates' | 'sentiment',
  summary: string,
): DimensionAssessment {
  const labels: Record<typeof kind, string> = {
    liquidity: '流动性',
    economy: '经济',
    inflation_rates: '通胀与利率',
    sentiment: '情绪',
  };
  return {
    status: 'neutral',
    signal: 'mixed',
    change: 'stable',
    confidence: 35,
    summary: `${labels[kind]}：${summary}`,
    metrics: [],
    why_it_matters: ['当前数据源未能解析该维度的必要指标。'],
    risks: [],
    watchpoints: [],
  };
}

/* ── Aggregate verdict ── */

type DimPick = Pick<MacroDimensions, 'liquidity' | 'economy' | 'inflation_rates' | 'sentiment'>;

function signalScore(sig: DimensionSignal): number {
  switch (sig) {
    case 'risk_supportive':
      return 1;
    case 'mixed':
      return 0;
    case 'risk_headwind':
      return -1;
    case 'defensive':
      return -2;
  }
}

function aggregateVerdict(d: DimPick): MacroVerdict {
  const scores = [
    signalScore(d.liquidity.signal),
    signalScore(d.economy.signal),
    signalScore(d.inflation_rates.signal),
    signalScore(d.sentiment.signal),
  ];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  let stance: VerdictStance = 'neutral';
  if (avg >= 0.75) stance = 'offensive';
  else if (avg >= 0.25) stance = 'cautious_offensive';
  else if (avg <= -0.75) stance = 'defensive';
  else if (avg <= -0.25) stance = 'cautious_defensive';

  const confidences = [
    d.liquidity.confidence,
    d.economy.confidence,
    d.inflation_rates.confidence,
    d.sentiment.confidence,
  ];
  const confidence = Math.round(
    confidences.reduce((a, b) => a + b, 0) / confidences.length,
  );

  const one_liner = stanceToOneLiner(stance);
  const rationale = buildRationale(d, stance, avg);

  return {
    stance,
    confidence,
    one_liner,
    rationale,
  };
}

function stanceToOneLiner(stance: VerdictStance): string {
  switch (stance) {
    case 'offensive':
      return '多维度支撑风险偏好，可保持积极仓位';
    case 'cautious_offensive':
      return '谨慎乐观，维持多头但不追涨';
    case 'neutral':
      return '多空因素交织，宜控制仓位与波动';
    case 'cautious_defensive':
      return '逆风因素增多，以防守与减仓为主';
    case 'defensive':
      return '风险偏好受压，优先防守与现金管理';
  }
}

function buildRationale(d: DimPick, stance: VerdictStance, avg: number): string {
  const parts = [
    `流动性：${d.liquidity.summary.slice(0, 80)}…`,
    `经济：${d.economy.summary.slice(0, 80)}…`,
    `通胀与利率：${d.inflation_rates.summary.slice(0, 80)}…`,
    `情绪：${d.sentiment.summary.slice(0, 80)}…`,
  ];
  return `综合信号得分约 ${avg.toFixed(2)}，当前姿态为「${stance}」。${parts.join(' ')}`;
}
