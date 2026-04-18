import styles from './MacroDimensionPage.module.css';

interface DimensionWatchpointsProps {
  watchpoints: string[];
  risks: string[];
}

export function DimensionWatchpoints({ watchpoints, risks }: DimensionWatchpointsProps) {
  const hasWatchpoints = watchpoints.length > 0;
  const hasRisks = risks.length > 0;

  if (!hasWatchpoints && !hasRisks) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>观察锚点 & 风险</h2>

      {hasRisks && (
        <div className={styles.watchGroup}>
          <div className={styles.watchGroupLabel}>当前风险敞口</div>
          <ul className={styles.watchList}>
            {risks.map((r, i) => (
              <li key={i} className={`${styles.watchItem} ${styles.watchRisk}`}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasWatchpoints && (
        <div className={styles.watchGroup}>
          <div className={styles.watchGroupLabel}>后续观察锚点</div>
          <ul className={styles.watchList}>
            {watchpoints.map((w, i) => (
              <li key={i} className={`${styles.watchItem} ${styles.watchPoint}`}>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
