import type { DimensionDetailSection } from '@/shared/market-intelligence/dimensionDetail';
import type { DimensionMetric } from '@/shared/market-intelligence/types';
import { DimensionChart } from './DimensionChart';
import styles from './MacroDimensionPage.module.css';

interface DimensionSectionGroupProps {
  sections: DimensionDetailSection[];
}

export function DimensionSectionGroup({ sections }: DimensionSectionGroupProps) {
  return (
    <div className={styles.sectionGroup}>
      {sections.map((sec) => (
        <section key={sec.id} className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{sec.title}</h2>
            <p className={styles.sectionDescription}>{sec.moduleQuestion}</p>
          </div>

          {/* Metrics table */}
          {sec.metrics.length > 0 && (
            <div className={styles.metricsTable}>
              {sec.metrics.map((m, i) => (
                <MetricRow key={m.key ?? i} metric={m} />
              ))}
            </div>
          )}

          {/* Chart: null series → honest pending state */}
          {sec.chartMetricKey !== null && (
            <div className={styles.chartWrap}>
              <DimensionChart
                metricKey={sec.chartMetricKey}
                label={sec.chartLabel}
                series={null}  // null until real history API is connected
              />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function MetricRow({ metric }: { metric: DimensionMetric }) {
  const isPositive = metric.change !== null && metric.change > 0;
  const isNegative = metric.change !== null && metric.change < 0;

  return (
    <div className={styles.metricRow}>
      <div className={styles.metricLeft}>
        <span className={styles.metricLabel}>{metric.label}</span>
        {metric.context && <span className={styles.metricContext}>{metric.context}</span>}
      </div>
      <div className={styles.metricRight}>
        <span className={styles.metricValue}>
          {metric.value} {metric.unit}
        </span>
        {metric.change !== null && (
          <span
            className={`${styles.metricChange} ${
              isPositive ? styles.metricUp : isNegative ? styles.metricDown : ''
            }`}
          >
            {isPositive ? '+' : ''}{metric.change} {metric.change_unit}
          </span>
        )}
      </div>
    </div>
  );
}
