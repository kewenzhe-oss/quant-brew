export type MacroVerdict = 'Risk On' | 'Neutral' | 'Risk Off';

export type DimensionVerdict = 
  | 'Loose' | 'Neutral' | 'Tight'                      // Liquidity
  | 'Expanding' | 'Slowing' | 'Contracting'            // Economy
  | 'Cooling' | 'Sticky' | 'Re-accelerating'           // Inflation
  | 'Fear' | 'Neutral' | 'Greed';                      // Sentiment

export interface HeroMetricConfig {
  metricKey: string;
  isPrimary: boolean;
}

export interface MetricExplainerConfig {
  metricKey: string;
  definition: string;
  currentImplication: string;
  whyItSupportsThesis: string;
}

export interface RiskWatchConfig {
  metricKey: string;
  riskCondition: string;
  potentialImpact: string;
}

export interface ChapterConfig {
  id: string; 
  title: string;
  intro: string;
  verdict: string; 
  thesis: string; 
  keyMetrics: string[]; 
  evidenceTable?: string[]; 
  chartEvidence: string[]; 
  explainers: MetricExplainerConfig[];
  riskWatch?: RiskWatchConfig[]; 
}

export interface DimensionConfig {
  factor: 'liquidity' | 'economy' | 'inflationRates' | 'sentiment';
  coreQuestion: string;
  heroVerdict: DimensionVerdict;
  heroMetrics: HeroMetricConfig[];
  aiSummary: string;
  chapters: ChapterConfig[];
}
