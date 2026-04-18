import { useAnalysisHistory, useSimilarPatterns } from '@/shared/hooks/useAnalysis';
import { useAssetPrice } from '@/shared/hooks/useAssetInfo';
import { DataCard } from '@/shared/components/DataCard';
import type { ResearchDisplay } from '@/shared/api/types';
import styles from './ResearchContextPanel.module.css';

interface ResearchContextPanelProps {
  market: string;
  symbol: string;
  analysis: ResearchDisplay | null;
}

export function ResearchContextPanel({ market, symbol, analysis }: ResearchContextPanelProps) {
  return (
    <div className={styles.panel}>
      {/* Analysis-independent: always useful */}
      <AssetSnapshotCard market={market} symbol={symbol} />
      <HistoryCard market={market} symbol={symbol} />
      <SimilarPatternsCard market={market} symbol={symbol} />

      {/* Analysis-dependent: only after generation */}
      {analysis && <ScoresCard scores={analysis.scores} />}
      {analysis && <IndicatorsCard analysis={analysis} />}
      {analysis && <WatchLevelsCard levels={analysis.watchLevels} />}
      {analysis && <ProvenanceCard model={analysis.model} timeMs={analysis.analysisTimeMs} consensus={analysis.consensus} />}
    </div>
  );
}

/* ── Asset snapshot (pre-analysis useful context) ── */

function AssetSnapshotCard({ market, symbol }: { market: string; symbol: string }) {
  const { data: priceData } = useAssetPrice(market, symbol);
  if (!priceData) return null;

  const isUp = (priceData.changePercent ?? 0) >= 0;
  const sign = isUp ? '+' : '';

  return (
    <DataCard title="行情快照">
      <div className={styles.snapshotGrid}>
        <div className={styles.snapshotRow}>
          <span className={styles.snapshotLabel}>价格</span>
          <span className={styles.snapshotValue}>{fmtPrice(priceData.price)}</span>
        </div>
        {priceData.changePercent != null && (
          <div className={styles.snapshotRow}>
            <span className={styles.snapshotLabel}>日涨跌</span>
            <span className={`${styles.snapshotValue} ${isUp ? styles.snapshotUp : styles.snapshotDown}`}>
              {sign}{priceData.changePercent.toFixed(2)}%
            </span>
          </div>
        )}
        <div className={styles.snapshotRow}>
          <span className={styles.snapshotLabel}>市场</span>
          <span className={styles.snapshotValue}>{market === 'Crypto' ? '加密' : '美股'}</span>
        </div>
      </div>
    </DataCard>
  );
}

function fmtPrice(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(6);
}

/* ── Scores ── */

function ScoresCard({ scores }: { scores: ResearchDisplay['scores'] }) {
  return (
    <DataCard title="综合评分">
      <div className={styles.scoreGrid}>
        <ScoreRow label="技术面" value={scores.technical} />
        <ScoreRow label="基本面" value={scores.fundamental} />
        <ScoreRow label="情绪面" value={scores.sentiment} />
        <div className={styles.scoreDivider} />
        <ScoreRow label="综合" value={scores.overall} highlight />
      </div>
    </DataCard>
  );
}

function ScoreRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const barColor = value >= 60 ? 'var(--status-up)' : value <= 40 ? 'var(--status-down)' : 'var(--accent-gold)';
  return (
    <div className={styles.scoreRow}>
      <span className={`${styles.scoreLabel} ${highlight ? styles.scoreHighlight : ''}`}>{label}</span>
      <div className={styles.scoreBar}>
        <div className={styles.scoreBarFill} style={{ width: `${value}%`, background: barColor }} />
      </div>
      <span className={`${styles.scoreValue} ${highlight ? styles.scoreHighlight : ''}`}>{value}</span>
    </div>
  );
}

/* ── Indicators ── */

function IndicatorsCard({ analysis }: { analysis: ResearchDisplay }) {
  const { indicators } = analysis;
  const items: { label: string; value: string; signal?: string }[] = [];

  if (indicators.rsi) {
    items.push({ label: 'RSI', value: indicators.rsi.value.toFixed(1), signal: indicators.rsi.signal });
  }
  if (indicators.macd) {
    items.push({ label: 'MACD', value: indicators.macd.histogram.toFixed(4), signal: indicators.macd.signal });
  }
  if (indicators.volumeRatio != null) {
    items.push({ label: '量比', value: indicators.volumeRatio.toFixed(2) });
  }

  if (items.length === 0) return null;

  return (
    <DataCard title="技术快照">
      <div className={styles.indicatorList}>
        {items.map((item) => (
          <div key={item.label} className={styles.indicatorRow}>
            <span className={styles.indicatorLabel}>{item.label}</span>
            <span className={styles.indicatorValue}>{item.value}</span>
            {item.signal && (
              <span className={styles.indicatorSignal}>{item.signal}</span>
            )}
          </div>
        ))}
      </div>
    </DataCard>
  );
}

