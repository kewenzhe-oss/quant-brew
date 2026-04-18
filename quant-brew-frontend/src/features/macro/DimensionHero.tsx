import { Link } from 'react-router-dom';
import type { DimensionDetailView } from '@/shared/market-intelligence/dimensionDetail';
import { DIMENSION_DATA_QUALITY } from '@/shared/market-intelligence/constants';
import styles from './MacroDimensionPage.module.css';

interface DimensionHeroProps {
  detail: DimensionDetailView;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: '#10b981',
  neutral: '#94a3b8',
  watch: '#f59e0b',
  pressured: '#ef4444',
};

export function DimensionHero({ detail }: DimensionHeroProps) {
  const v = detail.verdict;
  const statusColor = STATUS_COLORS[v.status] ?? 'var(--text-secondary)';
  const isProxy = DIMENSION_DATA_QUALITY[detail.key] !== 'real';

  return (
    <header className={styles.hero}>
      <div className={styles.heroNav}>
        <Link to="/macro" className={styles.backLink}>
          ← 宏观总览
        </Link>
      </div>

      <div className={styles.heroBody}>
        <div className={styles.heroLeft}>
          <h1 className={styles.heroTitle}>{detail.title}</h1>
          <p className={styles.heroSummary}>{v.oneLiner}</p>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.statusBadge} style={{ color: statusColor, borderColor: statusColor }}>
            {v.statusLabel}
          </div>
          <div className={styles.heroBadges}>
            <span className={styles.badge}>{v.signalLabel}</span>
            <span className={styles.badge}>{v.changeLabel}</span>
            {isProxy && (
              <span className={`${styles.badge} ${styles.badgeProxy}`}>
                {v.dataQualityLabel}
              </span>
            )}
          </div>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>置信度</span>
              {v.confidence}%
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
