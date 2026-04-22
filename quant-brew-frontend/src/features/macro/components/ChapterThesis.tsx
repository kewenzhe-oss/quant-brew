import styles from './Components.module.css';

export function ChapterThesis({ thesis }: { thesis: string }) {
  return (
    <div className={styles.chapterThesis}>
      <h3 className={styles.thesisLabel}>Chapter Thesis</h3>
      <p className={styles.thesisText}>{thesis}</p>
    </div>
  );
}
