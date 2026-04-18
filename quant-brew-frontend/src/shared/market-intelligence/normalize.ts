/**
 * Phase B normalizer — transforms raw API responses into
 * MarketSnapshotData, KeyMover[], and UpcomingEvent[].
 *
 * Dimensions and narrative are NOT derived here (Phase C/D).
 */

import type {
  MarketOverview,
  SentimentData,
  OpportunitiesData,
  CalendarData,
  CalendarEvent as RawCalendarEvent,
  IndexData,
  OpportunityItem,
} from '@/shared/api/types';

import type {
  MarketSnapshotData,
  SnapshotTicker,
  KeyMover,
  UpcomingEvent,
  MarketSession,
} from './types';

import { TICKER_KEYS } from './constants';

/* ═══════════════════════════════════════════
   Market Snapshot
   ═══════════════════════════════════════════ */

export function normalizeMarketSnapshot(
  overview: MarketOverview | undefined,
  sentiment: SentimentData | undefined,
): MarketSnapshotData {
  const now = new Date().toISOString();
  const session = deriveSession();

  return {
    timestamp: overview?.timestamp ?? sentiment?.timestamp ?? now,
    session,
    indices: normalizeIndices(overview),
    rates: normalizeRates(sentiment),
    fx: normalizeFx(overview),
    crypto: normalizeCrypto(overview),
    commodities: normalizeCommodities(overview),
  };
}

function normalizeIndices(overview: MarketOverview | undefined): SnapshotTicker[] {
  if (!overview) return [];
  const result: SnapshotTicker[] = [];

  const spx = findIndex(overview.us_indices, 'SPX', 'SPY', 'S&P');
  if (spx) result.push(indexToTicker(spx, TICKER_KEYS.SPX, 'S&P 500', 'pts'));

  const ndx = findIndex(overview.us_indices, 'NDX', 'QQQ', 'Nasdaq');
  if (ndx) result.push(indexToTicker(ndx, TICKER_KEYS.NDX, 'Nasdaq', 'pts'));

  const dji = findIndex(overview.us_indices, 'DJI', 'DIA', 'Dow');
  if (dji) result.push(indexToTicker(dji, TICKER_KEYS.DJI, 'Dow Jones', 'pts'));

  return result;
}

function normalizeRates(sentiment: SentimentData | undefined): SnapshotTicker[] {
  if (!sentiment) return [];
  const result: SnapshotTicker[] = [];

  if (sentiment.us10y) {
    result.push({
      key: TICKER_KEYS.US10Y,
      label: '10Y 美债',
      value: sentiment.us10y.value,
      change: sentiment.us10y.change,
      change_percent: sentiment.us10y.value !== 0
        ? (sentiment.us10y.change / sentiment.us10y.value) * 100
        : 0,
      unit: '%',
    });
  }

  if (sentiment.dxy) {
    result.push({
      key: TICKER_KEYS.DXY,
      label: '美元指数',
      value: sentiment.dxy.value,
      change: sentiment.dxy.change,
      change_percent: sentiment.dxy.change_percent,
      unit: 'index',
    });
  }

  if (sentiment.vix) {
    result.push({
      key: TICKER_KEYS.VIX,
      label: 'VIX',
      value: sentiment.vix.value,
      change: sentiment.vix.change,
      change_percent: sentiment.vix.change_percent,
      unit: 'index',
    });
  }

  return result;
}

function normalizeFx(overview: MarketOverview | undefined): SnapshotTicker[] {
  if (!overview?.forex?.length) return [];
  return overview.forex.slice(0, 4).map((pair) => ({
    key: (pair.symbol ?? pair.name).toLowerCase().replace(/[^a-z0-9]/g, '_'),
    label: pair.name,
    value: pair.price,
    change: pair.change,
    change_percent: pair.change_percent,
    unit: 'fx',
  }));
}

