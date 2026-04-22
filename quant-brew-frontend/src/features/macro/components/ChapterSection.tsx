import { ReactNode } from 'react';
import styles from './Components.module.css';

export function ChapterSection({ children }: { children: ReactNode }) {
  return (
    <section className={styles.chapterSection}>
      {children}
    </section>
  );
}
