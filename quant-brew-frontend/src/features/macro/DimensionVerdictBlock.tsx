/**
 * DimensionVerdictBlock — top-level judgment.
 * Conclusion comes FIRST: status → signal → one-liner.
 * Evidence (modules) comes after this component.
 */

import type { DimensionVerdict } from '@/shared/market-intelligence/dimensionDetail';
import styles from './MacroDimensionPage.module.css';

interface DimensionVerdictBlockProps {
  verdict: DimensionVerdict;
  summary: string;
}

const STATUS_COLORS: Record<string, string> = {
  healthy:   '#10b981',
  neutral:   '#94a3b8',
  watch:     '#f59e0b',
  pressured: '#ef4444',
};

export function DimensionVerdictBlock({ verdict, summary }: DimensionVerdictBlockProps) {
  const statusColor = STATUS_COLORS[verdict.status] ?? 'var(--text-secondary)';
  const isProxy = verdict.dataQuality !== 'real';

  return (
    <section className={styles.section}>
      <div className={styles.verdictBlock}>

        {/* Judgment row */}
        <div className={styles.verdictRow}>
          <div
            className={styles.verdictStatus}
            style={{ color: statusColor, borderColor: statusColor }}
          >
            {verdict.statusLabel}
          </div>

          <div className={styles.verdictBadges}>
            <span className={styles.badge}>{verdict.signalLabel}</span>
            <span className={styles.badge}>{verdict.changeLabel}</span>
            <span className={styles.badge}>
              置信度 {verdict.confidence}%
            </span>
            {isProxy && (
              <span className={`${styles.badge} ${styles.badgeProxy}`}>
                {verdict.dataQualityLabel}
              </span>
            )}
          </div>
        </div>

        {/* One-line verdict — the answer to the page question */}
        <p className={styles.verdictOneLiner}>{summary}</p>

      </div>
    </section>
  );
}
