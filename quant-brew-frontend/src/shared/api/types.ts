/* ── Global Market ── */

/**
 * Normalised index/asset row used throughout the frontend.
 *
 * Backend field name reality (verified 2026-04-19):
 *   indices[]  → name_cn / name_en (no `name`), `change` = pct, no `change_percent`
 *   crypto[]   → `change_24h` (no `change_percent`), no `change`
 *   forex[]    → `change` = pct, `name` present
 *   commodities[] → name_cn / name_en (no `name`), `change` = pct
 *
 * The normalizer resolves all aliases before producing this type.
 * Consumers of IndexData always see the canonical shape below.
 */
export interface IndexData {
  name: string;
  symbol: string;
  price: number;
  /** Absolute point change (may equal change_percent for indices — both carry %). */
  change: number;
  /** Percentage change. */
  change_percent: number;
  currency?: string;
  // ── Raw backend alias fields (present on some shapes, resolved by normalizer) ──
  /** Backend indices / commodities: localised Chinese name. */
  name_cn?: string;
  /** Backend indices / commodities: English name. */
  name_en?: string;
  /** Backend crypto: 24-hour percentage change (alias for change_percent). */
  change_24h?: number;
  /** Backend: region classifier — "US" | "EU" | "JP" | "KR" etc. */
  region?: string;
  /** Backend crypto: 7-day percentage change. */
  change_7d?: number;
  /** Backend crypto: market cap. */
  market_cap?: number;
  /** Backend commodity: unit label (e.g. "USD/oz"). */
  unit?: string;
  /** Backend: emoji flag for region. */
  flag?: string;
}

/**
 * Raw backend shape for /api/global-market/overview.
 * The backend returns a flat `indices` array (not pre-split by region).
 * The normalizer splits by `item.region` before producing `us_indices` / `global_indices`.
 */
export interface RawMarketOverview {
  /** All stock indices — mixed regions; backend does NOT pre-split. */
  indices?: IndexData[];
  crypto?: IndexData[];
  forex?: IndexData[];
  commodities?: IndexData[];
  timestamp?: string | number;
}

/**
 * Normalised market overview — shape expected by the rest of the frontend.
 * Produced by the normalizer from RawMarketOverview.
 */
export interface MarketOverview {
  us_indices: IndexData[];
  global_indices: IndexData[];
  crypto: IndexData[];
  forex: IndexData[];
  commodities: IndexData[];
  futures: IndexData[];
  timestamp: string;
}

/**
 * Raw backend shape for /api/global-market/sentiment.
 * Verified live (2026-04-19). Key differences from SentimentData:
 *   - vix: has `level` not `status`; no `change_percent`
 *   - fear_greed: has `classification` not `label`; no `previous`
 *   - dxy: no `change_percent`
 *   - us10y: ABSENT — value recoverable from yield_curve.yield_10y
 *   - put_call_ratio: ABSENT — equivalent data at root key `vix_term`
 *   - yield_curve: has `level`/`signal` not `status`; also contains `yield_10y` / `yield_2y`
 *   - fed_liquidity: WALCL/TGA/RRP all null (FRED via yfinance broken)
 */
export interface RawSentimentData {
  vix?: {
    value: number;
    change: number;          // already in % (e.g. -2.56 = -2.56%)
    level: string;           // "low" | "moderate" | "high" | "very_high" etc.
    interpretation?: string;
    interpretation_en?: string;
  };
  fear_greed?: {
    value: number;
    classification: string;  // "Fear" | "Greed" | "Extreme Fear" etc.
    timestamp?: number;
    source?: string;
  };
  dxy?: {
    value: number;
    change: number;          // already in % (e.g. 0.18 = +0.18%)
    level: string;
    interpretation?: string;
    interpretation_en?: string;
  };
  yield_curve?: {
    yield_10y: number;       // 10Y treasury yield — source for us10y
    yield_2y: number;
    spread: number;          // yield_10y − yield_2y
    change: number;
    level: string;           // "normal" | "inverted" | "flat" etc.
    signal: string;          // "bullish" | "bearish" | "neutral"
    interpretation?: string;
    interpretation_en?: string;
  };
  /** VIX/VIX3M term structure — equivalent to put_call_ratio in frontend. */
  vix_term?: {
    value: number;           // VIX / VIX3M ratio
    vix?: number;
    vix3m?: number;
    change: number;
    level: string;
    signal: string;
    interpretation?: string;
  };
  vxn?: { value: number; change: number; level?: string };
  gvz?: { value: number; change: number; level?: string };
  fed_liquidity?: FedLiquidityData;
  /** CPI YoY + Core PCE YoY from FRED monthly series */
  inflation?: InflationData;
  /** Employment data (UNRATE / IC4WSA / PAYEMS) from FRED */
  employment?: EmploymentData;
  /** Growth data (ISM PMI / Retail Sales / Industrial Production) from FRED */
  growth?: GrowthData;
  /** P1 — WTI crude + Gold spot prices */
  commodities_ext?: CommoditiesExtData;
  /** P1 — 30Y yield + Fed Funds effective rate */
  rates_extended?: RatesExtendedData;
  timestamp?: string | number;
}

