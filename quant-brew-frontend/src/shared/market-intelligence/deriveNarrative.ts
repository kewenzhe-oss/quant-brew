/**
 * Phase D — shared rule-based narrative derivation layer.
 *
 * Pure function. No hooks. No API calls. No mutation.
 * Input:  full assessed MarketIntelligenceSnapshot
 * Output: NarrativeLayer aligned with the existing schema
 *
 * All text generated here is derived exclusively from the
 * normalized + assessed snapshot fields. Numbers in text are
 * only ever pulled from the snapshot; no values are invented.
 *
 * Tolerates:
 *  - missing dimensions (placeholders from assess.ts)
 *  - sparse market_snapshot (empty arrays)
 *  - missing events (empty array)
 */

import type {
  MarketIntelligenceSnapshot,
  NarrativeLayer,
  DimensionKey,
  DimensionAssessment,
  SnapshotTicker,
  KeyMover,
  UpcomingEvent,
} from './types';

/* ══════════════════════════════════════════════════════════════
   Entry point
   ══════════════════════════════════════════════════════════════ */

export function deriveNarrative(
  snapshot: MarketIntelligenceSnapshot,
): NarrativeLayer {
  return {
    macro_verdict:       deriveMacroVerdict(snapshot),
    dimension_summaries: deriveDimensionSummaries(snapshot),
    headline_summary:    deriveHeadlineSummary(snapshot),
    what_changed:        deriveWhatChanged(
                           snapshot.market_snapshot?.indices ?? [],
                           snapshot.market_snapshot?.rates   ?? [],
                           snapshot.key_movers               ?? [],
                         ),
    what_matters:        deriveWhatMatters(snapshot.macro),
    what_to_watch:       deriveWhatToWatch(snapshot.events ?? [], snapshot.macro),
  };
}

/* ══════════════════════════════════════════════════════════════
   1. macro_verdict
   Source: snapshot.macro.overall_verdict.one_liner
   ══════════════════════════════════════════════════════════════ */

function deriveMacroVerdict(snapshot: MarketIntelligenceSnapshot): string {
  const verdict = snapshot.macro?.overall_verdict;
  if (!verdict?.one_liner) return '宏观环境尚在评估中';
  return verdict.one_liner;
}

/* ══════════════════════════════════════════════════════════════
   2. dimension_summaries
   Source: each dimension's .summary field (set by assess.ts)
   ══════════════════════════════════════════════════════════════ */

const DIMENSION_KEYS: DimensionKey[] = [
  'liquidity',
  'economy',
  'inflation_rates',
  'sentiment',
];

function deriveDimensionSummaries(
  snapshot: MarketIntelligenceSnapshot,
): Record<DimensionKey, string> {
  const result = {} as Record<DimensionKey, string>;
  for (const key of DIMENSION_KEYS) {
    const dim: DimensionAssessment | undefined = snapshot.macro?.[key];
    result[key] = dim?.summary ?? dimensionFallback(key);
  }
  return result;
}

function dimensionFallback(key: DimensionKey): string {
  const labels: Record<DimensionKey, string> = {
    liquidity:       '流动性',
    economy:         '经济',
    inflation_rates: '通胀与利率',
    sentiment:       '情绪',
  };
  return `${labels[key]}维度暂无评估数据。`;
}

/* ══════════════════════════════════════════════════════════════
   3. headline_summary
   One concise sentence combining:
   - the most notable market move (index or rates)
   - the macro stance / implication
   ══════════════════════════════════════════════════════════════ */

