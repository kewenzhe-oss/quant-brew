import styles from './Components.module.css';

export function ChapterIntro({ title, intro }: { title: string, intro: string }) {
  return (
    <div className={styles.chapterIntro}>
      <h2 className={styles.chapterTitle}>{title}</h2>
      <p className={styles.chapterIntroText}>{intro}</p>
    </div>
  );
}
