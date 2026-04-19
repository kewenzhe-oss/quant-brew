import { Link } from 'react-router-dom';
import { useMarketIntelligence } from '@/shared/market-intelligence';
import { 
  STANCE_ASSET_ADVICE, 
  STANCE_LABELS, 
  DIMENSION_KEYS, 
  DIMENSION_LABELS, 
  STATUS_LABELS,
  CHANGE_LABELS
} from '@/shared/market-intelligence/constants';
import { SemanticMetricBar } from './components/SemanticMetricBar';
import { ForwardAnchors } from './components/ForwardAnchors';
import styles from './MacroDecisionEngine.module.css';
import type { DimensionAssessment, DimensionKey } from '@/shared/market-intelligence/types';

// Lightweight frontend elevation weight calculation
function evaluateElevationWeight(dim: Omit<DimensionAssessment, 'metrics'>): number {
  let score = 0;
  // High weight for problematic or highly active states
  if (dim.status === 'pressured') score += 10;
  if (dim.status === 'watch') score += 5;
  if (dim.signal === 'risk_headwind' || dim.signal === 'defensive') score += 4;
  if (dim.signal === 'risk_supportive') score += 4;
  if (dim.change === 'weakening' || dim.change === 'improving') score += 2;
  return score;
}

export function MacroDecisionEngine() {
  const { snapshot, isLoading } = useMarketIntelligence();

  if (isLoading) {
    return <div className={styles.loading}>加载中…</div>;
  }

  const { macro, narrative } = snapshot;
  const stance = macro.overall_verdict.stance;
  
  // Process dimensions and calculate primary drivers
  let dimensions = DIMENSION_KEYS.map(key => ({
    key,
    data: macro[key],
    summary: narrative.dimension_summaries[key],
    score: evaluateElevationWeight(macro[key])
  })).sort((a, b) => b.score - a.score);

  const primaryThreshold = 5;
  let primaryDrivers = dimensions.filter(d => d.score >= primaryThreshold);
  let secondaryDrivers = dimensions.filter(d => d.score < primaryThreshold);

  // Force at least 1 primary driver if none met threshold
  if (primaryDrivers.length === 0 && secondaryDrivers.length > 0) {
    primaryDrivers.push(secondaryDrivers.shift()!);
  }
  
  // Cap primary drivers at 2 so the grid doesn't break
  if (primaryDrivers.length > 2) {
    const demoted = primaryDrivers.splice(2);
    secondaryDrivers = [...demoted, ...secondaryDrivers];
  }

  return (
    <div className={styles.engineLayout}>
      
      {/* Level 1: Master line & Asset Advice */}
      <header className={styles.level1}>
        {/* Raw Snapshot context downgraded to micro text */}
        <div className={styles.marketMicroSnapshot}>
           <span className={styles.microIcon}>⚡</span>
           {narrative.headline_summary.split('；')[0] || '市场基本数据连接中'}
        </div>
        
        {/* Pure Macro Masterline Headline */}
        <h2 className={styles.headline}>{macro.overall_verdict.one_liner}</h2>

        <div className={styles.assetAdviceBanner}>
          <div className={styles.stanceBadge} data-stance={stance}>
            {STANCE_LABELS[stance]}配置
          </div>
          <p className={styles.adviceText}>{STANCE_ASSET_ADVICE[stance]}</p>
        </div>
      </header>

      {/* Level 2: Semantic Evidence Modules (Amplified Focus) */}
      <section className={styles.level3}>
        <div className={styles.grid}>
          {primaryDrivers.map(d => (
            <DimensionCard key={d.key} dimKey={d.key} dim={d.data} summary={d.summary} isPrimary={true} />
          ))}
          {secondaryDrivers.map(d => (
            <DimensionCard key={d.key} dimKey={d.key} dim={d.data} summary={d.summary} isPrimary={false} />
          ))}
        </div>
      </section>

      {/* Level 3: Forward Actions */}
      <ForwardAnchors watchpoints={narrative.what_to_watch} />
      
    </div>
  );
}

interface DimensionCardProps {
  dimKey: DimensionKey;
  dim: DimensionAssessment;
  summary: string;
  isPrimary: boolean;
}

function DimensionCard({ dimKey, dim, summary, isPrimary }: DimensionCardProps) {
  const cardClass = isPrimary ? `${styles.dimCard} ${styles.isPrimary}` : styles.dimCard;
  
  return (
    <div className={cardClass}>
      <div className={styles.dimHeader}>
        <span className={styles.dimTitle}>{DIMENSION_LABELS[dimKey]}</span>
        <div className={styles.dimBadges}>
          <span className={`${styles.badge} ${styles[dim.status]}`}>
            {STATUS_LABELS[dim.status]}
          </span>
          <span className={styles.badge}>{CHANGE_LABELS[dim.change]}</span>
        </div>
      </div>
      
      <p className={styles.dimSummary}>{summary}</p>
      
      {/* Semantic Metrics UI */}
      {dim.metrics && dim.metrics.length > 0 ? (
        <div className={styles.metricsWrapper} style={!isPrimary ? { gridTemplateColumns: '1fr' } : undefined}>
          {dim.metrics.slice(0, isPrimary ? 4 : 2).map((m, i) => (
             <SemanticMetricBar key={i} metric={m} />
          ))}
        </div>
      ) : (
        <div className={styles.metricsEmpty}>数据连接中...</div>
      )}

      <Link to={`/macro/${dimKey}`} className={styles.drilldownLink}>
        查看{DIMENSION_LABELS[dimKey]}详情 ▸
      </Link>
    </div>
  );
}
