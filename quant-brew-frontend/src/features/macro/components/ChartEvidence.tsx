import { DimensionChart } from '@/features/macro/DimensionChart';
import { useMacroSeries } from '@/shared/hooks/useMacroSeries';
import { CONTRACT_REGISTRY, FactorType } from '@/shared/market-intelligence/macroRegistry';
import styles from './Components.module.css';

function getMetricDetails(factor: string, metricKey: string) {
    const factorContracts = CONTRACT_REGISTRY[factor as FactorType];
    for (const panelKey in factorContracts) {
        const chart = factorContracts[panelKey]?.charts.find(c => c.key === metricKey);
        if (chart) return chart;
    }
    return { title: metricKey, description: '', isProxy: false, targetSource: '' };
}

export function ChartEvidence({ factor, metrics }: { factor: string, metrics: string[] }) {
    if (!metrics || metrics.length === 0) return null;

    return (
        <div className={styles.chartEvidenceBlock}>
            <div className={styles.chartGrid}>
                {metrics.map(m => (
                    <ChartCell key={m} factor={factor} metricKey={m} />
                ))}
            </div>
        </div>
    );
}

function ChartCell({ factor, metricKey }: { factor: string, metricKey: string }) {
    const { series, isLoading } = useMacroSeries(metricKey);
    const { title, isProxy, targetSource } = getMetricDetails(factor, metricKey);
    const displayLabel = isProxy ? `${title} [PROXY: ${targetSource}]` : title;

    return (
        <div className={styles.chartCell}>
            <DimensionChart metricKey={metricKey} label={displayLabel} series={series} isLoading={isLoading} />
        </div>
    );
}