/* ── Watch Levels (compact context version) ── */

function WatchLevelsCard({ levels }: { levels: ResearchDisplay['watchLevels'] }) {
  const hasData = levels.support != null || levels.resistance != null;
  if (!hasData) return null;

  return (
    <DataCard title="关键水位">
      <div className={styles.levelsList}>
        {levels.resistance != null && (
          <div className={styles.levelRow}>
            <span className={styles.levelLabel}>阻力</span>
            <span className={styles.levelValue}>{fmtLevel(levels.resistance)}</span>
          </div>
        )}
        {levels.pivot != null && (
          <div className={styles.levelRow}>
            <span className={styles.levelLabel}>枢轴</span>
            <span className={styles.levelValue}>{fmtLevel(levels.pivot)}</span>
          </div>
        )}
        {levels.support != null && (
          <div className={styles.levelRow}>
            <span className={styles.levelLabel}>支撑</span>
            <span className={styles.levelValue}>{fmtLevel(levels.support)}</span>
          </div>
        )}
        {levels.atr != null && (
          <div className={styles.levelRow}>
            <span className={styles.levelLabel}>ATR</span>
            <span className={styles.levelValue}>{fmtLevel(levels.atr)}</span>
          </div>
        )}
      </div>
    </DataCard>
  );
}

/* ── History ── */

function HistoryCard({ market, symbol }: { market: string; symbol: string }) {
  const { data: history } = useAnalysisHistory(market, symbol);
  if (!history || history.length === 0) return null;

  return (
    <DataCard title="历史分析">
      <div className={styles.historyList}>
        {history.slice(0, 5).map((item) => (
          <div key={item.id} className={styles.historyRow}>
            <span className={styles.historyDate}>
              {new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
            <span className={styles.historySummary}>{item.summary}</span>
          </div>
        ))}
      </div>
    </DataCard>
  );
}

/* ── Similar Patterns ── */

function SimilarPatternsCard({ market, symbol }: { market: string; symbol: string }) {
  const { data: patterns } = useSimilarPatterns(market, symbol);
  if (!patterns || patterns.length === 0) return null;

  return (
    <DataCard title="相似历史形态">
      <div className={styles.patternList}>
        {patterns.slice(0, 3).map((p) => (
          <div key={p.id} className={styles.patternRow}>
            <div className={styles.patternHeader}>
              <span className={styles.patternSymbol}>{p.symbol}</span>
              <span className={styles.patternSimilarity}>
                相似度 {(p.similarity_score * 100).toFixed(0)}%
              </span>
            </div>
            <span className={styles.patternSummary}>{p.summary}</span>
            <span className={styles.patternDate}>
              {new Date(p.created_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
        ))}
      </div>
    </DataCard>
  );
}

/* ── Provenance ── */

function ProvenanceCard({
  model,
  timeMs,
  consensus,
}: {
  model: string;
  timeMs: number;
  consensus: ResearchDisplay['consensus'];
}) {
  return (
    <DataCard title="数据来源">
      <div className={styles.provenanceList}>
        <div className={styles.provenanceRow}>
          <span className={styles.provenanceLabel}>模型</span>
          <span className={styles.provenanceValue}>{model || '—'}</span>
        </div>
        <div className={styles.provenanceRow}>
          <span className={styles.provenanceLabel}>分析耗时</span>
          <span className={styles.provenanceValue}>{(timeMs / 1000).toFixed(1)}s</span>
        </div>
        <div className={styles.provenanceRow}>
          <span className={styles.provenanceLabel}>市场状态</span>
          <span className={styles.provenanceValue}>{consensus.regime || '—'}</span>
        </div>
        <div className={styles.provenanceRow}>
          <span className={styles.provenanceLabel}>多周期一致性</span>
          <span className={styles.provenanceValue}>{(consensus.agreement * 100).toFixed(0)}%</span>
        </div>
      </div>
    </DataCard>
  );
}

function fmtLevel(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(6);
}
