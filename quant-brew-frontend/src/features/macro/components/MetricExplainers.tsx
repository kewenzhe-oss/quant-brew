import { MetricExplainerConfig } from '../types';
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

export function MetricExplainers({ factor, explainers }: { factor: string, explainers: MetricExplainerConfig[] }) {
  if (!explainers || explainers.length === 0) return null;

  return (
    <div className={styles.metricExplainers}>
      {explainers.map(exp => (
        <ExplainerCard key={exp.metricKey} factor={factor} explainer={exp} />
      ))}
    </div>
  );
}

function ExplainerCard({ factor, explainer }: { factor: string, explainer: MetricExplainerConfig }) {
  const value = useSnapshotData(factor, explainer.metricKey);
  const label = getMetricLabel(factor, explainer.metricKey);

  return (
    <div className={styles.explainerCard}>
      <div className={styles.explainerHeader}>
        <span className={styles.explainerLabel}>{label}</span>
        <span className={styles.explainerValue}>{value ?? '...'}</span>
      </div>
      <div className={styles.explainerBody}>
        <div className={styles.explainerRow}>
          <strong>代表什么:</strong> {explainer.definition}
        </div>
        <div className={styles.explainerRow}>
          <strong>当前变化:</strong> <span className={styles.highlightText}>{explainer.currentImplication}</span>
        </div>
        <div className={styles.explainerRow}>
          <strong>支撑逻辑:</strong> <span className={styles.supportText}>{explainer.whyItSupportsThesis}</span>
        </div>
      </div>
    </div>
  );
}
