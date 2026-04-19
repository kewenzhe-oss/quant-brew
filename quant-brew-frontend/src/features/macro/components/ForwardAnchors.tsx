import styles from './ForwardAnchors.module.css';

interface Props {
  watchpoints: string[];
}

export function ForwardAnchors({ watchpoints }: Props) {
  if (!watchpoints || watchpoints.length === 0) return null;

  return (
    <section className={styles.container}>
      <h3 className={styles.title}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        前瞻观测锚点
      </h3>
      <div className={styles.grid}>
        {watchpoints.map((point, i) => {
          // Attempt to extract prefix (e.g. "日期 事件" or "某个条件：")
          const separatorMatch = point.match(/[:：]/);
          let prefix = '';
          let text = point;
          
          if (separatorMatch && separatorMatch.index) {
            prefix = point.substring(0, separatorMatch.index);
            text = point.substring(separatorMatch.index + 1).trim();
          } else {
            // For event-like strings e.g. "2024-05-15 14:30 核心CPI..."
            const dateMatch = point.match(/^(\d{4}-\d{2}-\d{2}[\s\d:]*)/);
            if (dateMatch && dateMatch[1]) {
              prefix = dateMatch[1].trim();
              text = point.substring(dateMatch[0].length).trim();
            }
          }

          return (
            <div key={i} className={styles.card}>
              {prefix && <div className={styles.prefix}>{prefix}</div>}
              <div className={styles.text}>{text}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
