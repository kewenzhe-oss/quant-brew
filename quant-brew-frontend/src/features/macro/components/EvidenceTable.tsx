import { useSnapshotData } from '@/shared/hooks/useSnapshotData';
import { CONTRACT_REGISTRY, FactorType } from '@/shared/market-intelligence/macroRegistry';
import styles from './Components.module.css';

function getMetricDetails(factor: string, metricKey: string) {
    const factorContracts = CONTRACT_REGISTRY[factor as FactorType];
    for (const panelKey in factorContracts) {
        const snap = factorContracts[panelKey]?.snapshots.find(s => s.key === metricKey);
        if (snap) {
            return {
                label: snap.label,
                description: snap.description,
                isProxy: snap.isProxy,
                targetSource: snap.targetSource
            };
        }
    }
    return null;
}

export function EvidenceTable({ factor, metrics }: { factor: string, metrics: string[] }) {
    if (!metrics || metrics.length === 0) return null;

    return (
        <div className={styles.evidenceTableWrapper}>
            <h3 className={styles.tableTitle}>Internal Evidence Tracker</h3>
            <table className={styles.evidenceTable}>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Current Limit</th>
                        <th>Quality</th>
                        <th>Implication</th>
                    </tr>
                </thead>
                <tbody>
                    {metrics.map(m => (
                        <EvidenceRow key={m} factor={factor} metricKey={m} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function EvidenceRow({ factor, metricKey }: { factor: string, metricKey: string }) {
    const value = useSnapshotData(factor, metricKey);
    const details = getMetricDetails(factor, metricKey);
    if (!details) return null;

    return (
        <tr>
            <td className={styles.tableMetricName}>{details.label}</td>
            <td className={styles.tableMetricValue}>{value ?? '...'}</td>
            <td>
                {details.isProxy 
                    ? <span className={styles.tableBadgeProxy}>PROXY</span> 
                    : <span className={styles.tableBadgeReal}>REAL</span>}
            </td>
            <td className={styles.tableMetricDesc}>{details.description}</td>
        </tr>
    );
}
