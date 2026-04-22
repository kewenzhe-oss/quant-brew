import type { RawAnalysisResponse, ResearchDisplay } from './types';

/**
 * Transforms raw backend analysis (trading-oriented) into research display data.
 *
 * This is the hard boundary between the trading-oriented backend output and the
 * research-first frontend. The ResearchDisplay type intentionally excludes:
 * - decision (BUY/SELL/HOLD)
 * - entry_price
 * - stop_loss
 * - take_profit
 * - position_size_pct
 *
 * If the backend schema changes to research-mode output in the future, this
 * adapter simplifies to a passthrough. Until then, it is the firewall.
 *
 * PATCHED 2026-04-19:
 *   - bollinger bands now consumed from raw.indicators.bollinger
 *   - objectiveScore now surfaced (research-neutral quantitative scores)
 *   - cleanNarrative() expanded with additional zh-CN LLM leak patterns
 *   - cleanNarrative() also applied to technicalSummary (not just narrative)
 */
export function mapToResearchDisplay(raw: RawAnalysisResponse): ResearchDisplay {
  const reasons    = raw.reasons    ?? [];
  const risks      = raw.risks      ?? [];
  const levels     = raw.indicators?.levels;
  const volatility = raw.indicators?.volatility;
  const bollinger  = raw.indicators?.bollinger;

  // objectiveScore — research-neutral quantitative scores (no trading direction)
  const os = raw.objective_score;
  const objectiveScore: ResearchDisplay['objectiveScore'] = os != null ? {
    overall:     os.overall_score,
    technical:   os.technical_score,
    fundamental: os.fundamental_score,
    sentiment:   os.sentiment_score,
    macro:       os.macro_score,
  } : undefined;

  return {
    narrative:          cleanNarrative(raw.summary ?? ''),
    bullishFactors:     reasons.length > 0 ? reasons : ['分析数据不足'],
    bearishFactors:     risks.length   > 0 ? risks   : ['暂无明显风险因素'],
    watchLevels: {
      support:    raw.market_data?.support    ?? levels?.support    ?? null,
      resistance: raw.market_data?.resistance ?? levels?.resistance ?? null,
      pivot:      levels?.pivot  ?? null,
      atr:        volatility?.atr ?? null,
    },
    technicalSummary:   cleanNarrative(raw.detailed_analysis?.technical   ?? ''),
    fundamentalSummary: raw.detailed_analysis?.fundamental ?? '',
    sentimentSummary:   raw.detailed_analysis?.sentiment   ?? '',
    scores: {
      technical:   raw.scores?.technical   ?? 50,
      fundamental: raw.scores?.fundamental ?? 50,
      sentiment:   raw.scores?.sentiment   ?? 50,
      overall:     raw.scores?.overall     ?? 50,
    },
    trendOutlook:  raw.trend_outlook         ?? {},
    trendSummary:  raw.trend_outlook_summary ?? '',
    consensus: {
      score:     raw.consensus?.consensus_score  ?? 0,
      regime:    raw.consensus?.market_regime    ?? 'unknown',
      agreement: raw.consensus?.agreement_ratio  ?? 0,
    },
    indicators: {
      rsi:     raw.indicators?.rsi,
      macd:    raw.indicators?.macd
        ? {
            histogram: raw.indicators.macd.histogram,
            signal:    raw.indicators.macd.signal,
            trend:     raw.indicators.macd.trend,
          }
        : undefined,
      movingAverages: raw.indicators?.moving_averages as Record<string, number | string | undefined> | undefined,
      volumeRatio:    raw.indicators?.volume_ratio,
      bollinger,
    },
    objectiveScore,
    analysisTimeMs: raw.analysis_time_ms ?? 0,
    model:          raw.model ?? '',
  };
}

/**
 * Patterns that strip trading-oriented language the LLM embeds in summaries/analysis.
 *
 * Rules:
 *   1. Be conservative — only match clearly trading-directive phrases.
 *   2. Do NOT strip market-descriptive use of directional words ("bullish momentum").
 *   3. zh-CN patterns cover GPT-4o / Qwen output style observed in production.
 *
 * PATCHED 2026-04-19: Added zh-CN LLM leak patterns.
 */
const TRADING_PATTERNS: RegExp[] = [
  // Decision directives (en + zh-CN)
  /建议\s*(BUY|SELL|HOLD|买入|卖出|持有)/gi,
  /操作建议[：:]\s*(BUY|SELL|HOLD|买入|卖出|持有)/gi,
  /\[多周期客观共识[^\]]*建议(BUY|SELL|HOLD)[^\]]*\]/gi,
  /suggested decision\s*(BUY|SELL|HOLD)/gi,
  /decision[：:\s]+(BUY|SELL|HOLD)/gi,

  // Entry / exit price phrases (en)
  /entry[_\s]?price[：:\s]+[\$￥]?[\d.,]+/gi,
  /stop[_\s]?loss[：:\s]+[\$￥]?[\d.,]+/gi,
  /take[_\s]?profit[：:\s]+[\$￥]?[\d.,]+/gi,

  // Entry / exit price phrases (zh-CN)
  /建议入场[：:\s]*[\$￥]?[\d.,]+/gi,
  /建议止损[：:\s]*[\$￥]?[\d.,]+/gi,
  /建议止盈[：:\s]*[\$￥]?[\d.,]+/gi,
  /入场价[：:\s]*[\$￥]?[\d.,]+/gi,
  /止损位[：:\s]*[\$￥]?[\d.,]+/gi,
  /止盈位[：:\s]*[\$￥]?[\d.,]+/gi,

  // Position sizing
  /position[_\s]?size[：:\s]+\d+%?/gi,
  /仓位[：:\s]*\d+%/gi,
  /建议仓位[^，。；\n]{0,20}/gi,

  // Trailing recommendation sentences (zh-CN LLM style)
  /综合来看[，,]?\s*建议(买入|卖出|持有)[^。；\n]{0,60}[。；]/gi,
  /因此[，,]?\s*建议投资者(买入|卖出|持有|观望)[^。；\n]{0,60}[。；]/gi,
];

/**
 * Strip known trading-oriented phrases from LLM-generated text.
 * Applied to summary and technical analysis fields.
 */
function cleanNarrative(text: string): string {
  let cleaned = text;
  for (const pattern of TRADING_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}
