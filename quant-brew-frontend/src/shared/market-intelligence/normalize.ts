/**
 * Phase B normalizer — transforms raw API responses into
 * MarketSnapshotData, KeyMover[], and UpcomingEvent[].
 *
 * PATCHED 2026-04-19 — Runtime Contract Alignment
 * All field mismatches between backend payloads and frontend types
 * are resolved here. No backend changes required.
 *
 * Dimensions and narrative are NOT derived here (Phase C/D).
 */

import type {
  RawMarketOverview,
  RawSentimentData,
  MarketOverview,
  SentimentData,
  InflationData,
  EmploymentData,
  GrowthData,
  CommoditiesExtData,
  RatesExtendedData,
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

  // NOTE: overview and sentiment arrive already normalised from the API layer
  // (globalMarket.ts runs normalizeOverview / normalizeSentiment before returning).
  // No raw-detection needed here.

  return {
    timestamp:   overview?.timestamp ?? sentiment?.timestamp ?? now,
    session,
    indices:     normalizeIndices(overview),
    rates:       normalizeRates(sentiment),
    fx:          normalizeFx(overview),
    crypto:      normalizeCrypto(overview),
    commodities: normalizeCommodities(overview),
  };
}

/* ═══════════════════════════════════════════
   RawMarketOverview → MarketOverview
   ═══════════════════════════════════════════ */

/**
 * Transforms the raw backend /overview payload into the canonical MarketOverview
 * that the rest of the frontend expects.
 *
 * Key corrections (verified 2026-04-19):
 *   - indices[] flat → split into us_indices / global_indices by item.region
 *   - indices[].name_cn / .name_en → .name  (alias resolution)
 *   - indices[].change (already %) → .change_percent (aliased)
 *   - crypto[].change_24h → .change_percent (aliased)
 *   - commodities[].name_cn / .name_en → .name (alias resolution)
 */
export function normalizeOverview(raw: RawMarketOverview): MarketOverview {
  const allIndices = (raw.indices ?? []).map(resolveIndexItem);

  const US_REGIONS = new Set(['US']);
  const us_indices     = allIndices.filter((i) => US_REGIONS.has(i.region ?? ''));
  const global_indices = allIndices.filter((i) => !US_REGIONS.has(i.region ?? ''));

  return {
    us_indices,
    global_indices,
    crypto:      (raw.crypto      ?? []).map(resolveCryptoItem),
    forex:       (raw.forex       ?? []).map(resolveForexItem),
    commodities: (raw.commodities ?? []).map(resolveCommodityItem),
    futures:     [],
    timestamp:   normalizeTimestamp(raw.timestamp),
  };
}

/** Resolve stock index / commodities: name_cn→name, change→change_percent. */
function resolveIndexItem(item: IndexData): IndexData {
  return {
    ...item,
    name:           item.name ?? item.name_cn ?? item.name_en ?? item.symbol,
    // change IS already a percentage value (verified: backend computes ((cur-prev)/prev)*100)
    change_percent: item.change_percent ?? item.change ?? 0,
    change:         item.change ?? 0,
  };
}

/** Crypto: no `change`, only `change_24h`. */
function resolveCryptoItem(item: IndexData): IndexData {
  return {
    ...item,
    name:           item.name ?? item.symbol,
    change_percent: item.change_percent ?? item.change_24h ?? 0,
    change:         item.change ?? item.change_24h ?? 0,
  };
}

/** Forex: `name` already present; `change` is already in %. */
function resolveForexItem(item: IndexData): IndexData {
  return {
    ...item,
    name:           item.name ?? item.name_en ?? item.symbol,
    change_percent: item.change_percent ?? item.change ?? 0,
    change:         item.change ?? 0,
  };
}

/** Commodities: no `name`, only name_cn / name_en. */
function resolveCommodityItem(item: IndexData): IndexData {
  return {
    ...item,
    name:           item.name ?? item.name_cn ?? item.name_en ?? item.symbol,
    change_percent: item.change_percent ?? item.change ?? 0,
    change:         item.change ?? 0,
  };
}

/* ═══════════════════════════════════════════
   RawSentimentData → SentimentData
   ═══════════════════════════════════════════ */

/**
 * Transforms the raw backend /sentiment payload into the canonical SentimentData.
 *
 * Key corrections (verified 2026-04-19):
 *   - us10y: NOT in response — recovered from yield_curve.yield_10y
 *   - put_call_ratio: NOT in response — equivalent data at root key `vix_term`
 *   - fear_greed.label: backend returns `classification`
 *   - fear_greed.previous: NOT present — defaults to 0
 *   - vix.change_percent: NOT present — `change` is already a % value
 *   - dxy.change_percent: NOT present — computed as (change / value) * 100
 *   - yield_curve.status: backend returns `level` and `signal` instead
 */
