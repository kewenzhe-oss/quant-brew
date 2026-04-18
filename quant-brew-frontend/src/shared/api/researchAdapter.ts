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
 */
export function mapToResearchDisplay(raw: RawAnalysisResponse): ResearchDisplay {
  const reasons = raw.reasons ?? [];
  const risks = raw.risks ?? [];
  const levels = raw.indicators?.levels;
  const volatility = raw.indicators?.volatility;

  return {
    narrative: cleanNarrative(raw.summary ?? ''),
    bullishFactors: reasons.length > 0 ? reasons : ['分析数据不足'],
    bearishFactors: risks.length > 0 ? risks : ['暂无明显风险因素'],
    watchLevels: {
      support: raw.market_data?.support ?? levels?.support ?? null,
      resistance: raw.market_data?.resistance ?? levels?.resistance ?? null,
      pivot: levels?.pivot ?? null,
      atr: volatility?.atr ?? null,
    },
    technicalSummary: raw.detailed_analysis?.technical ?? '',
    fundamentalSummary: raw.detailed_analysis?.fundamental ?? '',
    sentimentSummary: raw.detailed_analysis?.sentiment ?? '',
    scores: {
      technical: raw.scores?.technical ?? 50,
      fundamental: raw.scores?.fundamental ?? 50,
      sentiment: raw.scores?.sentiment ?? 50,
      overall: raw.scores?.overall ?? 50,
    },
    trendOutlook: raw.trend_outlook ?? {},
    trendSummary: raw.trend_outlook_summary ?? '',
    consensus: {
      score: raw.consensus?.consensus_score ?? 0,
      regime: raw.consensus?.market_regime ?? 'unknown',
      agreement: raw.consensus?.agreement_ratio ?? 0,
    },
    indicators: {
      rsi: raw.indicators?.rsi,
      macd: raw.indicators?.macd,
      movingAverages: raw.indicators?.moving_averages,
      volumeRatio: raw.indicators?.volume_ratio,
    },
    analysisTimeMs: raw.analysis_time_ms ?? 0,
    model: raw.model ?? '',
  };
}

const TRADING_PATTERNS = [
  /建议\s*(BUY|SELL|HOLD|买入|卖出|持有)/gi,
  /\[多周期客观共识[^\]]*建议(BUY|SELL|HOLD)[^\]]*\]/gi,
  /suggested decision\s*(BUY|SELL|HOLD)/gi,
  /entry[_\s]?price/gi,
  /stop[_\s]?loss/gi,
  /take[_\s]?profit/gi,
  /position[_\s]?size/gi,
];

/**
 * Strip known trading-oriented phrases that the LLM may embed in summaries.
 * This is a best-effort cleanup — the backend prompt should be rewritten
 * for research-mode output, but until then this prevents the worst leaks.
 */
function cleanNarrative(text: string): string {
  let cleaned = text;
  for (const pattern of TRADING_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}
