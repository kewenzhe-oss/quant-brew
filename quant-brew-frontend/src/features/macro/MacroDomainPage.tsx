/**
 * MacroDomainPage — Layer 2: domain page with inline Tab switching.
 *
 * Route: /macro/:domainKey
 * UX:    Tab bar to switch sub-dimensions (e.g. U.S. / Global).
 *        Content updates inline — no page navigation needed.
 *
 * Scroll fix: renders itself as a full-height scrollable column
 *             using .pageScroll wrapper (overflow-y: auto).
 */

import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useMarketIntelligence } from '@/shared/market-intelligence';
import {
  resolveDomain,
  STATUS_LABELS,
  SIGNAL_LABELS,
  CHANGE_LABELS,
} from '@/shared/market-intelligence/constants';
import { buildDimensionDetail } from '@/shared/market-intelligence/dimensionDetail';

import { SemanticMetricBar } from './components/SemanticMetricBar';
import type { DimensionModule } from '@/shared/market-intelligence/dimensionDetail';
import styles from './MacroDomainPage.module.css';

/* Status → color */
const STATUS_COLOR: Record<string, string> = {
  healthy:   '#10b981',
  neutral:   '#a3a3a3',
  watch:     '#f59e0b',
  pressured: '#ef4444',
};

/* Domain Primary Lead Mapping */
const DOMAIN_PRIMARY_LEAD: Record<string, { slug: string; reason: string }> = {
  liquidity: { slug: 'us', reason: '美元流动性是全球资产定价的核心锚点，优先观测。' },
  economy: { slug: 'growth', reason: '经济动能直接决定企业盈利预期，是支撑风险资产的关键。' },
  inflation_rates: { slug: 'inflation', reason: '通胀粘性走向是决定美联储利率路径的最先决条件。' },
  sentiment: { slug: 'fear-greed', reason: '资金的整体风险偏好最能够前置性地反映情绪拐点。' },
};