/**
 * Normalised SentimentData — shape expected by the rest of the frontend.
 * Produced by the normalizer from RawSentimentData.
 */
export interface SentimentData {
  vix: { value: number; change: number; change_percent: number; status: string };
  fear_greed: { value: number; label: string; previous: number };
  dxy: { value: number; change: number; change_percent: number };
  /** Extracted from RawSentimentData.yield_curve.yield_10y by normalizer. */
  us10y: { value: number; change: number };
  yield_curve: { spread: number; status: string };
  vxn?: { value: number; change: number };
  gvz?: { value: number; change: number };
  put_call_ratio?: { value: number; status: string };
  /** Fed balance sheet liquidity — WALCL / TGA / RRP via FRED */
  fed_liquidity?: FedLiquidityData;
  /** CPI YoY + Core PCE YoY from FRED monthly series */
  inflation?: InflationData;
  /** Employment data (UNRATE / IC4WSA / PAYEMS) from FRED */
  employment?: EmploymentData;
  /** Growth data (ISM PMI / Retail Sales / Industrial Production) from FRED */
  growth?: GrowthData;
  /** P1 — WTI crude + Gold spot prices (yfinance CL=F / GC=F) */
  commodities_ext?: CommoditiesExtData;
  /** P1 — 30Y yield + Fed Funds effective rate */
  rates_extended?: RatesExtendedData;
  timestamp: string;
}

/**
 * Fed balance sheet liquidity data.
 * All values in billions USD (FRED weekly series).
 * null = that specific series failed to fetch.
 * data_quality = 'real' (all 3 present) | 'partial' (some) | 'unavailable' (none)
 *
 * NOTE: As of 2026-04-19, FRED data via yfinance is broken (HTTP 404 for WALCL/WTREGEN/RRPONTSYD).
 * All 4 numeric fields will be null until the data source is fixed.
 */
export interface FedLiquidityData {
  /** WALCL — Fed total assets (billions USD) */
  walcl: number | null;
  /** WTREGEN — Treasury General Account (billions USD) */
  tga: number | null;
  /** RRPONTSYD — Overnight Reverse Repo (billions USD) */
  rrp: number | null;
  /** WALCL − TGA − RRP (billions USD) — null if any component missing */
  net_liquidity: number | null;
  data_quality: 'real' | 'partial' | 'unavailable';
  source: string;
}

/**
 * CPI and Core PCE inflation data from FRED monthly series.
 * cpi_yoy: CPI All Urban Consumers YoY % (CPIAUCSL)
 * pce_core_yoy: Core PCE Price Index YoY % (PCEPILFE)
 * Both are computed as (latest / value_12m_ago - 1) * 100.
 * null = that series failed to fetch.
 * data_quality = 'real' (both present) | 'partial' (one) | 'unavailable' (none)
 */
export interface InflationData {
  cpi_level: number | null;
  cpi_yoy: number | null;
  cpi_date: string | null;        // "YYYY-MM"
  pce_core_level: number | null;
  pce_core_yoy: number | null;
  pce_core_date: string | null;   // "YYYY-MM"
  data_quality: 'real' | 'partial' | 'unavailable';
  source: string;
}

/**
 * US Employment data from FRED monthly/weekly series.
 * unemployment_rate: UNRATE (%)
 * initial_claims: IC4WSA 4-week average (K persons)
 * nonfarm_payrolls: PAYEMS (K persons, level) + nonfarm_payrolls_mom (K, MoM change)
 * null = that series failed to fetch.
 */
export interface EmploymentData {
  unemployment_rate: number | null;
  unemployment_date: string | null;    // "YYYY-MM"
  initial_claims: number | null;
  initial_claims_date: string | null;  // "YYYY-MM-DD" (weekly)
  nonfarm_payrolls: number | null;
  nonfarm_payrolls_mom: number | null; // MoM change in K persons
  nonfarm_payrolls_date: string | null; // "YYYY-MM"
  data_quality: 'real' | 'partial' | 'unavailable';
  source: string;
}

