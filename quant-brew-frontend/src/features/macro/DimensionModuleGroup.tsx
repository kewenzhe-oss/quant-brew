/**
 * DimensionModuleGroup — renders causal modules.
 *
 * Module template (fixed internal structure):
 * 1. 这个板块看什么  (moduleQuestion)
 * 2. 核心指标        (metrics table)
 * 3. 投资含义        (investImplication)
 * 4. 时间序列图      (chart — honest pending state when no real history)
 */

import type { DimensionModule } from '@/shared/market-intelligence/dimensionDetail';
import type { DimensionMetric } from '@/shared/market-intelligence/types';
import { DimensionChart } from './DimensionChart';
import styles from './MacroDimensionPage.module.css';

interface Props {
  modules: DimensionModule[];
}

export function DimensionModuleGroup({ modules }: Props) {
  return (
    <div className={styles.moduleGroup}>
      {modules.map((mod) => (
        <section key={mod.id} className={`${styles.section} ${styles.moduleSection}`}>

          {/* Module header */}
          <div className={styles.moduleHeader}>
            <h2 className={styles.sectionTitle}>{mod.title}</h2>
          </div>

          {/* 1. 这个板块看什么 */}
          <div className={styles.moduleQuestion}>
            <span className={styles.moduleQuestionLabel}>这个板块看什么</span>
            <p className={styles.moduleQuestionText}>{mod.moduleQuestion}</p>
          </div>

          {/* 2. 核心指标 — or pending state if no data */}
          {mod.metrics.length > 0 ? (
            <div className={styles.metricsTableWrap}>
              <span className={styles.metricsTableLabel}>核心指标</span>
              <div className={styles.metricsTable}>
                {mod.metrics.map((m, i) => (
                  <MetricRow key={m.key ?? i} metric={m} />
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.metricsPending}>
              <span className={styles.metricsPendingIcon}>⌛</span>
              <span className={styles.metricsPendingText}>核心指标数据待接入</span>
            </div>
          )}

          {/* 3. 投资含义 */}
          <div className={styles.investImplication}>
            <span className={styles.investLabel}>投资含义</span>
            <div className={styles.investText}>
              {mod.investImplication.split('\n').map((line, i) => (
                <p key={i} className={styles.investLine}>{line}</p>
              ))}
            </div>
          </div>

          {/* 4. 时间序列图 — null = honest pending state */}
          {mod.chartMetricKey !== null && (
            <div className={styles.chartWrap}>
              <DimensionChart label={mod.chartLabel} series={null} />
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
        {metric.context && (
          <span className={styles.metricContext}>{metric.context}</span>
        )}
      </div>
      <div className={styles.metricRight}>
        <span className={styles.metricValue}>
          {metric.value} {metric.unit}
        </span>
        {metric.change !== null && (
          <span className={`${styles.metricChange} ${isPositive ? styles.metricUp : isNegative ? styles.metricDown : ''}`}>
            {isPositive ? '+' : ''}{metric.change} {metric.change_unit}
          </span>
        )}
      </div>
    </div>
  );
}
