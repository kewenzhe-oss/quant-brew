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
  const economy = assessEconomy(overview, sentiment);
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
 * Data sources (in order of priority):
 *   1. SentimentData.fed_liquidity — WALCL / TGA / RRP from FRED via yfinance
 *      → populates 净流动性 metrics (real/partial)
 *   2. SentimentData.us10y + yield_curve + dxy — financial conditions proxy
 *      → populates 金融条件 metrics (always present if sentiment available)
 *
 * Confidence scale:
 *   all 3 FRED series real → 72
 *   partial FRED            → 58
 *   proxy only              → 45
 *   no data at all          → 35 (placeholder)
 */

function assessLiquidity(s: SentimentData | undefined): DimensionAssessment {
  if (!s?.us10y && !s?.fed_liquidity) {
    return placeholderDimension(
      'liquidity',
      '流动性核心数据（WALCL / TGA / RRP / M2）尚未接入，评估受限。',
    );
  }

  const fed    = s?.fed_liquidity;
  const y10    = s?.us10y?.value;
  const y10Chg = s?.us10y?.change ?? 0;
  const spread = s?.yield_curve?.spread;
  const dxy    = s?.dxy;

  /* ── Build metrics ── */
  const metrics: DimensionMetric[] = [];

  // Real fed balance sheet metrics (when available)
  if (fed?.walcl !== null && fed?.walcl !== undefined) {
    metrics.push({
      key: 'walcl',
      label: '美联储总资产 WALCL',
      value: fed.walcl,
      unit: 'B USD',
      change: null,
      change_unit: 'B USD',
      context: `净流动性基础 — ${fed.walcl > 8000 ? 'QT进行中，较峰值收缩' : '资产负债表相对收缩'}`,
    });
  }

  if (fed?.tga !== null && fed?.tga !== undefined) {
    metrics.push({
      key: 'tga',
      label: '财政部账户 TGA',
      value: fed.tga,
      unit: 'B USD',
      change: null,
      change_unit: 'B USD',
      context: fed.tga > 600 ? '余额偏高，流动性被吸收' : fed.tga < 200 ? '余额偏低，流动性释放压力减轻' : '余额中性',
    });
  }

  if (fed?.rrp !== null && fed?.rrp !== undefined) {
    metrics.push({
      key: 'rrp',
      label: '隔夜逆回购 RRP',
      value: fed.rrp,
      unit: 'B USD',
      change: null,
      change_unit: 'B USD',
      context: fed.rrp < 100 ? 'RRP余额大幅消耗，货币市场流动性已基本回流' : fed.rrp > 500 ? 'RRP余额偏高，流动性仍被锁定在美联储' : 'RRP余额中等',
    });
  }

  if (fed?.net_liquidity !== null && fed?.net_liquidity !== undefined) {
    metrics.push({
      key: 'net_liquidity',
      label: '美国净流动性 (WALCL−TGA−RRP)',
      value: fed.net_liquidity,
      unit: 'B USD',
      change: null,
      change_unit: 'B USD',
      context: fed.net_liquidity > 5500 ? '净流动性宽松' : fed.net_liquidity < 4000 ? '净流动性偏紧' : '净流动性中性',
    });
  }

  // Financial conditions proxy metrics (always show if available)
  if (y10 !== undefined) {
    metrics.push({
      key: 'us10y',
      label: '10Y 美债（金融条件代理）',
      value: y10,
      unit: '%',
      change: y10Chg,
      change_unit: '%',
      context: y10Chg < -0.01 ? '收益率回落，金融条件偏松' : y10Chg > 0.01 ? '收益率上行，资金成本抬升' : '窄幅震荡',
    });
  }

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
      context: (dxy.change_percent ?? 0) > 0.3 ? '美元走强，全球流动性收紧' : (dxy.change_percent ?? 0) < -0.3 ? '美元走弱，全球流动性压力缓释' : '美元窄幅震荡',
    });
  }

  /* ── Status — derived from real fed data when available, proxy otherwise ── */
  let status: DimensionStatus = 'neutral';
  let signal: DimensionSignal = 'mixed';
  let change: DimensionChange = 'stable';

  if (fed?.net_liquidity !== null && fed?.net_liquidity !== undefined) {
    // Derive from real net liquidity
    const net = fed.net_liquidity;
    if (net > 5800) {
      status = 'healthy'; signal = 'risk_supportive'; change = 'improving';
    } else if (net > 4800) {
      status = 'neutral'; signal = 'mixed';
    } else if (net > 3800) {
      status = 'watch'; signal = 'risk_headwind'; change = 'weakening';
    } else {
      status = 'pressured'; signal = 'risk_headwind'; change = 'weakening';
    }
    // Reinforce with financial conditions proxy directional signal
    if (y10 !== undefined && y10Chg < -0.02 && status !== 'pressured') change = 'improving';
    if (y10 !== undefined && y10Chg > 0.03) change = change === 'improving' ? 'stable' : 'weakening';
  } else if (y10 !== undefined) {
    // Financial conditions proxy only
    if (y10Chg < -0.02) { change = 'improving'; signal = 'risk_supportive'; }
    else if (y10Chg > 0.03 || (spread !== undefined && spread < -30)) {
      change = 'weakening'; signal = 'risk_headwind'; status = 'watch';
    }
  }

  /* ── Confidence ── */
  const fedQuality = fed?.data_quality ?? 'unavailable';
  const confidence =
    fedQuality === 'real'        ? 72 :
    fedQuality === 'partial'     ? 58 :
                                   45;  // proxy only

  /* ── Summary ── */
  const hasFed = fed?.net_liquidity !== null && fed?.net_liquidity !== undefined;
  const summary = hasFed
    ? `美国净流动性 ${fed!.net_liquidity!.toFixed(0)}B USD（WALCL ${fed!.walcl ?? '?'}B − TGA ${fed!.tga ?? '?'}B − RRP ${fed!.rrp ?? '?'}B）。` +
      (y10 !== undefined ? ` 金融条件代理：10Y ${y10.toFixed(2)}%。` : '')
    : `流动性评估以金融条件代理（10Y ${y10?.toFixed(2) ?? '?'}%` +
      (spread !== undefined ? `，曲线利差 ${spread.toFixed(0)}bps` : '') +
      `）为基础，置信度受限（${confidence}%）。WALCL/TGA/RRP数据接入后将替换本评估。`;

  const why_it_matters = hasFed
    ? [
        `净流动性 = WALCL（${fed!.walcl ?? '?'}B）− TGA（${fed!.tga ?? '?'}B）− RRP（${fed!.rrp ?? '?'}B）= ${fed!.net_liquidity!.toFixed(0)}B USD。`,
        '净流动性是市场实际可用资金的直接度量，历史上与风险资产表现高度相关（领先约 3–6 个月）。',
      ]
    : [
        '净流动性（WALCL − TGA − RRP）是市场可用资金的最直接度量，但该数据尚未成功接入。',
        '当前以10Y收益率与曲线形态作为金融条件的部分代理，置信度受限。',
      ];

  const risks: string[] = [];
  if (fed?.rrp !== null && fed?.rrp !== undefined && fed.rrp < 50) {
    risks.push('RRP余额接近耗尽，货币市场流动性缓冲已显著减少。');
  }
  if (y10 !== undefined && y10Chg > 0.03) {
    risks.push('金融条件代理显示收紧（10Y快速上行），实际流动性压力待确认。');
  }
  if (spread !== undefined && spread < -20) {
    risks.push('曲线深度倒挂暗示流动性传导受阻。');
  }

  const watchpoints = [
    '美联储资产负债表（WALCL）周度更新：净扩张或收缩方向',
    '财政部TGA账户余额变化：余额下降释放流动性，上升吸收流动性',
    '隔夜逆回购（RRP）存量：余额持续下降意味着流动性从美联储释放回市场',
    'M2同比增速是否出现正增长拐点',
  ];

  return {
    status, signal, change, confidence, summary, metrics,
    why_it_matters, risks, watchpoints,
  };
}

