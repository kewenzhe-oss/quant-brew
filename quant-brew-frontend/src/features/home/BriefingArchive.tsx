import { useState } from 'react';
import type { Briefing } from '@/shared/api/types';
import styles from './BriefingArchive.module.css';

interface BriefingArchiveProps {
  items: Briefing[];
}

export function BriefingArchive({ items }: BriefingArchiveProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <section className={styles.section}>
      <button
        className={styles.toggle}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={styles.toggleLabel}>往期简报</span>
        <span className={styles.toggleIcon}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className={styles.list}>
          {items.map((b) => (
            <div key={b.id} className={styles.row}>
              <span className={styles.rowDate}>{b.date}</span>
              <span className={styles.rowType}>
                {b.type === 'morning' ? '早报' : '晚报'}
              </span>
              <span className={styles.rowSummary}>{b.headline_summary}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
