import { DimensionVerdict } from '../types';
import styles from './Components.module.css';

export function DimensionHeroDecision({ verdict, coreQuestion }: { verdict: DimensionVerdict, coreQuestion: string }) {
  return (
    <div className={styles.heroDecision}>
      <h2 className={styles.coreQuestion}>{coreQuestion}</h2>
      <div className={styles.verdictBadgeWrapper}>
        <span className={`${styles.verdictBadge} ${styles[verdict.replace(/\s+/g, '')]}`}>{verdict}</span>
      </div>
    </div>
  );
}