/* ── Economy (primary: FRED employment + growth; fallback: index breadth) ── */

function assessEconomy(
  o: MarketOverview | undefined,
  s: SentimentData | undefined,
): DimensionAssessment {
  const emp    = s?.employment;   // UNRATE / IC4WSA / PAYEMS
  const growth = s?.growth;       // ISM / Retail / IndProd

  const hasEmployment = emp?.data_quality !== 'unavailable' && emp != null;
  const hasGrowth     = growth?.data_quality !== 'unavailable' && growth != null;
  const hasFredData   = hasEmployment || hasGrowth;

  /* ── If no FRED data, fall back to index proxy ── */
  if (!hasFredData) {
    const indices = o?.us_indices?.slice(0, 5) ?? [];
    if (indices.length === 0) {
      return placeholderDimension(
        'economy',
        '经济实时数据（PMI / 就业 / GDP）尚未接入，评估受限。',
      );
    }
    const avgChg = indices.reduce((acc, x) => acc + x.change_percent, 0) / indices.length;
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
    if (avgChg > 0.4) { status = 'healthy'; signal = 'risk_supportive'; change = 'improving'; }
    else if (avgChg < -0.4) { status = 'watch'; signal = 'risk_headwind'; change = 'weakening'; }
    return {
      status, signal, change, confidence: 45,
      summary: `宽基指数均涨跌 ${avgChg >= 0 ? '+' : ''}${avgChg.toFixed(2)}%，` +
        (avgChg > 0.4 ? '增长预期偏乐观。' : avgChg < -0.4 ? '增长预期趋谨慎。' : '动能中性。') +
        ` 当前以指数广度代理经济数据，置信度 45%。`,
      metrics,
      why_it_matters: [
        '宏观经济基本面是企业盈利和资产周期的终极驱动力。',
        '当前 PMI / 就业 / 工业产出数据尚未接入，以美股宽基指数广度作为代理。',
      ],
      risks: avgChg < -0.4 ? ['宽基指数同步走弱，可能定价短期衰退风险。'] : [],
      watchpoints: ['ISM PMI 扩张/收缩临界线 (50)', '初请失业金周度变化'],
    };
  }

  /* ── Primary path: real FRED employment + growth data ── */
  const metrics: DimensionMetric[] = [];

  // --- Employment metrics ---
  if (emp?.unemployment_rate != null) {
    const ur = emp.unemployment_rate;
    metrics.push({
      key: 'unemployment_rate',
      label: `失业率 UNRATE${emp.unemployment_date ? ' (' + emp.unemployment_date + ')' : ''}`,
      value: ur,
      unit: '%',
      change: null,
      change_unit: '%',
      context: ur > 5    ? '失业率偏高，就业市场走弱' :
               ur > 4.5  ? '失业率上升，劳工市场趋于松动' :
               ur > 4    ? '就业市场温和放缓' :
                           '就业市场仍具韧性',
    });
  }

  if (emp?.initial_claims != null) {
    const ic = emp.initial_claims;
    metrics.push({
      key: 'initial_jobless_claims',
      label: `初请失业金 IC4WSA${emp.initial_claims_date ? ' (' + emp.initial_claims_date + ')' : ''}`,
      value: ic,
      unit: 'K',
      change: null,
      change_unit: 'K',
      context: ic > 300  ? '高于 300K 警戒线，就业压力显著' :
               ic > 250  ? '初请数量温和上升，关注趋势' :
                           '初请维持低位，就业市场稳健',
    });
  }

  if (emp?.nonfarm_payrolls_mom != null) {
    const mom = emp.nonfarm_payrolls_mom;
    metrics.push({
      key: 'nonfarm_payrolls',
      label: `非农新增 PAYEMS${emp.nonfarm_payrolls_date ? ' (' + emp.nonfarm_payrolls_date + ')' : ''}`,
      value: mom,
      unit: 'K',
      change: null,
      change_unit: 'K',
      context: mom > 200  ? '非农强劲，劳工需求旺盛' :
               mom > 100  ? '就业稳步增长' :
               mom > 0    ? '就业增长放缓，边际走弱' :
                            '非农负增长，就业市场压力显著',
    });
  }

  // --- Growth metrics ---
  if (growth?.ism_manufacturing != null) {
    const ism = growth.ism_manufacturing;
    metrics.push({
      key: 'ism_manufacturing',
      label: `ISM 制造业 PMI${growth.ism_manufacturing_date ? ' (' + growth.ism_manufacturing_date + ')' : ''}`,
      value: ism,
      unit: 'index',
      change: null,
      change_unit: '',
      context: ism > 55   ? '制造业明显扩张，经济动能强劲' :
               ism > 50   ? '制造业扩张区间，景气维持' :
               ism > 48   ? '制造业接近荣枯线，动能走弱' :
                            '制造业收缩区间，警惕衰退信号',
    });
  }

  if (growth?.ism_services != null) {
    const svc = growth.ism_services;
    metrics.push({
      key: 'ism_services',
      label: `ISM 服务业 PMI${growth.ism_services_date ? ' (' + growth.ism_services_date + ')' : ''}`,
      value: svc,
      unit: 'index',
      change: null,
      change_unit: '',
      context: svc > 55   ? '服务业强劲扩张，消费需求旺盛' :
               svc > 50   ? '服务业维持扩张，经济韧性良好' :
                            '服务业收缩，消费降温信号',
    });
  }

  if (growth?.retail_sales_mom != null) {
    const rsm = growth.retail_sales_mom;
    metrics.push({
      key: 'retail_sales_mom',
      label: `零售销售 MoM${growth.retail_sales_date ? ' (' + growth.retail_sales_date + ')' : ''}`,
      value: rsm,
      unit: '%',
      change: null,
      change_unit: '%',
      context: rsm > 0.5  ? '零售强劲，消费需求支撑经济' :
               rsm > 0    ? '零售小幅增长，消费维持' :
                            '零售走弱，消费端承压',
    });
  }

  if (growth?.industrial_production_yoy != null) {
    const ip = growth.industrial_production_yoy;
    metrics.push({
      key: 'industrial_production_yoy',
      label: `工业产出 YoY${growth.industrial_production_date ? ' (' + growth.industrial_production_date + ')' : ''}`,
      value: ip,
      unit: '%',
      change: null,
      change_unit: '%',
      context: ip > 2    ? '工业产出同比强劲增长' :
               ip > 0    ? '工业产出小幅增长' :
                           '工业产出同比萎缩，制造业疲软',
    });
  }

  /* ── Status / Signal / Change derivation ── */
  let status: DimensionStatus = 'neutral';
  let signal: DimensionSignal = 'mixed';
  let change: DimensionChange = 'stable';

  // ISM PMI: primary driver (expansion > 50 = healthy)
  const ismM = growth?.ism_manufacturing;
  const ismS = growth?.ism_services;
  const ur   = emp?.unemployment_rate;
  const ic   = emp?.initial_claims;

  let pmiScore = 0;   // + = expansionary, - = contractionary
  if (ismM != null) pmiScore += ismM > 50 ? 1 : ismM < 48 ? -2 : -1;
  if (ismS != null) pmiScore += ismS > 50 ? 1 : -1;

  let empScore = 0;   // + = strong, - = stressed
  if (ur  != null) empScore += ur < 4   ? 2 : ur < 4.5 ? 1 : ur < 5 ? 0 : -1;
  if (ic  != null) empScore += ic < 220 ? 1 : ic < 280 ? 0 : -1;

  const totalScore = pmiScore + empScore;

  if (totalScore >= 3) {
    status = 'healthy'; signal = 'risk_supportive'; change = 'improving';
  } else if (totalScore >= 1) {
    status = 'neutral'; signal = 'mixed';
  } else if (totalScore >= -1) {
    status = 'watch'; signal = 'mixed'; change = 'weakening';
  } else {
    status = 'pressured'; signal = 'risk_headwind'; change = 'weakening';
  }

  /* ── Confidence ── */
  const confidence = hasEmployment && hasGrowth ? 72 :
                     hasEmployment || hasGrowth  ? 55 : 45;

  /* ── Risks ── */
  const risks: string[] = [];
  if (ismM != null && ismM < 48)    risks.push(`ISM 制造业 PMI ${ismM} 进入收缩区间，制造业景气恶化。`);
  if (ismS != null && ismS < 50)    risks.push(`ISM 服务业 PMI ${ismS} 跌破荣枯线，服务业放缓风险上升。`);
  if (ur   != null && ur   > 4.5)   risks.push(`失业率升至 ${ur}%，就业市场松动可能压制消费。`);
  if (ic   != null && ic   > 280)   risks.push(`初请失业金 ${ic}K 超过 280K 警戒区，就业压力显现。`);

  /* ── Watchpoints ── */
  const watchpoints = [
    'ISM 制造业/服务业 PMI 月度数据：扩张/收缩临界线 50',
    '每周初请失业金：是否突破 300K 非线性上升',
    '月度非农新增：共识预期 vs 实际偏差',
    '零售销售数据：消费端韧性是否开始动摇',
  ];

  /* ── Summary ── */
  const summaryParts: string[] = [];
  if (ismM != null) summaryParts.push(`ISM 制造业 ${ismM}${ismM > 50 ? '（扩张）' : '（收缩）'}`);
  if (ismS != null) summaryParts.push(`ISM 服务业 ${ismS}${ismS > 50 ? '（扩张）' : '（收缩）'}`);
  if (ur   != null) summaryParts.push(`失业率 ${ur}%`);
  if (ic   != null) summaryParts.push(`初请 ${ic}K`);

  const summaryConclusion =
    signal === 'risk_headwind'  ? '经济动能走弱，谨慎风险暴露。' :
    signal === 'risk_supportive' ? '经济基本面支撑风险资产。' :
                                  '经济动能中性，维持观察。';

  const summary = (summaryParts.length ? summaryParts.join('，') + '。' : '') +
    summaryConclusion +
    ` 置信度 ${confidence}%（FRED ${hasEmployment && hasGrowth ? 'employment+growth' : hasEmployment ? 'employment' : 'growth'} 实时数据）。`;

  const why_it_matters = [
    '宏观经济基本面直接影响企业盈利周期和资产估值。PMI < 50 往往先行于企业盈利下调。',
    hasEmployment && hasGrowth
      ? `当前以 FRED 实时数据（UNRATE / IC4WSA / ISM PMI）评估，置信度 ${confidence}%。`
      : '部分 FRED 数据已接入，持续补全中。',
  ];

  return {
    status, signal, change, confidence, summary, metrics,
    why_it_matters, risks, watchpoints,
  };
}


