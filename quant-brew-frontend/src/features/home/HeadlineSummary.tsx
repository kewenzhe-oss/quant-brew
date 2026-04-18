import styles from './HeadlineSummary.module.css';

interface HeadlineSummaryProps {
  type: 'morning' | 'evening';
  date: string;
  summary: string;
}

export function HeadlineSummary({ type, date, summary }: HeadlineSummaryProps) {
  return (
    <header className={styles.header}>
      <div className={styles.meta}>
        <span className={styles.label}>{type === 'morning' ? '早报' : '晚报'}</span>
        <span className={styles.date}>{date}</span>
      </div>
      <h1 className={styles.summary}>{summary}</h1>
    </header>
  );
}
