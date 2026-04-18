/* ── Global Market ── */

export interface IndexData {
  name: string;
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  currency?: string;
}

export interface MarketOverview {
  us_indices: IndexData[];
  global_indices: IndexData[];
  crypto: IndexData[];
  forex: IndexData[];
  commodities: IndexData[];
  futures: IndexData[];
  timestamp: string;
}

export interface SentimentData {
  vix: { value: number; change: number; change_percent: number; status: string };
  fear_greed: { value: number; label: string; previous: number };
  dxy: { value: number; change: number; change_percent: number };
  us10y: { value: number; change: number };
  yield_curve: { spread: number; status: string };
  vxn?: { value: number; change: number };
  gvz?: { value: number; change: number };
  put_call_ratio?: { value: number; status: string };
  timestamp: string;
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
    macd?: { histogram: number; signal: string };
    moving_averages?: Record<string, number>;
    levels?: {
      support: number | null;
      resistance: number | null;
      pivot?: number | null;
    };
    volatility?: {
      atr?: number;
      bollinger_upper?: number;
      bollinger_lower?: number;
    };
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
    macd?: { histogram: number; signal: string };
    movingAverages?: Record<string, number>;
    volumeRatio?: number;
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