export function MacroDomainPage() {
  const { domainKey } = useParams<{ domainKey: string }>();
  const { snapshot, isLoading } = useMarketIntelligence();

  const domain = domainKey ? resolveDomain(domainKey) : null;
  if (!domain) return <Navigate to="/macro" replace />;

  // Active tab = first sub-dimension by default
  const [activeSlug, setActiveSlug] = useState<string>(domain.dims[0]?.slug ?? '');

  if (isLoading) {
    return (
      <div className={styles.pageScroll}>
        <div className={styles.loadingCenter}>加载中…</div>
      </div>
    );
  }

  const dim    = snapshot.macro[domain.key];
  const detail = buildDimensionDetail(domain.key, snapshot);
  const statusColor   = STATUS_COLOR[dim.status] ?? '#a3a3a3';
  const primaryLead = DOMAIN_PRIMARY_LEAD[domain.key];
  
  // Set tab active state
  const activeDimMeta = domain.dims.find((d) => d.slug === activeSlug) ?? domain.dims[0];
  const expectedModuleIds = activeDimMeta.moduleIds || [activeDimMeta.slug];
  // Break down what is meant to be previewed
  const activePreviewModules = detail.modules.filter((m) => expectedModuleIds.includes(m.id));
  
  // High-level summary metrics across the domain (DomainSummaryRow)
  const snapshotMetrics = dim.metrics.slice(0, 4);

  return (
    <div className={styles.pageScroll}>
      <div className={styles.page}>

        {/* ── Breadcrumb ── */}
        <nav className={styles.breadcrumb}>
          <Link to="/macro" className={styles.crumbLink}>宏观总览</Link>
          <span className={styles.crumbSep}>›</span>
          <span className={styles.crumbCurrent}>{domain.title}</span>
        </nav>

        {/* 1. DomainQuestionHeader */}
        <header className={styles.domainHeader}>
          <div className={styles.domainTitleRow}>
            <h1 className={styles.domainTitle}>{domain.title}</h1>
            <div className={styles.domainBadges}>
              <span
                className={styles.statusBadge}
                style={{ color: statusColor, borderColor: statusColor }}
              >
                {STATUS_LABELS[dim.status]}
              </span>
              <span className={styles.changeBadge}>{CHANGE_LABELS[dim.change]}</span>
              {dim.confidence < 65 && (
                <span className={styles.confBadge}>置信度 {dim.confidence}%</span>
              )}
            </div>
          </div>
          <p className={styles.domainQuestion}>{domain.coreQuestion}</p>
        </header>

        {/* 2. PrimaryDimensionLead & NarrativeBrief */}
        <section className={styles.verdictSection}>
          <div className={styles.verdictOneLiner}>
            <span className={styles.signalDot} data-signal={dim.signal} />
            <span>{detail.verdict.oneLiner}</span>
          </div>
          <p className={styles.verdictSignal}>
            {SIGNAL_LABELS[dim.signal]} · {detail.verdict.dataQualityLabel}
          </p>
          {primaryLead && (
            <div className={styles.primaryLeadBox}>
              <span className={styles.primaryLeadLabel}>主导维度优先：{domain.dims.find((d) => d.slug === primaryLead.slug)?.title}</span>
              <span className={styles.primaryLeadReason}>{primaryLead.reason}</span>
            </div>
          )}
          <div className={styles.narrativeBrief}>
            <p><strong>当前状况：</strong>{detail.interpretation.current}</p>
            <p><strong>预期演进：</strong>{detail.interpretation.outlook}</p>
          </div>
        </section>
        
        {/* 3. DimensionSummaryRow (Metrics) */}
        {snapshotMetrics.length > 0 && (
          <div className={styles.snapshotBlock}>
            <p className={styles.blockLabel}>域维度快照指标</p>
            <div className={styles.snapshotGrid}>
              {snapshotMetrics.map((m, i) => (
                <SemanticMetricBar key={i} metric={m} />
              ))}
            </div>
          </div>
        )}

        {/* 4. DimensionTabs (Pure Previewer) */}
        <div className={styles.tabBar}>
          {domain.dims.map((d) => (
            <button
              key={d.slug}
              className={styles.tabBtn}
              data-active={d.slug === activeSlug}
              onClick={() => setActiveSlug(d.slug)}
            >
              {d.title}
            </button>
          ))}
        </div>

        {/* 5. DomainBreakdownPreview */}
        <div className={styles.tabPanel}>
          {activeDimMeta && (
            <div className={styles.tabQuestion}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p className={styles.tabQuestionLabel}>维度预览：{activeDimMeta.title}</p>
                <Link to={`/macro/${domain.key}/${activeDimMeta.slug}`} className={styles.drilldownLinkBtn}>
                  进入{activeDimMeta.title}深度论证 ▸
                </Link>
              </div>
              <p className={styles.tabThesis}>{activeDimMeta.thesis}</p>
            </div>
          )}

          {activePreviewModules.length > 0 ? (
            <div className={styles.previewGrid}>
              {activePreviewModules.map((mod) => (
                <div key={mod.id} className={styles.previewCard}>
                  <p className={styles.previewCardLabel}>{mod.title}</p>
                  <p className={styles.previewCardDesc}>{mod.moduleQuestion}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.previewCard}>
              <p className={styles.previewCardLabel}>数据接入中</p>
            </div>
          )}
        </div>

        {/* 6. NextWatchpoints */}
        {detail.watchpoints.length > 0 && (
          <section className={styles.watchSection}>
            <p className={styles.blockLabel}>近期观察重点</p>
            <ul className={styles.watchList}>
              {detail.watchpoints.slice(0, 3).map((w, i) => (
                <li key={i} className={styles.watchItem}>
                  <span className={styles.watchDot} />
                  {w}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className={styles.pageFooter}>
          <Link to="/macro" className={styles.backLink}>← 返回宏观总览</Link>
          <span className={styles.footerNote}>
            置信度 {detail.verdict.confidence}% · {detail.verdict.dataQualityLabel}
          </span>
        </footer>

      </div>
    </div>
  );
}