function normalizeCrypto(overview: MarketOverview | undefined): SnapshotTicker[] {
  if (!overview?.crypto?.length) return [];
  const result: SnapshotTicker[] = [];

  const btc = overview.crypto.find(
    (c) => c.symbol?.includes('BTC') || c.name?.toLowerCase().includes('bitcoin'),
  );
  if (btc) result.push(indexToTicker(btc, TICKER_KEYS.BTC, 'Bitcoin', '$'));

  const eth = overview.crypto.find(
    (c) => c.symbol?.includes('ETH') || c.name?.toLowerCase().includes('ethereum'),
  );
  if (eth) result.push(indexToTicker(eth, TICKER_KEYS.ETH, 'Ethereum', '$'));

  return result;
}

function normalizeCommodities(overview: MarketOverview | undefined): SnapshotTicker[] {
  if (!overview?.commodities?.length) return [];
  const result: SnapshotTicker[] = [];

  const gold = overview.commodities.find(
    (c) => c.symbol?.includes('GOLD') || c.symbol?.includes('XAU') || c.name?.includes('Gold') || c.name?.includes('黄金'),
  );
  if (gold) result.push(indexToTicker(gold, TICKER_KEYS.GOLD, '黄金', '$'));

  const wti = overview.commodities.find(
    (c) => c.symbol?.includes('WTI') || c.symbol?.includes('CL') || c.name?.includes('Crude') || c.name?.includes('原油'),
  );
  if (wti) result.push(indexToTicker(wti, TICKER_KEYS.WTI, 'WTI 原油', '$'));

  return result;
}

/* ═══════════════════════════════════════════
   Key Movers
   ═══════════════════════════════════════════ */

export function normalizeKeyMovers(
  opportunities: OpportunitiesData | undefined,
): KeyMover[] {
  if (!opportunities?.opportunities?.length) return [];
  return opportunities.opportunities.slice(0, 8).map(oppToMover);
}

function oppToMover(item: OpportunityItem): KeyMover {
  return {
    symbol: item.symbol,
    name: item.name,
    market: item.market ?? 'USStock',
    price: item.price,
    change_percent: item.change_percent,
    reason: item.reason ?? '',
    volume_ratio: item.volume_ratio ?? null,
  };
}

/* ═══════════════════════════════════════════
   Events
   ═══════════════════════════════════════════ */

export function normalizeEvents(
  calendar: CalendarData | undefined,
): UpcomingEvent[] {
  if (!calendar?.events?.length) return [];
  return calendar.events.slice(0, 12).map(calToEvent);
}

function calToEvent(ev: RawCalendarEvent): UpcomingEvent {
  return {
    date: ev.date,
    time: ev.time ?? null,
    event: ev.event,
    impact: ev.impact,
    previous: ev.previous ?? null,
    forecast: ev.forecast ?? null,
    actual: ev.actual ?? null,
    country: ev.country ?? 'US',
  };
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function findIndex(arr: IndexData[] | undefined, ...needles: string[]): IndexData | undefined {
  if (!arr) return undefined;
  return arr.find((item) =>
    needles.some(
      (n) => item.symbol?.includes(n) || item.name?.includes(n),
    ),
  );
}

function indexToTicker(item: IndexData, key: string, label: string, unit: string): SnapshotTicker {
  return {
    key,
    label,
    value: item.price,
    change: item.change,
    change_percent: item.change_percent,
    unit,
  };
}

function deriveSession(): MarketSession {
  const now = new Date();
  const nyHour = getNYHour(now);
  if (nyHour >= 4 && nyHour < 9.5) return 'pre_market';
  if (nyHour >= 9.5 && nyHour < 16) return 'regular';
  if (nyHour >= 16 && nyHour < 20) return 'after_hours';
  return 'closed';
}

function getNYHour(date: Date): number {
  const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
  // EDT = UTC-4 (approximate; ignores DST transitions)
  const nyHour = utcHour - 4;
  return nyHour < 0 ? nyHour + 24 : nyHour;
}
