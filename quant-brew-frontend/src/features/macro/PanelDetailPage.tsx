import { useParams, Navigate } from 'react-router-dom';
import { PageLayout } from '@/app/layouts/PageLayout';
import { PANELS, FACTOR_LABELS, PANEL_LABELS, FactorType, FACTORS, CONTRACT_REGISTRY } from '@/shared/market-intelligence/macroRegistry';
import { DimensionChart } from '@/features/macro/DimensionChart';
import { useMacroSeries } from '@/shared/hooks/useMacroSeries';
import { useSentiment } from '@/shared/hooks/useSentiment';
import styles from './PanelDetailPage.module.css';

// Local resolver for generic panel snapshot data
function useSnapshotData(factorKey: string, metricKey: string) {
  const { data: sentiment } = useSentiment();
  
  if (!sentiment) return null;
  // Specific Liquidity resolutions
  if (factorKey === 'liquidity') {
    if (metricKey === 'us_net_liquidity') return sentiment.fed_liquidity?.net_liquidity;
    if (metricKey === 'fed_balance_sheet') return sentiment.fed_liquidity?.walcl;
    if (metricKey === 'tga_balance') return sentiment.fed_liquidity?.tga;
    if (metricKey === 'rrp_balance') return sentiment.fed_liquidity?.rrp;
    if (metricKey === 'bank_reserves') return sentiment.fed_liquidity?.wresbal;
    if (metricKey === 'dollar_index') return sentiment.dxy?.value;
    if (metricKey === 'financial_conditions_index') return sentiment.fed_liquidity?.nfci;
    if (metricKey === 'us10y_yield') return sentiment.us10y?.value;
  }
  
  // Specific Economy resolutions
  if (factorKey === 'economy') {
    // Phase 3 Backend Expansion for Economy (gdp, retail_sales, proxy values) is pending real JSON payloads
    // Returns null to maintain the strict [Pending] boundary structure
  }
  
  return null;
}

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
            <SnapshotWrapper 
              key={snap.key} 
              factor={factor} 
              metricKey={snap.key} 
              label={snap.label} 
              desc={snap.description} 
              isProxy={snap.isProxy}
              targetSource={snap.targetSource}
            />
          ))}
        </div>
      </section>

      {/* ZONE 3: Chart Evidence */}
      <section className={styles.zoneCharts}>
        <h2 className={styles.sectionTitle}>Chart Evidence</h2>
        <div className={styles.chartGrid}>
          {contract.charts.map(chart => (
            <ChartWrapper 
              key={chart.key} 
              metricKey={chart.key} 
              label={chart.title} 
              isProxy={chart.isProxy} 
              targetSource={chart.targetSource} 
            />
          ))}
        </div>
      </section>

      {/* ZONE 4: AI Explanation */}
      <section className={styles.zoneAi}>
        <h2 className={styles.sectionTitle}>AI Synthesized Regime</h2>
        {contract.ExplanationComponent ? (
          <contract.ExplanationComponent />
        ) : (
          <div className={styles.aiStructure}>
            <p><strong>当前发生了什么 (Current State):</strong> [Pending narrative integration]</p>
            <p><strong>趋势如何演变 (Trend Evolution):</strong> [Pending narrative integration]</p>
            <p><strong>这对市场意味着什么 (Market Implication):</strong> [Pending narrative integration]</p>
          </div>
        )}
      </section>
    </div>
  );

  return <PageLayout main={main} />;
}

// Wrapper for Snapshot cell
function SnapshotWrapper({ 
  factor, metricKey, label, desc, isProxy, targetSource 
}: { 
  factor: string, metricKey: string, label: string, desc: string, isProxy?: boolean, targetSource?: string 
}) {
  const value = useSnapshotData(factor, metricKey);
  return (
    <div className={styles.snapshotCard}>
      <div className={styles.snapLabel}>
        {label}
        {isProxy && <span className={styles.proxyBadge} title={`Data substituted using ${targetSource}`}>PROXY: {targetSource}</span>}
      </div>
      <div className={styles.snapValue}>{value !== null && value !== undefined ? value : '[Pending]'}</div>
      <div className={styles.snapDesc}>{desc}</div>
    </div>
  );
}

// Dedicated wrapper to enforce isolation barriers per chart loop
function ChartWrapper({ 
  metricKey, label, isProxy, targetSource 
}: { 
  metricKey: string, label: string, isProxy?: boolean, targetSource?: string 
}) {
  const { series, isLoading } = useMacroSeries(metricKey);
  const displayLabel = isProxy ? `${label} [PROXY: ${targetSource}]` : label;
  
  return (
    <div className={styles.chartItem}>
      <DimensionChart metricKey={metricKey} label={displayLabel} series={series} isLoading={isLoading} />
    </div>
  );
}