export function normalizeSentiment(raw: RawSentimentData): SentimentData {
  const yc = raw.yield_curve;

  // us10y: recoverable from yield_curve.yield_10y (same underlying source)
  const us10y: SentimentData['us10y'] | undefined = yc?.yield_10y != null
    ? { value: yc.yield_10y, change: yc.change ?? 0 }
    : undefined;

  // vix.change is already in % (e.g. -2.56 means -2.56%)
  const rawVix = raw.vix;
  const vix: SentimentData['vix'] | undefined = rawVix != null ? {
    value:          rawVix.value,
    change:         rawVix.change,     // already %
    change_percent: rawVix.change,     // same value — it IS the % change
    status:         rawVix.level ?? 'unknown',
  } : undefined;

  // dxy.change is already in % (e.g. 0.18 means +0.18%)
  const rawDxy = raw.dxy;
  const dxy: SentimentData['dxy'] | undefined = rawDxy != null ? {
    value:          rawDxy.value,
    change:         rawDxy.change,
    change_percent: rawDxy.value !== 0
      ? (rawDxy.change / rawDxy.value) * 100
      : rawDxy.change,
  } : undefined;

  // fear_greed: classification → label; previous not in API → 0
  const rawFg = raw.fear_greed;
  const fear_greed: SentimentData['fear_greed'] | undefined = rawFg != null ? {
    value:    rawFg.value,
    label:    rawFg.classification ?? 'Neutral',
    previous: 0,
  } : undefined;

  // yield_curve: level/signal → status
  const yield_curve: SentimentData['yield_curve'] | undefined = yc != null ? {
    spread: yc.spread,
    status: yc.level ?? yc.signal ?? 'unknown',
  } : undefined;

  // put_call_ratio: backend key is `vix_term`
  const rawVt = raw.vix_term;
  const put_call_ratio: SentimentData['put_call_ratio'] | undefined = rawVt != null ? {
    value:  rawVt.value,
    status: rawVt.level ?? 'unknown',
  } : undefined;

  // vxn / gvz — compatible shapes
  const vxn = raw.vxn?.value   ? { value: raw.vxn.value, change: raw.vxn.change }   : undefined;
  const gvz = raw.gvz?.value   ? { value: raw.gvz.value, change: raw.gvz.change }   : undefined;

  // inflation — pass through directly (backend already computes YoY)
  const inflation: InflationData | undefined = raw.inflation?.data_quality !== 'unavailable'
    ? (raw.inflation as InflationData)
    : undefined;

  // employment — pass through directly
  const employment: EmploymentData | undefined = raw.employment?.data_quality !== 'unavailable'
    ? (raw.employment as EmploymentData)
    : undefined;

  // growth — pass through directly
  const growth: GrowthData | undefined = raw.growth?.data_quality !== 'unavailable'
    ? (raw.growth as GrowthData)
    : undefined;

  // commodities_ext (P1) — WTI + Gold
  const commodities_ext: CommoditiesExtData | undefined =
    raw.commodities_ext?.data_quality !== 'unavailable'
      ? (raw.commodities_ext as CommoditiesExtData)
      : undefined;

  // rates_extended (P1) — 30Y yield + Fed Funds
  const rates_extended: RatesExtendedData | undefined =
    raw.rates_extended?.data_quality !== 'unavailable'
      ? (raw.rates_extended as RatesExtendedData)
      : undefined;

  return {
    vix:             vix            ?? { value: 0, change: 0, change_percent: 0, status: 'unknown' },
    fear_greed:      fear_greed     ?? { value: 50, label: 'Neutral', previous: 0 },
    dxy:             dxy            ?? { value: 0, change: 0, change_percent: 0 },
    us10y:           us10y          ?? { value: 0, change: 0 },
    yield_curve:     yield_curve    ?? { spread: 0, status: 'unknown' },
    put_call_ratio,
    vxn,
    gvz,
    fed_liquidity:   raw.fed_liquidity,
    inflation,
    employment,
    growth,
    commodities_ext,
    rates_extended,
    timestamp: normalizeTimestamp(raw.timestamp),
  };
}

/* ═══════════════════════════════════════════
   Market Snapshot sub-normalizers
   ═══════════════════════════════════════════ */

