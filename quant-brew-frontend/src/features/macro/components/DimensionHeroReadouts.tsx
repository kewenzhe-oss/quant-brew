import { HeroMetricConfig } from '../types';
import { useSnapshotData } from '@/shared/hooks/useSnapshotData'; // We map this locally
import styles from './Components.module.css';
import { CONTRACT_REGISTRY, FactorType } from '@/shared/market-intelligence/macroRegistry';

// Quick helper to pull the label
function getMetricLabel(factor: string, metricKey: string) {
    const factorContracts = CONTRACT_REGISTRY[factor as FactorType];
    for (const panelKey in factorContracts) {
        const snap = factorContracts[panelKey].snapshots.find(s => s.key === metricKey);
        if (snap) return snap.label;
    }
    return metricKey;
}

export function DimensionHeroReadouts({ factor, metrics }: { factor: string, metrics: HeroMetricConfig[] }) {
  return (
    <div className={styles.heroReadouts}>
      {metrics.map(m => (
        <Readout key={m.metricKey} factor={factor} metricKey={m.metricKey} isPrimary={m.isPrimary} />
      ))}
    </div>
  );
}

function Readout({ factor, metricKey, isPrimary }: { factor: string, metricKey: string, isPrimary: boolean }) {
  const value = useSnapshotData(factor, metricKey);
  const label = getMetricLabel(factor, metricKey);

  return (
    <div className={`${styles.readoutCard} ${isPrimary ? styles.primaryReadout : ''}`}>
      <span className={styles.readoutLabel}>{label}</span>
      <span className={styles.readoutValue}>{value ?? '...'}</span>
    </div>
  );
}