function deriveHeadlineSummary(
  snapshot: MarketIntelligenceSnapshot,
): string {
  const verdict  = snapshot.macro?.overall_verdict;
  const stance   = verdict?.one_liner ?? '宏观状态待定';
  const ms       = snapshot.market_snapshot;

  // Pick the single most notable index move (largest abs change_percent)
  const indices  = ms?.indices ?? [];
  const rates    = ms?.rates   ?? [];

  const topIndex = pickLargestMover(indices);
  const us10y    = rates.find((r) => r.key === 'us10y');

  const parts: string[] = [];

  if (topIndex) {
    const dir = topIndex.change_percent >= 0 ? '上涨' : '下跌';
    parts.push(
      `${topIndex.label}${dir}${Math.abs(topIndex.change_percent).toFixed(2)}%`,
    );
  }

  if (us10y) {
    const rateDir = us10y.change >= 0 ? '上行' : '回落';
    parts.push(
      `10年期美债收益率${rateDir}至${us10y.value.toFixed(2)}%`,
    );
  }

  if (parts.length === 0) {
    // No market data available yet — conservative neutral phrasing
    return `当前宏观状态：${stance}，市场数据仍在加载中。`;
  }

  return `${parts.join('，')}；当前宏观判断：${stance}。`;
}

/* ══════════════════════════════════════════════════════════════
   4. what_changed  (3–5 bullets)
   Source: market_snapshot indices + rates + key_movers
   ══════════════════════════════════════════════════════════════ */

function deriveWhatChanged(
  indices:   SnapshotTicker[],
  rates:     SnapshotTicker[],
  keyMovers: KeyMover[],
): string[] {
  const bullets: string[] = [];

  // Index moves
  for (const idx of indices.slice(0, 3)) {
    if (Math.abs(idx.change_percent) >= 0.1) {
      const dir = idx.change_percent >= 0 ? '上涨' : '下跌';
      bullets.push(
        `${idx.label} ${dir} ${Math.abs(idx.change_percent).toFixed(2)}%`,
      );
    }
  }

  // Rate moves
  const us10y = rates.find((r) => r.key === 'us10y');
  if (us10y && Math.abs(us10y.change) >= 0.01) {
    const dir = us10y.change >= 0 ? '上行' : '回落';
    bullets.push(
      `10年期美债收益率${dir}至 ${us10y.value.toFixed(2)}%`,
    );
  }

  const dxy = rates.find((r) => r.key === 'dxy');
  if (dxy && Math.abs(dxy.change_percent) >= 0.1) {
    const dir = dxy.change_percent >= 0 ? '走强' : '走弱';
    bullets.push(`美元指数${dir}至 ${dxy.value.toFixed(1)}`);
  }

  // Key movers (top 2 by abs change_percent)
  const topMovers = [...keyMovers]
    .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
    .slice(0, 2);

  for (const m of topMovers) {
    const dir = m.change_percent >= 0 ? '上涨' : '下跌';
    const reasonPart = m.reason ? `（${m.reason.slice(0, 40)}）` : '';
    bullets.push(
      `${m.name}（${m.symbol}）${dir} ${Math.abs(m.change_percent).toFixed(1)}%${reasonPart}`,
    );
  }

  if (bullets.length === 0) {
    return ['市场数据加载中，暂无可汇报的主要变动。'];
  }

  // Cap at 5
  return bullets.slice(0, 5);
}

/* ══════════════════════════════════════════════════════════════
   5. what_matters  (2–4 bullets)
   Source: dimension assessments with change !== 'stable'
           + overall verdict rationale
           + cross-dimension tension
   ══════════════════════════════════════════════════════════════ */