/* ── Inflation & rates (CPI/PCE primary; 10Y + curve proxy fallback) ── */

function assessInflationRates(s: SentimentData | undefined): DimensionAssessment {
  if (!s?.us10y) {
    return placeholderDimension(
      'inflation_rates',
      '暂无利率数据，通胀与利率环境评估受限。',
    );
  }

  const y10    = s.us10y.value;
  const y10Chg = s.us10y.change ?? 0;
  const spread = s.yield_curve?.spread;
  const inf    = s.inflation;   // may be undefined when FRED is down

  const metrics: DimensionMetric[] = [];

  /* ── Primary: real CPI / PCE metrics ── */
  if (inf?.cpi_yoy != null) {
    const cpiVal = inf.cpi_yoy;
    metrics.push({
      key:         'cpi_yoy',
      label:       `CPI 同比 (CPIAUCSL${inf.cpi_date ? ' ' + inf.cpi_date : ''})`,
      value:       cpiVal,
      unit:        '%',
      change:      null,
      change_unit: '%',
      context:     cpiVal > 4   ? '通胀严重偏高，远超 2% 目标' :
                   cpiVal > 3   ? '通胀粘性，降息路径受制约' :
                   cpiVal > 2.5 ? '通胀高于目标但边际回落' :
                   cpiVal > 2   ? '接近目标，去通胀进程延续' :
                                  '通胀受控，降息空间较充足',
    });
  }

  if (inf?.pce_core_yoy != null) {
    const pceVal = inf.pce_core_yoy;
    metrics.push({
      key:         'pce_core_yoy',
      label:       `核心 PCE 同比 (PCEPILFE${inf.pce_core_date ? ' ' + inf.pce_core_date : ''})`,
      value:       pceVal,
      unit:        '%',
      change:      null,
      change_unit: '%',
      context:     pceVal > 3.5 ? '核心通胀严重粘性，联储维持高利率压力大' :
                   pceVal > 2.8 ? '核心PCE粘性，降息预期面临修正风险' :
                   pceVal > 2.3 ? '核心PCE趋缓，去通胀叙事维持' :
                                  '核心PCE接近目标，降息空间逐步打开',
    });
  }

  /* ── Secondary: rates metrics (always shown) ── */
  metrics.push({
    key:         'us10y',
    label:       '10Y 美债（名义利率锚）',
    value:       y10,
    unit:        '%',
    change:      y10Chg,
    change_unit: '%',
    context:     y10 > 4.5 ? '名义利率偏高区间' :
                 y10 > 3.5 ? '中性偏高' : '相对温和',
  });

  if (spread !== undefined) {
    metrics.push({
      key:         'yield_spread_2s10s',
      label:       '曲线利差 (2s10s)',
      value:       spread,
      unit:        'bps',
      change:      null,
      change_unit: 'bps',
      context:     spread < 0  ? '曲线倒挂，关注衰退路径' :
                   spread < 20 ? '曲线刚转正，倒挂解除信号' :
                                 '曲线正斜率，复苏定价中',
    });
  }

  /* ── P1: 30Y yield (rates_extended) ── */
  const re = s.rates_extended;
  if (re?.us30y != null) {
    metrics.push({
      key:         'us30y_yield',
      label:       '30Y 美债收益率',
      value:       re.us30y.value,
      unit:        '%',
      change:      re.us30y.change,
      change_unit: '%',
      context:     re.us30y.value > 4.8 ? '超长端偏高，抵押贷款成本受压' :
                   re.us30y.value > 4.2 ? '超长端中性偏高' : '超长端相对可控',
    });
  }

  /* ── P1: Fed Funds Rate (rates_extended) ── */
  if (re?.fed_funds != null) {
    metrics.push({
      key:         'fed_funds_rate',
      label:       '联邦基金有效利率 (DFF)',
      value:       re.fed_funds.value,
      unit:        '%',
      change:      re.fed_funds.change,
      change_unit: '%',
      context:     re.fed_funds.value > 5 ? '利率处于限制性区间' :
                   re.fed_funds.value > 3.5 ? '中性偏紧' : '中性区间',
    });
  }

  /* ── P1: WTI + Gold (commodities_ext) ── */
  const cx = s.commodities_ext;
  if (cx?.wti != null) {
    metrics.push({
      key:         'wti_crude',
      label:       'WTI 原油',
      value:       cx.wti.value,
      unit:        'USD',
      change:      cx.wti.change_pct,
      change_unit: '%',
      context:     cx.wti.value > 90 ? '油价偏高，能源通胀压力上升' :
                   cx.wti.value > 70 ? '油价中性区间' : '油价偏低，通胀压力缓解',
    });
  }

  if (cx?.gold != null) {
    metrics.push({
      key:         'gold',
      label:       '黄金 XAUUSD',
      value:       cx.gold.value,
      unit:        'USD',
      change:      cx.gold.change_pct,
      change_unit: '%',
      context:     cx.gold.value > 2500 ? '黄金强势，实际利率偏低或避险情绪主导' :
                   cx.gold.value > 2000 ? '黄金偏强，通胀预期或避险支撑' :
                                          '黄金回落，实际利率偏高',
    });
  }

  /* ── Status / signal / change derivation ── */
  let status: DimensionStatus = 'neutral';
  let signal: DimensionSignal = 'mixed';
  let change: DimensionChange = 'stable';

  const hasCPI = inf?.cpi_yoy != null;
  const hasPCE = inf?.pce_core_yoy != null;

  if (hasCPI || hasPCE) {
    // Primary path: use real inflation data
    const cpiVal = inf!.cpi_yoy ?? inf!.pce_core_yoy!;
    const pceVal = inf!.pce_core_yoy ?? inf!.cpi_yoy!;
    const avgInf = (cpiVal + pceVal) / 2;

    if (avgInf > 3.5) {
      status = 'pressured'; signal = 'risk_headwind'; change = 'weakening';
    } else if (avgInf > 2.8) {
      status = 'watch';    signal = 'risk_headwind';
    } else if (avgInf > 2.2) {
      status = 'neutral';  signal = 'mixed';
    } else {
      status = 'healthy';  signal = 'risk_supportive'; change = 'improving';
    }

    // Reinforce with rates direction
    if (y10Chg < -0.02 && status !== 'pressured') change = 'improving';
    if (y10Chg >  0.03) change = change === 'improving' ? 'stable' : 'weakening';

  } else {
    // Proxy fallback: use 10Y level + curve
    if (y10 > 4.6 && (spread === undefined || spread < -20)) {
      status = 'watch'; signal = 'risk_headwind';
    } else if (y10Chg < -0.02) {
      change = 'improving'; signal = 'risk_supportive';
    } else if (y10Chg > 0.03) {
      change = 'weakening';
    }
  }

  /* ── Confidence ── */
  const confidence = hasCPI && hasPCE ? 82 :
                     hasCPI || hasPCE ? 72 :
                     spread !== undefined ? 66 : 52;

  /* ── Risks ── */
  const risks: string[] = [];
  if (inf?.cpi_yoy != null && inf.cpi_yoy > 3) {
    risks.push(`CPI 同比 ${inf.cpi_yoy.toFixed(1)}%，通胀粘性已明显超过联储 2% 目标，降息预期面临修正。`);
  }
  if (inf?.pce_core_yoy != null && inf.pce_core_yoy > 2.8) {
    risks.push(`核心 PCE ${inf.pce_core_yoy.toFixed(1)}%，联储首要参考指标仍偏高，鸽派转向空间受限。`);
  }
  if (y10 > 4.6) risks.push('名义利率长期处于偏高区间，可能触发再通胀担忧或信用利差重定价。');
  if (y10Chg > 0.03) risks.push('短线利率快速上升对高估值成长股形成折现率逆风。');

  /* ── Watchpoints ── */
  const watchpoints = [
    '月度 CPI 与核心 PCE 环比数据：是否出现连续粘性反弹（尤其是住房分项）',
    'FOMC 会议声明措辞：是否从"维持高利率"转向"视数据而定"',
    '大宗商品共振（油价 + 铜）：是否引发 PPI → CPI 传导链',
    '10Y 盈亏平衡通胀率（T10YIE）：市场对长期通胀锚定是否出现漂移',
  ];

  /* ── Summary ── */
  let summaryParts: string[] = [];
  if (hasCPI) summaryParts.push(`CPI 同比 ${inf!.cpi_yoy!.toFixed(1)}%`);
  if (hasPCE) summaryParts.push(`核心 PCE ${inf!.pce_core_yoy!.toFixed(1)}%`);
  summaryParts.push(`10Y 利率 ${y10.toFixed(2)}%`);
  if (spread !== undefined) summaryParts.push(`曲线 ${spread.toFixed(0)}bps`);

  const summaryConclusion =
    signal === 'risk_headwind'  ? '通胀粘性制约降息路径，利率环境对风险资产构成逆风。' :
    signal === 'risk_supportive'? '去通胀进程清晰，降息路径逐步打开，利率环境边际改善。' :
                                  '通胀路径待进一步确认，利率中性区间震荡。';

  const proxyNote = (!hasCPI && !hasPCE)
    ? ` CPI / PCE 数据待接入（FRED CPIAUCSL / PCEPILFE），当前以名义利率代理，置信度 ${confidence}%。`
    : '';

  const summary = summaryParts.join('，') + '。' + summaryConclusion + proxyNote;

  const why_it_matters = [
    '通胀决定美联储政策空间。高通胀迫使维持高利率，压制估值；去通胀打开降息空间，提振估值。',
    hasCPI || hasPCE
      ? `当前以 FRED 月度实际数据（CPIAUCSL / PCEPILFE）评估，置信度 ${confidence}%。`
      : '当前 CPI / PCE 数据尚未接入，以名义利率水位与曲线形态作为通胀路径的代理测度，置信度受限。',
  ];

  return {
    status, signal, change, confidence, summary, metrics,
    why_it_matters, risks, watchpoints,
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

/* ═══════════════════════════════════════════════════════════════════
   Exported dimension-level assessment functions
   Used by MacroDomainPage tabs (growth, employment as separate tabs)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Dimension-level: Growth only (ISM / Retail / Industrial Production)
 * For /macro/economy/growth tab.
 */
export function assessGrowthDimension(s: SentimentData | undefined): DimensionAssessment {
  const growth = s?.growth;
  if (!growth || growth.data_quality === 'unavailable') {
    return placeholderDimension('economy', 'ISM PMI / 零售 / 工业产出数据尚未接入。');
  }

  const metrics: DimensionMetric[] = [];
  const ismM = growth.ism_manufacturing;
  const ismS = growth.ism_services;
  const rs   = growth.retail_sales_mom;
  const ip   = growth.industrial_production_yoy;

  if (ismM != null) metrics.push({
    key: 'ism_manufacturing', label: `ISM 制造业 PMI${growth.ism_manufacturing_date ? ' (' + growth.ism_manufacturing_date + ')' : ''}`,
    value: ismM, unit: 'index', change: null, change_unit: 'pts',
    context: ismM > 52 ? '扩张强劲' : ismM > 50 ? '温和扩张' : ismM > 47 ? '边际收缩' : '深度收缩',
  });

  if (ismS != null) metrics.push({
    key: 'ism_services', label: `ISM 服务业 PMI${growth.ism_services_date ? ' (' + growth.ism_services_date + ')' : ''}`,
    value: ismS, unit: 'index', change: null, change_unit: 'pts',
    context: ismS > 52 ? '服务业景气' : ismS > 50 ? '温和扩张' : '服务业收缩',
  });

  if (rs != null) metrics.push({
    key: 'retail_sales_mom', label: `零售销售 MoM${growth.retail_sales_date ? ' (' + growth.retail_sales_date + ')' : ''}`,
    value: rs, unit: '%', change: null, change_unit: '%',
    context: rs > 0.5 ? '消费强劲' : rs > 0 ? '小幅增长' : '消费走弱',
  });

  if (ip != null) metrics.push({
    key: 'industrial_production_yoy', label: `工业产出 YoY${growth.industrial_production_date ? ' (' + growth.industrial_production_date + ')' : ''}`,
    value: ip, unit: '%', change: null, change_unit: '%',
    context: ip > 2 ? '工业产出强劲' : ip > 0 ? '小幅增长' : '工业产出萎缩',
  });

  let status: DimensionStatus = 'neutral';
  let signal: DimensionSignal = 'mixed';
  let change: DimensionChange = 'stable';
  let score = 0;
  if (ismM != null) score += ismM > 50 ? 1 : ismM < 48 ? -2 : -1;
  if (ismS != null) score += ismS > 50 ? 1 : -1;
  if (rs  != null) score += rs > 0 ? 0.5 : -0.5;
  if (score >= 2)  { status = 'healthy'; signal = 'risk_supportive'; change = 'improving'; }
  else if (score >= 0) { status = 'neutral'; signal = 'mixed'; }
  else if (score >= -1.5) { status = 'watch'; signal = 'mixed'; change = 'weakening'; }
  else { status = 'pressured'; signal = 'risk_headwind'; change = 'weakening'; }

  const confidence = growth.data_quality === 'real' ? 72 : 48;
  const parts: string[] = [];
  if (ismM != null) parts.push(`ISM 制造业 ${ismM}${ismM > 50 ? '↑' : '↓'}`);
  if (ismS != null) parts.push(`ISM 服务业 ${ismS}${ismS > 50 ? '↑' : '↓'}`);
  if (rs != null) parts.push(`零售 MoM ${rs > 0 ? '+' : ''}${rs.toFixed(1)}%`);
  const summary = (parts.length ? parts.join('，') + '。' : '') +
    (signal === 'risk_supportive' ? '经济扩张动能支撑风险资产。' :
     signal === 'risk_headwind' ? '经济动能走弱，注意盈利下修风险。' :
     '经济动能中性，维持观察。');

  return {
    status, signal, change, confidence, summary, metrics,
    why_it_matters: ['PMI < 50 往往领先企业盈利下调 2-3 个季度，是最重要的景气先行指标。'],
    risks: ismM != null && ismM < 48 ? [`ISM 制造业 ${ismM} 深度收缩，制造业衰退压力上升。`] : [],
    watchpoints: ['ISM PMI 月度数据：是否持续低于 50', '零售销售：消费韧性是否开始崩塌'],
  };
}

/**
 * Dimension-level: Employment only (UNRATE / IC4WSA / PAYEMS)
 * For /macro/economy/employment tab.
 */
export function assessEmploymentDimension(s: SentimentData | undefined): DimensionAssessment {
  const emp = s?.employment;
  if (!emp || emp.data_quality === 'unavailable') {
    return placeholderDimension('economy', '就业数据（UNRATE / IC4WSA / PAYEMS）尚未接入。');
  }

  const metrics: DimensionMetric[] = [];
  const ur = emp.unemployment_rate;
  const ic = emp.initial_claims;
  const pfm = emp.nonfarm_payrolls_mom;

  if (ur != null) metrics.push({
    key: 'unemployment_rate', label: `失业率 UNRATE${emp.unemployment_date ? ' (' + emp.unemployment_date + ')' : ''}`,
    value: ur, unit: '%', change: null, change_unit: '%',
    context: ur < 3.8 ? '劳动市场极度紧张' : ur < 4.2 ? '就业市场健康' : ur < 5 ? '就业开始松动' : '就业市场压力显著',
  });

  if (ic != null) metrics.push({
    key: 'initial_claims', label: `初请失业金 IC4WSA${emp.initial_claims_date ? ' (' + emp.initial_claims_date + ')' : ''}`,
    value: ic, unit: 'K', change: null, change_unit: 'K',
    context: ic < 220 ? '就业市场紧张' : ic < 280 ? '健康区间' : ic < 350 ? '压力升温' : '就业压力显著',
  });

  if (pfm != null) metrics.push({
    key: 'nonfarm_payrolls', label: `非农新增 MoM${emp.nonfarm_payrolls_date ? ' (' + emp.nonfarm_payrolls_date + ')' : ''}`,
    value: pfm, unit: 'K', change: null, change_unit: 'K',
    context: pfm > 200 ? '强劲新增就业' : pfm > 100 ? '健康增速' : pfm > 0 ? '放缓但仍正增长' : '就业萎缩',
  });

  let status: DimensionStatus = 'neutral';
  let signal: DimensionSignal = 'mixed';
  let change: DimensionChange = 'stable';
  let score = 0;
  if (ur != null) score += ur < 4 ? 2 : ur < 4.5 ? 1 : ur < 5 ? 0 : -1;
  if (ic != null) score += ic < 220 ? 1 : ic < 280 ? 0 : -1;
  if (pfm != null) score += pfm > 150 ? 1 : pfm > 0 ? 0 : -1;
  if (score >= 3) { status = 'healthy'; signal = 'risk_supportive'; change = 'improving'; }
  else if (score >= 1) { status = 'neutral'; signal = 'mixed'; }
  else if (score >= -1) { status = 'watch'; signal = 'mixed'; change = 'weakening'; }
  else { status = 'pressured'; signal = 'risk_headwind'; change = 'weakening'; }

  const confidence = emp.data_quality === 'real' ? 73 : 45;
  const parts: string[] = [];
  if (ur != null) parts.push(`失业率 ${ur}%`);
  if (ic != null) parts.push(`初请 ${ic}K`);
  if (pfm != null) parts.push(`非农 ${pfm > 0 ? '+' : ''}${pfm}K`);
  const summary = (parts.length ? parts.join('，') + '。' : '') +
    (signal === 'risk_supportive' ? '就业市场韧性支撑消费和风险偏好。' :
     signal === 'risk_headwind'   ? '就业市场松动，消费端韧性存疑。' :
     '就业市场中性，维持观察。');

  return {
    status, signal, change, confidence, summary, metrics,
    why_it_matters: ['就业是消费端韧性的底层支撑，也是 Fed 降息决策的关键变量。'],
    risks: ic != null && ic > 350 ? ['初请失业金超过 350K，就业市场显著恶化。'] : [],
    watchpoints: ['初请失业金是否突破 300K', '非农就业是否持续低于 100K', 'JOLTS 职位空缺是否급速下降'],
  };
}

/**
 * Combined helper for MacroDomainPage (economy domain: both tabs at once)
 */
export function assessGrowthAndEmployment(s: SentimentData | undefined) {
  return {
    growth:     assessGrowthDimension(s),
    employment: assessEmploymentDimension(s),
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
