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
    const metrics = sentiment.growth_metrics;
    if (!metrics) return null;
    if (metricKey === 'ism_manufacturing') return metrics.ism_manufacturing;
    if (metricKey === 'ism_services') return metrics.ism_services;
    if (metricKey === 'industrial_production_yoy') return metrics.industrial_production_yoy;
    if (metricKey === 'retail_sales_yoy') return metrics.retail_sales_yoy;
    if (metricKey === 'gdp_growth') return metrics.gdp_growth;
    if (metricKey === 'consumer_confidence') return metrics.consumer_confidence;
    if (metricKey === 'leading_economic_index') return metrics.leading_economic_index;
    if (metricKey === 'recession_probability') return metrics.recession_probability;
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
      <div className={styles.breadcrumbs}>
        <span>{FACTOR_LABELS[factor]}</span>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>{PANEL_LABELS[panelKey]}</span>
      </div>

      {/* ZONE 1: Panel Hero */}
      <section className={styles.heroZone}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{PANEL_LABELS[panelKey]}</h1>
          <span className={styles.regimeBadge}>[Regime: 观察期]</span>
          <span className={styles.regimeBadge}>[Quality: {contract.snapshots.some(s => s.isProxy) ? 'Proxy-Assisted' : 'Real'}]</span>
        </div>
        <p className={styles.heroConclusion}>
          {factor === 'economy' 
            ? '当前服务业维持韧性与消费托底，但制造业持续处于收缩区间，叠加领先指标的下探预警，跨周期动能正向放缓象限偏移。' 
            : '[定量结论摘要待生成]'}
        </p>
      </section>

      {/* ZONE 2: Snapshot Metrics */}
      <section>
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
      <section>
        <h2 className={styles.sectionTitle}>Chart Evidence</h2>
        <div className={styles.chartGrid}>
          {contract.charts.map(chart => (
            <ChartWrapper 
              key={chart.key} 
              metricKey={chart.key} 
              label={chart.title} 
              isProxy={chart.isProxy} 
              targetSource={chart.targetSource}
              takeaway={chart.takeaway}
            />
          ))}
        </div>
      </section>

      {/* ZONE 4/5: AI Explanation & Risk Watch */}
      <section>
        <h2 className={styles.sectionTitle}>AI Synthesized Interpretation</h2>
        {contract.ExplanationComponent ? (
          <contract.ExplanationComponent />
        ) : (
          <div className={styles.aiContainer}>
            <div className={styles.aiBlock}>
              <h3>What's Happening</h3>
              <p>[Pending narrative integration]</p>
            </div>
            <div className={styles.aiBlock}>
              <h3>Trend Evolution</h3>
              <p>[Pending narrative integration]</p>
            </div>
            <div className={styles.aiBlock}>
              <h3>Market Implication</h3>
              <p>[Pending narrative integration]</p>
            </div>
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
  const isPending = value === null || value === undefined;
  
  return (
    <div className={styles.snapshotCard}>
      <div className={styles.snapLabel}>
        {label}
        {isProxy && <span className={styles.proxyBadge} title={`Data substituted using ${targetSource}`}>PROXY: {targetSource}</span>}
      </div>
      {isPending ? (
        <div className={styles.snapValuePending}>[Awaiting Data]</div>
      ) : (
        <div className={styles.snapValue}>{value}</div>
      )}
      <div className={styles.snapDesc}>{desc}</div>
    </div>
  );
}

// Dedicated wrapper to enforce isolation barriers per chart loop
function ChartWrapper({ 
  metricKey, label, isProxy, targetSource, takeaway 
}: { 
  metricKey: string, label: string, isProxy?: boolean, targetSource?: string, takeaway?: string
}) {
  const { series, isLoading } = useMacroSeries(metricKey);
  const displayLabel = isProxy ? `${label} [PROXY: ${targetSource}]` : label;
  
  return (
    <div className={styles.chartCard}>
      {takeaway && (
        <div className={styles.chartTakeaway}>
          <strong>✦ Takeaway:</strong> {takeaway}
        </div>
      )}
      <div className={styles.chartBody}>
        <DimensionChart metricKey={metricKey} label={displayLabel} series={series} isLoading={isLoading} />
      </div>
    </div>
  );
}
