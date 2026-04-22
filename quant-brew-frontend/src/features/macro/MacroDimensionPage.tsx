import { useParams, Link, Navigate } from 'react-router-dom';
import { useMarketIntelligence } from '@/shared/market-intelligence';
import { resolveDomain } from '@/shared/market-intelligence/constants';
import { buildDimensionDetail } from '@/shared/market-intelligence/dimensionDetail';
import { DimensionVerdictBlock } from './DimensionVerdictBlock';
import { BreakdownSection } from './components/BreakdownSection';
import { DimensionInterpretationBlock } from './DimensionInterpretationBlock';
import { DimensionModuleGroup } from './DimensionModuleGroup';
import { DimensionWatchpoints } from './DimensionWatchpoints';
import styles from './MacroDimensionPage.module.css';

export function MacroDimensionPage() {
  // Layer 3 route: /macro/:domainKey/:dimensionKey
  // dimensionKey here is the sub-dimension slug (e.g. 'us', 'growth', 'inflation', 'fear-greed')
  // We resolve the parent DimensionKey from domainKey for the actual data lookup
  const { domainKey, dimensionKey } = useParams<{ domainKey: string; dimensionKey: string }>();
  const { snapshot, isLoading } = useMarketIntelligence();

  // Resolve domain to get the internal DimensionKey
  const domain = domainKey ? resolveDomain(domainKey) : null;
  if (!domain) return <Navigate to="/macro" replace />;

  // Validate sub-dimension slug
  const isValidDim = dimensionKey && domain.dims.some((d) => d.slug === dimensionKey);
  if (!isValidDim) return <Navigate to={`/macro/${domainKey}`} replace />;

  // Find current sub-dimension metadata
  const currentDim = domain.dims.find((d) => d.slug === dimensionKey)!;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}><span>加载维度数据…</span></div>
      </div>
    );
  }

  // Build detail using the domain's DimensionKey (same assess.ts data for all dims in domain)
  // Passing currentDim to automatically generate the Breakdown outline from the config
  const detail = buildDimensionDetail(domain.key as any, snapshot, currentDim);

  return (
    <div className={styles.page}>

      {/* Breadcrumb: Overview → Domain → Dimension */}
      <nav className={styles.nav}>
        <Link to="/macro" className={styles.backLink}>宏观总览</Link>
        <span style={{ color: '#404040', margin: '0 0.4rem' }}>›</span>
        <Link to={`/macro/${domainKey}`} className={styles.backLink}>{domain.title}</Link>
        <span style={{ color: '#404040', margin: '0 0.4rem' }}>›</span>
        <span style={{ color: '#a3a3a3', fontSize: '0.85rem' }}>{currentDim.title}</span>
      </nav>

      {/* 1. Question definition */}
      <header className={styles.questionBlock}>
        <p className={styles.questionLabel}>本页回答的问题</p>
        <h1 className={styles.question}>{currentDim.question}</h1>
        <p className={styles.dimensionLabel}>{domain.title} · {currentDim.title}</p>
      </header>

      <div className={styles.body}>

        {/* 2. Top-level verdict — conclusion first */}
        <DimensionVerdictBlock verdict={detail.verdict} summary={detail.verdict.oneLiner} />

        {/* 2b. Liquidity-specific: two overview indicators */}
        {domain.key === 'liquidity' && <LiquidityOverviewStrip detail={detail} />}

        {/* 3. Three-part interpretation */}
        <DimensionInterpretationBlock interpretation={detail.interpretation} />

        {/* 3b. Investment implication */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>维度指导意义</h2>
          <p className={styles.investImplicationText}>{detail.investmentImplication}</p>
        </section>

        {/* 4. BreakdownSection: purely structure */}
        <BreakdownSection outline={detail.breakdownOutline} />

        {/* 5. EvidenceSectionGroup: real data, charts, modules */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>底层证据：观测与图表</h2>
          <DimensionModuleGroup modules={detail.modules} />
        </section>

        {/* 6. Watchpoints */}
        <DimensionWatchpoints watchpoints={detail.watchpoints} risks={detail.risks} />

      </div>

      <footer className={styles.pageFooter}>
        <Link to={`/macro/${domainKey}`} className={styles.backLink}>← 返回{domain.title}</Link>
        <span className={styles.footerNote}>
          置信度 {detail.verdict.confidence}% · {detail.verdict.dataQualityLabel}
        </span>
      </footer>

    </div>
  );

}

/* ── Two top-level liquidity overview indicators ──
 *
 * Shows real values when WALCL/TGA/RRP are connected.
 * Shows honest pending when still unavailable.
 * Formula and source always visible.
 */
function LiquidityOverviewStrip({ detail }: { detail: ReturnType<typeof buildDimensionDetail> }) {
  const netLiq = detail.modules
    .flatMap((m) => m.metrics)
    .find((m) => m.key === 'net_liquidity');

  const netValue  = netLiq?.value   ?? null;
  const netCtx    = netLiq?.context ?? null;
  const isPartial = detail.verdict.dataQuality === 'partial';
  const isPending = netValue === null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>流动性概览</h2>
      <div className={styles.overviewStrip}>

        <div className={styles.overviewCard}>
          <span className={styles.overviewCardLabel}>🇺🇸 美国净流动性</span>
          {isPending ? (
            <span className={styles.overviewCardPending}>数据待接入</span>
          ) : (
            <>
              <span className={styles.overviewCardValue}>
                {netValue !== null ? `${(netValue / 1000).toFixed(1)}T` : '—'}
              </span>
              {netCtx && <span className={styles.overviewCardCtx}>{netCtx}</span>}
              {isPartial && (
                <span className={styles.overviewCardPending}>部分数据（分量数据不完整）</span>
              )}
            </>
          )}
          <span className={styles.overviewCardSub}>
            公式：WALCL − TGA − RRP<br />
            数据源：FRED H.4.1（周度）
          </span>
        </div>

        <div className={styles.overviewCard}>
          <span className={styles.overviewCardLabel}>🌐 全球流动性</span>
          <span className={styles.overviewCardPending}>数据待接入</span>
          <span className={styles.overviewCardSub}>
            公式：Fed + ECB + BOJ − TGA − ¼ RRP<br />
            数据源：各央行资产负债表（月度）
          </span>
        </div>

      </div>
    </section>
  );
}