function normalizeIndices(overview: MarketOverview | undefined): SnapshotTicker[] {
  if (!overview) return [];
  const result: SnapshotTicker[] = [];

  // us_indices is now correctly populated via region-split in normalizeOverview
  const spx = findIndex(overview.us_indices, '^GSPC', 'SPX', 'SPY', 'S&P 500', 'S&P', '标普');
  if (spx) result.push(indexToTicker(spx, TICKER_KEYS.SPX, 'S&P 500', 'pts'));

  const ndx = findIndex(overview.us_indices, '^IXIC', 'NDX', 'QQQ', 'Nasdaq', '纳斯达克');
  if (ndx) result.push(indexToTicker(ndx, TICKER_KEYS.NDX, 'Nasdaq', 'pts'));

  const dji = findIndex(overview.us_indices, '^DJI', 'DJI', 'DIA', 'Dow', '道琼斯');
  if (dji) result.push(indexToTicker(dji, TICKER_KEYS.DJI, 'Dow Jones', 'pts'));

  return result;
}

function normalizeRates(sentiment: SentimentData | undefined): SnapshotTicker[] {
  if (!sentiment) return [];
  const result: SnapshotTicker[] = [];

  if (sentiment.us10y?.value) {
    result.push({
      key:            TICKER_KEYS.US10Y,
      label:          '10Y 美债',
      value:          sentiment.us10y.value,
      change:         sentiment.us10y.change,
      change_percent: sentiment.us10y.value !== 0
        ? (sentiment.us10y.change / sentiment.us10y.value) * 100
        : 0,
      unit: '%',
    });
  }

  if (sentiment.dxy?.value) {
    result.push({
      key:            TICKER_KEYS.DXY,
      label:          '美元指数',
      value:          sentiment.dxy.value,
      change:         sentiment.dxy.change,
      change_percent: sentiment.dxy.change_percent,
      unit:           'index',
    });
  }

  if (sentiment.vix?.value) {
    result.push({
      key:            TICKER_KEYS.VIX,
      label:          'VIX',
      value:          sentiment.vix.value,
      change:         sentiment.vix.change,
      change_percent: sentiment.vix.change_percent,
      unit:           'index',
    });
  }

  return result;
}

function normalizeFx(overview: MarketOverview | undefined): SnapshotTicker[] {
  if (!overview?.forex?.length) return [];
  return overview.forex.slice(0, 4).map((pair) => ({
    key:            (pair.symbol ?? pair.name).toLowerCase().replace(/[^a-z0-9]/g, '_'),
    label:          pair.name,
    value:          pair.price,
    change:         pair.change,
    change_percent: pair.change_percent,  // resolved by resolveForexItem
    unit:           'fx',
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

  // name / name_cn / name_en all resolved to .name by resolveCommodityItem
  const gold = overview.commodities.find(
    (c) =>
      c.symbol?.includes('GC') ||
      c.symbol?.includes('XAU') ||
      c.symbol?.includes('GOLD') ||
      c.name?.includes('Gold') ||
      c.name?.includes('黄金'),
  );
  if (gold) result.push(indexToTicker(gold, TICKER_KEYS.GOLD, '黄金', '$'));

  const wti = overview.commodities.find(
    (c) =>
      c.symbol?.includes('CL') ||
      c.symbol?.includes('WTI') ||
      c.name?.includes('Crude') ||
      c.name?.includes('Oil') ||
      c.name?.includes('原油'),
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
    symbol:         item.symbol,
    name:           item.name,
    market:         item.market ?? 'USStock',
    price:          item.price,
    change_percent: item.change_percent,
    reason:         item.reason ?? '',
    volume_ratio:   item.volume_ratio ?? null,
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
    date:     ev.date,
    time:     ev.time ?? null,
    event:    ev.event,
    impact:   ev.impact,
    previous: ev.previous ?? null,
    forecast: ev.forecast ?? null,
    actual:   ev.actual ?? null,
    country:  ev.country ?? 'US',
  };
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

/**
 * Find an index in the array matching any of the given needles against
 * symbol, name, name_cn, or name_en.
 */
function findIndex(arr: IndexData[] | undefined, ...needles: string[]): IndexData | undefined {
  if (!arr) return undefined;
  return arr.find((item) =>
    needles.some((n) => {
      const nl = n.toLowerCase();
      return (
        item.symbol?.toLowerCase().includes(nl) ||
        item.name?.toLowerCase().includes(nl) ||
        item.name_cn?.includes(n) ||
        item.name_en?.toLowerCase().includes(nl)
      );
    }),
  );
}

function indexToTicker(item: IndexData, key: string, label: string, unit: string): SnapshotTicker {
  return {
    key,
    label,
    value:          item.price,
    change:         item.change,
    change_percent: item.change_percent,
    unit,
  };
}

function normalizeTimestamp(ts: string | number | undefined): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'number') return new Date(ts * 1000).toISOString();
  return ts;
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
