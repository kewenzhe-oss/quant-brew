import type { DimensionAssessment, DimensionKey } from '@/shared/market-intelligence/types';
import { DIMENSION_LABELS } from '@/shared/market-intelligence/constants';
import styles from './DimensionDrilldown.module.css';

interface DimensionDrilldownProps {
  dimensionKey: DimensionKey;
  dimension: DimensionAssessment;
}

export function DimensionDrilldown({ dimensionKey, dimension }: DimensionDrilldownProps) {
  // Defensive guards: these fields may be absent on older snapshot shapes or partial data
  const why_it_matters = dimension.why_it_matters ?? [];
  const risks = dimension.risks ?? [];
  const watchpoints = dimension.watchpoints ?? [];
  const metrics = dimension.metrics ?? [];

  return (
    <div className={styles.drilldownContainer}>
      <div className={styles.drilldownHeader}>
        <span className={styles.drilldownTitle}>{DIMENSION_LABELS[dimensionKey]}</span>
        <span className={styles.drilldownSubtitle}>维度证据层</span>
      </div>

      {/* Summary */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>当前状态摘要</h4>
        <p className={styles.summaryText}>{dimension.summary}</p>
      </div>

      {/* Supporting Metrics */}
      {metrics.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>支撑指标</h4>
          <div className={styles.metricsGrid}>
            {metrics.map((m, i) => (
              <div key={i} className={styles.metricCell}>
                <span className={styles.metricLabel}>{m.label}</span>
                <span className={styles.metricValue}>{m.value} {m.unit}</span>
                {m.context && <span className={styles.metricContext}>{m.context}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why it matters */}
      {why_it_matters.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>评估逻辑</h4>
          <ul className={styles.bulletList}>
            {why_it_matters.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>当前风险敞口</h4>
          <ul className={`${styles.bulletList} ${styles.riskList}`}>
            {risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Watchpoints */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>后续观察锚点</h4>
        {watchpoints.length > 0 ? (
          <ul className={`${styles.bulletList} ${styles.watchList}`}>
            {watchpoints.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        ) : (
          <span className={styles.emptyNotice}>暂无关键前瞻数据</span>
        )}
      </div>

      {/* Confidence footer */}
      <div className={styles.drilldownFooter}>
        <span>置信度 {dimension.confidence}%</span>
      </div>
    </div>
  );
}
