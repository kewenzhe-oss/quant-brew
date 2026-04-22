import styles from './Components.module.css';

export function DimensionAIOverview({ summary }: { summary: string }) {
  return (
    <div className={styles.aiOverview}>
      <h3 className={styles.overviewLabel}>✦ AI Synthesis</h3>
      <p className={styles.overviewText}>{summary}</p>
    </div>
  );
}
