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
  cautious_offensive: '谨慎偏多',
  neutral: '中性',
  cautious_defensive: '谨慎偏空',
  defensive: '防守',
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
