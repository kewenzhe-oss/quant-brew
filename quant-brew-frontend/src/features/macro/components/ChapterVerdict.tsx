import styles from './Components.module.css';

export function ChapterVerdict({ verdict }: { verdict: string }) {
  return (
    <div className={styles.chapterVerdict}>
      <div className={styles.verdictIcon}>✦</div>
      <div className={styles.verdictText}>{verdict}</div>
    </div>
  );
}
