import { Link } from 'react-router-dom';
import { useMarketIntelligence } from '@/shared/market-intelligence';
import {
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  STATUS_LABELS,
  CHANGE_LABELS,
  STANCE_LABELS,
  DIMENSION_DATA_QUALITY,
  DATA_QUALITY_LABELS,
} from '@/shared/market-intelligence/constants';
import styles from './MacroJudgment.module.css';

export function MacroJudgment() {
  const { snapshot, isLoading, isPartiallyReal } = useMarketIntelligence();

  if (isLoading) {
    return <div className={styles.loading}>加载中…</div>;
  }

  const { macro, narrative, generated_at } = snapshot;
  const { overall_verdict } = macro;

  return (
    <div>
      {/* 1. Macro Hero */}
      <section className={styles.hero}>
        <h2 className={styles.framingQuestion}>现在更适合进攻还是防守？</h2>
        <div className={styles.stance}>{STANCE_LABELS[overall_verdict.stance]}</div>
        <div className={styles.oneLiner}>{overall_verdict.one_liner}</div>
        <div className={styles.heroMeta}>
          <span className={styles.metaItem}>
            <span style={{ opacity: 0.6 }}>置信度：</span>
            {overall_verdict.confidence}%
          </span>
          <span className={styles.metaItem}>
            <span style={{ opacity: 0.6 }}>生成于：</span>
            {new Date(generated_at).toLocaleString('zh-CN')}
          </span>
          <span className={styles.metaItem}>
            <span style={{ opacity: 0.6 }}>数据源：</span>
            {isPartiallyReal ? '规则推导' : '模拟数据'}
          </span>
        </div>
      </section>

      {/* 2. Four-Dimension cards — click navigates to /macro/:key */}
      <section className={styles.dimensionsGrid}>
        {DIMENSION_KEYS.map((key) => {
          const dim = macro[key];
          const summary = narrative.dimension_summaries[key];

          return (
            <Link
              key={key}
              to={`/macro/${key}`}
              className={styles.dimCard}
              style={{ textDecoration: 'none' }}
            >
              <div className={styles.dimHeader}>
                <span className={styles.dimTitle}>{DIMENSION_LABELS[key]}</span>
                <div className={styles.dimBadges}>
                  <span className={`${styles.badge} ${styles[dim.status]}`}>
                    {STATUS_LABELS[dim.status]}
                  </span>
                  <span className={styles.badge}>{CHANGE_LABELS[dim.change]}</span>
                  {DIMENSION_DATA_QUALITY[key] !== 'real' && (
                    <span className={`${styles.qualityBadge} ${styles[DIMENSION_DATA_QUALITY[key]]}`}>
                      {DATA_QUALITY_LABELS[DIMENSION_DATA_QUALITY[key]]}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.dimSummary}>{summary}</div>

              {dim.metrics && dim.metrics.length > 0 && (
                <div className={styles.dimMetrics}>
                  {dim.metrics.map((m, i) => (
                    <div key={i} className={styles.metricRow}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className={styles.metricLabel}>{m.label}</span>
                        {m.context && <span className={styles.metricContext}>{m.context}</span>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={styles.metricValue}>
                          {m.value} {m.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.dimToggleHint}>▸ 查看维度详情</div>
            </Link>
          );
        })}
      </section>

      {/* 3. Core Judgment Section */}
      <section className={styles.sectionBlock}>
        <h3 className={styles.sectionTitle}>核心判断</h3>
        {narrative.what_matters.length > 0 ? (
          <ul className={styles.bulletList}>
            {narrative.what_matters.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        ) : (
          <div className={styles.dimSummary} style={{ fontStyle: 'italic' }}>
            宏观数据仍在收集评估中…
          </div>
        )}
      </section>

      {/* 5. Watchpoints */}
      <section className={styles.sectionBlock}>
        <h3 className={styles.sectionTitle}>今日关注</h3>
        {narrative.what_to_watch.length > 0 ? (
          <ul className={styles.bulletList}>
            {narrative.what_to_watch.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        ) : (
          <div className={styles.dimSummary} style={{ fontStyle: 'italic' }}>
            暂无可汇报的高影响宏观事件。
          </div>
        )}
      </section>
    </div>
  );
}
