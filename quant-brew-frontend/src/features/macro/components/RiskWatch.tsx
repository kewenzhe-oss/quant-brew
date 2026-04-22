import { RiskWatchConfig } from '../types';
import styles from './Components.module.css';

export function RiskWatch({ risks }: { risks: RiskWatchConfig[] }) {
  if (!risks || risks.length === 0) return null;

  return (
    <div className={styles.riskWatch}>
      <div className={styles.riskHeader}>
        <span className={styles.riskIcon}>⚠️</span>
        <span className={styles.riskTitle}>Fragility Watch</span>
      </div>
      <ul className={styles.riskList}>
        {risks.map(r => (
          <li key={r.metricKey}>
            <strong>Condition:</strong> {r.riskCondition} <br />
            <strong>Impact:</strong> {r.potentialImpact}
          </li>
        ))}
      </ul>
    </div>
  );
}
