import { AIMarker } from '@/shared/components/AIMarker';
import type { ResearchDisplay } from '@/shared/api/types';
import styles from './AISynthesis.module.css';

interface AISynthesisProps {
  data: ResearchDisplay;
  onReanalyze?: () => void;
}

export function AISynthesis({ data, onReanalyze }: AISynthesisProps) {
  return (
    <div className={styles.synthesis}>
      {/* Narrative summary */}
      {data.narrative && (
        <AIMarker label="AI 研究综述">
          <div className={styles.narrative}>
            <p>{data.narrative}</p>
          </div>
        </AIMarker>
      )}

      {/* Technical analysis */}
      {data.technicalSummary && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>技术面分析</h3>
          <p className={styles.sectionBody}>{data.technicalSummary}</p>
        </section>
      )}

      {/* Fundamental analysis */}
      {data.fundamentalSummary && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>基本面分析</h3>
          <p className={styles.sectionBody}>{data.fundamentalSummary}</p>
        </section>
      )}

      {/* Sentiment analysis */}
      {data.sentimentSummary && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>市场情绪</h3>
          <p className={styles.sectionBody}>{data.sentimentSummary}</p>
        </section>
      )}

      {/* Bullish / Bearish factors */}
      <div className={styles.factorsGrid}>
        <FactorBlock
          title="利多因素"
          items={data.bullishFactors}
          variant="bullish"
        />
        <FactorBlock
          title="利空因素"
          items={data.bearishFactors}
          variant="bearish"
        />
      </div>

      {/* Watch levels */}
      <WatchLevels levels={data.watchLevels} />

      {/* Trend outlook */}
      {data.trendSummary && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>趋势展望</h3>
          <p className={styles.sectionBody}>{data.trendSummary}</p>
          {Object.keys(data.trendOutlook).length > 0 && (
            <TrendOutlookGrid outlook={data.trendOutlook} />
          )}
        </section>
      )}

      <footer className={styles.footer}>
        <span className={styles.footerMeta}>
          模型: {data.model || '—'} · 分析耗时: {(data.analysisTimeMs / 1000).toFixed(1)}s
        </span>
        {onReanalyze && (
          <button className={styles.reanalyzeBtn} onClick={onReanalyze}>
            重新分析
          </button>
        )}
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

interface FactorBlockProps {
  title: string;
  items: string[];
  variant: 'bullish' | 'bearish';
}

function FactorBlock({ title, items, variant }: FactorBlockProps) {
  return (
    <div className={`${styles.factorBlock} ${styles[variant]}`}>
      <h4 className={styles.factorTitle}>{title}</h4>
      <ul className={styles.factorList}>
        {items.map((item, i) => (
          <li key={i} className={styles.factorItem}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

interface WatchLevelsProps {
  levels: ResearchDisplay['watchLevels'];
}

function WatchLevels({ levels }: WatchLevelsProps) {
  const hasData = levels.support != null || levels.resistance != null || levels.pivot != null;
  if (!hasData) return null;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>关键观察位</h3>
      <div className={styles.levelsGrid}>
        {levels.support != null && (
          <LevelItem label="支撑位" value={levels.support} />
        )}
        {levels.resistance != null && (
          <LevelItem label="阻力位" value={levels.resistance} />
        )}
        {levels.pivot != null && (
          <LevelItem label="枢轴点" value={levels.pivot} />
        )}
        {levels.atr != null && (
          <LevelItem label="ATR" value={levels.atr} />
        )}
      </div>
    </section>
  );
}

function LevelItem({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.levelItem}>
      <span className={styles.levelLabel}>{label}</span>
      <span className={styles.levelValue}>{formatLevel(value)}</span>
    </div>
  );
}

interface TrendOutlookGridProps {
  outlook: ResearchDisplay['trendOutlook'];
}

const HORIZON_LABELS: Record<string, string> = {
  next_24h: '24小时',
  next_3d: '3天',
  next_1w: '1周',
  next_1m: '1月',
};

const STRENGTH_LABELS: Record<string, string> = {
  strong: '强',
  moderate: '中等',
  mild: '轻微',
  neutral: '中性',
};

function TrendOutlookGrid({ outlook }: TrendOutlookGridProps) {
  const entries = Object.entries(outlook);
  if (entries.length === 0) return null;

  return (
    <div className={styles.trendGrid}>
      {entries.map(([key, val]) => {
        const isBullish = val.score > 0;
        const trendClass = val.score > 5 ? styles.trendUp : val.score < -5 ? styles.trendDown : styles.trendNeutral;
        return (
          <div key={key} className={`${styles.trendItem} ${trendClass}`}>
            <span className={styles.trendHorizon}>{HORIZON_LABELS[key] ?? key}</span>
            <span className={styles.trendDirection}>
              {isBullish ? '偏多' : val.score < -5 ? '偏空' : '中性'}
            </span>
            <span className={styles.trendStrength}>
              {STRENGTH_LABELS[val.strength] ?? val.strength}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatLevel(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(6);
}
