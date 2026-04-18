import { useParams, Link, Navigate } from 'react-router-dom';
import { useMarketIntelligence } from '@/shared/market-intelligence';
import { DIMENSION_KEYS } from '@/shared/market-intelligence/constants';
import { buildDimensionDetail } from '@/shared/market-intelligence/dimensionDetail';
import type { DimensionKey } from '@/shared/market-intelligence/types';
import { DimensionVerdictBlock } from './DimensionVerdictBlock';
import { DimensionInterpretationBlock } from './DimensionInterpretationBlock';
import { DimensionModuleGroup } from './DimensionModuleGroup';
import { DimensionWatchpoints } from './DimensionWatchpoints';
import styles from './MacroDimensionPage.module.css';

export function MacroDimensionPage() {
  const { dimensionKey } = useParams<{ dimensionKey: string }>();
  const { snapshot, isLoading } = useMarketIntelligence();

  const isValid = dimensionKey && (DIMENSION_KEYS as readonly string[]).includes(dimensionKey);

  if (!isValid) return <Navigate to="/macro" replace />;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}><span>加载维度数据…</span></div>
      </div>
    );
  }

  const detail = buildDimensionDetail(dimensionKey as DimensionKey, snapshot);

  return (
    <div className={styles.page}>

      {/* Nav back */}
      <nav className={styles.nav}>
        <Link to="/macro" className={styles.backLink}>← 宏观总览</Link>
      </nav>

      {/* 1. Question definition */}
      <header className={styles.questionBlock}>
        <p className={styles.questionLabel}>本页回答的问题</p>
        <h1 className={styles.question}>{detail.coreQuestion}</h1>
        <p className={styles.dimensionLabel}>{detail.title}维度</p>
      </header>

      <div className={styles.body}>

        {/* 2. Top-level verdict — conclusion first */}
        <DimensionVerdictBlock verdict={detail.verdict} summary={detail.verdict.oneLiner} />

        {/* 2b. Liquidity-specific: two overview indicators */}
        {dimensionKey === 'liquidity' && <LiquidityOverviewStrip />}

        {/* 3. Three-part interpretation */}
        <DimensionInterpretationBlock interpretation={detail.interpretation} />

        {/* 4. Causal modules */}
        <DimensionModuleGroup modules={detail.modules} />

        {/* 5. Watchpoints */}
        <DimensionWatchpoints watchpoints={detail.watchpoints} risks={detail.risks} />

      </div>

      <footer className={styles.pageFooter}>
        <Link to="/macro" className={styles.backLink}>← 返回宏观总览</Link>
        <span className={styles.footerNote}>
          置信度 {detail.verdict.confidence}% · {detail.verdict.dataQualityLabel}
        </span>
      </footer>

    </div>
  );
}

/* ── Two top-level liquidity overview indicators ──
 *
 * 美国流动性 = WALCL − TGA − RRP   (data pending)
 * 全球流动性 = Fed + ECB + BOJ − TGA − ¼ RRP  (data pending)
 *
 * Both show honest pending state. Scaffold is live so the page structure
 * is correct from day one. Values will populate when Fed data endpoints
 * are connected.
 */
function LiquidityOverviewStrip() {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>流动性概览</h2>
      <div className={styles.overviewStrip}>

        <div className={styles.overviewCard}>
          <span className={styles.overviewCardLabel}>🇺🇸 美国净流动性</span>
          <span className={styles.overviewCardPending}>数据待接入</span>
          <span className={styles.overviewCardSub}>
            公式：WALCL − TGA − RRP<br />
            数据源：美联储 H.4.1（周度）
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

