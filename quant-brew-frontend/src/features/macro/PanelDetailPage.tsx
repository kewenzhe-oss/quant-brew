import { useParams, Navigate } from 'react-router-dom';
import { PageLayout } from '@/app/layouts/PageLayout';
import { PANELS, FACTOR_LABELS, PANEL_LABELS, FactorType, FACTORS, CONTRACT_REGISTRY } from '@/shared/market-intelligence/macroRegistry';
import { DimensionChart } from '@/features/macro/DimensionChart';
import { useMacroSeries } from '@/shared/hooks/useMacroSeries';
import styles from './PanelDetailPage.module.css';

export function PanelDetailPage() {
  const { factorKey, panelKey } = useParams<{ factorKey: string; panelKey: string }>();

  if (!factorKey || !panelKey || !FACTORS.includes(factorKey as FactorType) || !PANELS[factorKey as FactorType].includes(panelKey)) {
    return <Navigate to="/macro" replace />;
  }

  const factor = factorKey as FactorType;
  const contract = CONTRACT_REGISTRY[factor]?.[panelKey];

  if (!contract) {
    return (
      <PageLayout main={
        <div className={styles.container}>
          <h1>{PANEL_LABELS[panelKey]} - Integration Pending</h1>
          <p>This panel's data inventory contract has not been implemented yet.</p>
        </div>
      } />
    );
  }

  const main = (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.breadcrumbs}>
          <span>{FACTOR_LABELS[factor]}</span>
          <span className={styles.separator}>/</span>
          <span className={styles.current}>{PANEL_LABELS[panelKey]}</span>
        </div>
        <h1 className={styles.title}>{PANEL_LABELS[panelKey]}</h1>
      </header>

      {/* ZONE 1: Verdict / Regime */}
      <section className={styles.zoneVerdict}>
        <div className={styles.verdictCard}>
          <span className={styles.zoneId}>ZONE 1: VERDICT</span>
          <h2>Quantitative Assessment</h2>
          <p className={styles.pendingText}>[Awaiting snapshot assessment mapping]</p>
        </div>
      </section>

      {/* ZONE 2: Snapshot Metrics */}
      <section className={styles.zoneSnapshot}>
        <h2 className={styles.sectionTitle}>Key Metrics Snapshot</h2>
        <div className={styles.snapshotGrid}>
          {contract.snapshots.map(snap => (
            <div key={snap.key} className={styles.snapshotCard}>
              <div className={styles.snapLabel}>{snap.label}</div>
              <div className={styles.snapValue}>[Pending]</div>
              <div className={styles.snapDesc}>{snap.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ZONE 3: Chart Evidence */}
      <section className={styles.zoneCharts}>
        <h2 className={styles.sectionTitle}>Chart Evidence</h2>
        <div className={styles.chartGrid}>
          {contract.charts.map(chart => (
            <ChartWrapper key={chart.key} metricKey={chart.key} label={chart.title} />
          ))}
        </div>
      </section>

      {/* ZONE 4: AI Explanation */}
      <section className={styles.zoneAi}>
        <h2 className={styles.sectionTitle}>AI Synthesized Regime</h2>
        <div className={styles.aiStructure}>
          <p><strong>当前发生了什么 (Current State):</strong> [Pending narrative integration]</p>
          <p><strong>趋势如何演变 (Trend Evolution):</strong> [Pending narrative integration]</p>
          <p><strong>这对市场意味着什么 (Market Implication):</strong> [Pending narrative integration]</p>
        </div>
      </section>
    </div>
  );

  return <PageLayout main={main} />;
}

// Dedicated wrapper to enforce isolation barriers per chart loop
function ChartWrapper({ metricKey, label }: { metricKey: string, label: string }) {
  const { series, isLoading } = useMacroSeries(metricKey);
  return (
    <div className={styles.chartItem}>
      <DimensionChart metricKey={metricKey} label={label} series={series} isLoading={isLoading} />
    </div>
  );
}