/**
 * US Growth data from FRED monthly series.
 * ism_manufacturing: ISMMAN (index, expansion > 50)
 * ism_services: ISMSVC (index, expansion > 50)
 * retail_sales_mom: RSXFSN % MoM
 * industrial_production_yoy: INDPRO % YoY
 * null = that series failed to fetch.
 */
export interface GrowthData {
  ism_manufacturing: number | null;
  ism_manufacturing_date: string | null;    // "YYYY-MM"
  ism_services: number | null;
  ism_services_date: string | null;         // "YYYY-MM"
  retail_sales_mom: number | null;
  retail_sales_date: string | null;         // "YYYY-MM"
  industrial_production_yoy: number | null;
  industrial_production_date: string | null; // "YYYY-MM"
  data_quality: 'real' | 'partial' | 'unavailable';
  source: string;
}

/**
 * WTI crude oil + Gold spot prices (P1 data).
 * Fetched via yfinance CL=F / GC=F.
 * null = failed to fetch.
 */
export interface CommoditiesExtData {
  wti:  { value: number; change: number; change_pct: number } | null;
  gold: { value: number; change: number; change_pct: number } | null;
  data_quality: 'real' | 'partial' | 'unavailable';
  source: string;
}

/**
 * Extended rates data: Fed Funds effective rate + 30Y Treasury yield.
 * fed_funds: FRED DFF (daily effective rate %)
 * us30y: yfinance ^TYX (30Y Treasury yield %)
 * null = failed to fetch.
 */
export interface RatesExtendedData {
  fed_funds: { value: number; change: number } | null;
  us30y:     { value: number; change: number } | null;
  data_quality: 'real' | 'partial' | 'unavailable';
  source: string;
}

export interface HeatmapItem {
  name: string;
  symbol: string;
  change_percent: number;
  market_cap?: number;
}

export interface HeatmapData {
  sectors: {
    name: string;
    change_percent: number;
    stocks: HeatmapItem[];
  }[];
  timestamp: string;
}

export interface CalendarEvent {
  date: string;
  time?: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  previous?: string;
  forecast?: string;
  actual?: string;
  country?: string;
}

export interface CalendarData {
  events: CalendarEvent[];
  timestamp: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  published_at: string;
  summary?: string;
}

export interface NewsData {
  articles: NewsItem[];
  timestamp: string;
}

export interface OpportunityItem {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change_percent: number;
  reason?: string;
  volume_ratio?: number;
}

export interface OpportunitiesData {
  opportunities: OpportunityItem[];
  timestamp: string;
}

/* ── Briefing (mock) ── */

export interface BriefingSection {
  headline: string;
  body: string;
  mentioned_symbols?: { market: string; symbol: string; name: string }[];
}

export interface Briefing {
  id: number;
  type: 'morning' | 'evening';
  date: string;
  title: string;
  headline_summary: string;
  sections: BriefingSection[];
  generated_at: string;
}

/* ── Analysis (raw backend response) ── */