function deriveWhatMatters(
  macro: MarketIntelligenceSnapshot['macro'],
): string[] {
  const bullets: string[] = [];

  if (!macro) {
    return ['宏观维度评估暂无数据，判断受限。'];
  }

  const verdict = macro.overall_verdict;
  if (verdict?.one_liner) {
    bullets.push(`综合判断：${verdict.one_liner}`);
  }

  // Highlight dimensions that are not stable
  for (const key of DIMENSION_KEYS) {
    const dim: DimensionAssessment | undefined = macro[key];
    if (!dim || dim.confidence < 40) continue; // skip low-confidence placeholders

    const label = dimensionLabel(key);

    if (dim.change === 'improving') {
      bullets.push(`${label}改善中——${dim.summary.slice(0, 60)}…`);
    } else if (dim.change === 'weakening') {
      bullets.push(`${label}走弱——${dim.summary.slice(0, 60)}…`);
    }
  }

  // Cross-dimension tension: flag if liquidity is headwind but economy is healthy
  const liq = macro.liquidity;
  const eco = macro.economy;
  if (
    liq?.signal === 'risk_headwind' &&
    (eco?.signal === 'risk_supportive' || eco?.status === 'healthy')
  ) {
    bullets.push('流动性环境偏紧与经济韧性之间存在背离，需关注两者收敛节奏。');
  }

  // Cross: sentiment overshoot vs. macro headwind
  const sent = macro.sentiment;
  const inflRates = macro.inflation_rates;
  if (
    sent?.signal === 'risk_supportive' &&
    inflRates?.signal === 'risk_headwind'
  ) {
    bullets.push('情绪面偏乐观，但通胀与利率环境仍构成逆风，情绪与基本面存在分歧。');
  }

  if (bullets.length === 0) {
    return ['当前多空因素交织，宏观维度无明显趋向性信号。'];
  }

  return bullets.slice(0, 4);
}

/* ══════════════════════════════════════════════════════════════
   6. what_to_watch  (2–4 bullets)
   Source: events (high-impact) + unresolved macro tension
   ══════════════════════════════════════════════════════════════ */

function deriveWhatToWatch(
  events: UpcomingEvent[],
  macro:  MarketIntelligenceSnapshot['macro'],
): string[] {
  const bullets: string[] = [];

  // High-impact events first
  const highImpact = events
    .filter((e) => e.impact === 'high')
    .slice(0, 3);

  for (const ev of highImpact) {
    const timePart = ev.time ? ` ${ev.time}` : '';
    const forecastPart =
      ev.forecast ? `（预期：${ev.forecast}${ev.previous ? `，前值：${ev.previous}` : ''}）` : '';
    bullets.push(`${ev.date}${timePart} ${ev.event}${forecastPart}`);
  }

  // Medium-impact if we have room
  if (bullets.length < 2) {
    const medImpact = events
      .filter((e) => e.impact === 'medium')
      .slice(0, 2);
    for (const ev of medImpact) {
      const timePart = ev.time ? ` ${ev.time}` : '';
      bullets.push(`${ev.date}${timePart} ${ev.event}`);
    }
  }

  // Macro-inferred watch items when events are sparse
  if (bullets.length < 2 && macro) {
    if (macro.inflation_rates?.signal === 'risk_headwind') {
      bullets.push('通胀与利率逆风尚未解除，关注後续CPI/PCE数据与联储表态。');
    }
    if (macro.liquidity?.status === 'watch' || macro.liquidity?.status === 'pressured') {
      bullets.push('流动性状态偏紧，关注短端利率与信用利差动向。');
    }
    if (macro.sentiment?.status === 'pressured') {
      bullets.push('情绪指标显示市场压力升温，关注VIX与Put/Call比率变化。');
    }
  }

  if (bullets.length === 0) {
    return ['暂无高影响事件，关注常规宏观数据发布节奏。'];
  }

  return bullets.slice(0, 4);
}

/* ══════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════ */

function pickLargestMover(
  tickers: SnapshotTicker[],
): SnapshotTicker | undefined {
  if (tickers.length === 0) return undefined;
  return tickers.reduce((best, t) =>
    Math.abs(t.change_percent) > Math.abs(best.change_percent) ? t : best,
  );
}

function dimensionLabel(key: DimensionKey): string {
  const labels: Record<DimensionKey, string> = {
    liquidity:       '流动性',
    economy:         '经济',
    inflation_rates: '通胀与利率',
    sentiment:       '情绪',
  };
  return labels[key];
}
