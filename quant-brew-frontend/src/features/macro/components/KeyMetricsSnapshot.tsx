import { useSnapshotData } from '@/shared/hooks/useSnapshotData';
import { CONTRACT_REGISTRY, FactorType } from '@/shared/market-intelligence/macroRegistry';
import styles from './Components.module.css';

function getMetricLabel(factor: string, metricKey: string) {
    const factorContracts = CONTRACT_REGISTRY[factor as FactorType];
    for (const panelKey in factorContracts) {
        const snap = factorContracts[panelKey]?.snapshots.find(s => s.key === metricKey);
        if (snap) return snap.label;
    }
    return metricKey;
}

export function KeyMetricsSnapshot({ factor, metrics }: { factor: string, metrics: string[] }) {
  if (!metrics || metrics.length === 0) return null;
  
  return (
    <div className={styles.keyMetricsSnapshot}>
      <h3 className={styles.snapshotLabel}>Key Drivers</h3>
      <div className={styles.snapshotGrid}>
        {metrics.map(m => (
          <MetricCell key={m} factor={factor} metricKey={m} />
        ))}
      </div>
    </div>
  );
}

function MetricCell({ factor, metricKey }: { factor: string, metricKey: string }) {
  const value = useSnapshotData(factor, metricKey);
  const label = getMetricLabel(factor, metricKey);

  return (
    <div className={styles.metricCell}>
      <span className={styles.cellLabel}>{label}</span>
      <span className={styles.cellValue}>{value ?? '...'}</span>
    </div>
  );
}