export interface RawAnalysisResponse {
  market: string;
  symbol: string;
  language: string;
  model: string;
  timeframe: string;
  decision: string;
  confidence: number;
  summary: string;
  detailed_analysis: {
    technical: string;
    fundamental: string;
    sentiment: string;
  };
  trading_plan: {
    entry_price: number | null;
    stop_loss: number | null;
    take_profit: number | null;
    position_size_pct: number;
  };
  reasons: string[];
  risks: string[];
  scores: {
    technical: number;
    fundamental: number;
    sentiment: number;
    overall: number;
  };
  /**
   * Objective scoring system — rule-based composite score independent of LLM decision.
   * All scores in range [-100, +100]. Present in real payload, currently not consumed by UI.
   */
  objective_score: {
    overall_score: number;
    technical_score: number;
    fundamental_score: number;
    sentiment_score: number;
    macro_score: number;
  };
  market_data: {
    current_price: number;
    change_24h: number;
    support: number | null;
    resistance: number | null;
  };
  indicators: {
    rsi?: { value: number; signal: string };
    /** macd — backend provides signal_line separately from signal string. */
    macd?: {
      value?: number;
      signal_line?: number;
      histogram: number;
      signal: string;
      trend?: string;
    };
    moving_averages?: {
      ma5?: number;
      ma10?: number;
      ma20?: number;
      trend?: string;
      [key: string]: number | string | undefined;
    };
    levels?: {
      support: number | null;
      resistance: number | null;
      pivot?: number | null;
      s1?: number;
      r1?: number;
      s2?: number;
      r2?: number;
      swing_high?: number;
      swing_low?: number;
      method?: string;
    };
    volatility?: {
      level?: string;
      pct?: number;
      atr?: number;
    };
    /**
     * Bollinger Bands — present in real payload as a top-level indicators block.
     * Previously undocumented in this type; added after runtime verification.
     */
    bollinger?: {
      BB_upper: number;
      BB_middle: number;
      BB_lower: number;
      BB_width: number;
    };
    /** ATR-based suggested stop/take-profit — produced by market_data_collector. */
    trading_levels?: {
      suggested_stop_loss?: number;
      suggested_take_profit?: number;
      risk_reward_ratio?: number;
      method?: string;
    };
    /** Price position within trailing 20-day range (0–100). */
    price_position?: number;
    /** Compound trend label derived from moving averages (e.g. "strong_uptrend"). */
    trend?: string;
    current_price?: number;
    volume_ratio?: number;
  };
  consensus?: {
    consensus_score: number;
    consensus_decision: string;
    agreement_ratio: number;
    quality_multiplier: number;
    market_regime: string;
  };
  trend_outlook?: Record<string, {
    score: number;
    trend: string;
    strength: string;
  }>;
  trend_outlook_summary?: string;
  crypto_factors?: Record<string, unknown>;
  analysis_time_ms: number;
  error: string | null;
}

export interface AnalysisApiResponse {
  code: number;
  msg: string;
  data: RawAnalysisResponse | null;
}

export interface AnalysisHistoryItem {
  id: number;
  market: string;
  symbol: string;
  decision: string;
  confidence: number;
  summary: string;
  scores?: {
    technical: number;
    fundamental: number;
    sentiment: number;
  };
  created_at: string;
}

export interface AnalysisHistoryResponse {
  code: number;
  msg: string;
  data: AnalysisHistoryItem[];
}

export interface SimilarPattern {
  id: number;
  symbol: string;
  market: string;
  decision: string;
  confidence: number;
  summary: string;
  similarity_score: number;
  created_at: string;
}

export interface SimilarPatternsResponse {
  code: number;
  msg: string;
  data: SimilarPattern[];
}

export interface PriceResponse {
  code: number;
  msg: string;
  data: {
    price: number;
    change: number;
    changePercent: number;
    symbol: string;
    market: string;
  } | null;
}

export interface StockNameResponse {
  code: number;
  msg: string;
  data: {
    name: string;
    symbol: string;
    market?: string;
    sector?: string;
    industry?: string;
    exchange?: string;
  } | null;
}

/* ── Research Display (adapter output — NO trading fields) ── */

export interface ResearchDisplay {
  narrative: string;
  bullishFactors: string[];
  bearishFactors: string[];
  watchLevels: {
    support: number | null;
    resistance: number | null;
    pivot: number | null;
    atr: number | null;
  };
  technicalSummary: string;
  fundamentalSummary: string;
  sentimentSummary: string;
  scores: {
    technical: number;
    fundamental: number;
    sentiment: number;
    overall: number;
  };
  trendOutlook: Record<string, {
    score: number;
    trend: string;
    strength: string;
  }>;
  trendSummary: string;
  consensus: {
    score: number;
    regime: string;
    agreement: number;
  };
  indicators: {
    rsi?: { value: number; signal: string };
    macd?: { histogram: number; signal: string; trend?: string };
    movingAverages?: Record<string, number | string | undefined>;
    volumeRatio?: number;
    bollinger?: { BB_upper: number; BB_middle: number; BB_lower: number; BB_width: number };
  };
  /**
   * Rule-based objective scores — research-neutral, exposed for advanced UI use.
   * Does NOT include trading decision; only quantitative factor scores.
   */
  objectiveScore?: {
    overall: number;
    technical: number;
    fundamental: number;
    sentiment: number;
    macro: number;
  };
  analysisTimeMs: number;
  model: string;
}

/* ── Symbol Search ── */

export interface SymbolSearchResult {
  market: string;
  symbol: string;
  name: string;
}

export interface SymbolSearchResponse {
  code: number;
  msg: string;
  data: SymbolSearchResult[];
}

export interface HotSymbolsResponse {
  code: number;
  msg: string;
  data: SymbolSearchResult[];
}

/* ── Auth ── */

export interface AuthResponse {
  token: string;
  user: { id: number; username: string; email: string };
}
