import { Link } from 'react-router-dom';
import { useMarketIntelligence } from '@/shared/market-intelligence';
import {
  STANCE_ASSET_ADVICE,
  STANCE_LABELS,
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  STATUS_LABELS,
  SIGNAL_LABELS,
  CHANGE_LABELS,
} from '@/shared/market-intelligence/constants';
import { SemanticMetricBar } from './components/SemanticMetricBar';
import { ForwardAnchors } from './components/ForwardAnchors';
import styles from './MacroDecisionEngine.module.css';
import type { DimensionAssessment, DimensionKey, VerdictStance } from '@/shared/market-intelligence/types';

/* ── Elevation weight for sorting cards ── */
function elevationWeight(dim: DimensionAssessment): number {
  let s = 0;
  if (dim.status === 'pressured') s += 10;
  if (dim.status === 'watch') s += 5;
  if (dim.signal === 'risk_headwind' || dim.signal === 'defensive') s += 4;
  if (dim.signal === 'risk_supportive') s += 4;
  if (dim.change === 'weakening' || dim.change === 'improving') s += 2;
  return s;
}

/* ── Status → compact label for the dimension strip ── */
const STATUS_STRIP_LABEL: Record<string, string> = {
  healthy:   '偏松',
  neutral:   '中性',
  watch:     '偏紧',
  pressured: '承压',
};

/* ── Status → color token for the strip dot ── */
const STATUS_COLOR: Record<string, string> = {
  healthy:   '#10b981',
  neutral:   '#a3a3a3',
  watch:     '#f59e0b',
  pressured: '#ef4444',
};

/* ── Sentiment-specific strip labels ── */
function sentimentStripLabel(dim: DimensionAssessment): string {
  const fg = dim.metrics?.find((m) => m.key === 'fear_greed');
  if (fg) {
    if (fg.value >= 75) return '极度贪婪';
    if (fg.value >= 55) return '贪婪';
    if (fg.value >= 45) return '中性';
    if (fg.value >= 25) return '恐惧';
    return '极度恐惧';
  }
  return STATUS_STRIP_LABEL[dim.status] ?? '中性';
}

/* ── Resolve URL key from internal DimensionKey ── */
function factorUrlKey(key: DimensionKey): string {
  if (key === 'inflation_rates') return 'inflationRates';
  return key;
}

/* ── Four-dimension strip ── */
interface DimStripItem {
  key: DimensionKey;
  label: string;
  stripLabel: string;
  color: string;
  url: string;
}

function buildStripItems(
  macro: ReturnType<typeof useMarketIntelligence>['snapshot']['macro'],
): DimStripItem[] {
  return DIMENSION_KEYS.map((key) => {
    const dim = macro[key];
    const stripLabel = key === 'sentiment'
      ? sentimentStripLabel(dim)
      : (STATUS_STRIP_LABEL[dim.status] ?? '中性');
    return {
      key,
      label: DIMENSION_LABELS[key],
      stripLabel,
      color: STATUS_COLOR[dim.status] ?? '#a3a3a3',
      url: `/macro/${factorUrlKey(key)}`,
    };
  });
}

/* ══════════════════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════════════════ */

export function MacroDecisionEngine() {
  const { snapshot, isLoading } = useMarketIntelligence();

  if (isLoading) {
    return <div className={styles.loading}>加载中…</div>;
  }

  const { macro, narrative } = snapshot;
  const stance = macro.overall_verdict.stance;
  const stripItems = buildStripItems(macro);

  /* Sort & split dimension cards */
  let dims = DIMENSION_KEYS.map((key) => ({
    key,
    data: macro[key],
    summary: narrative.dimension_summaries[key],
    score: elevationWeight(macro[key]),
  })).sort((a, b) => b.score - a.score);

  let primary = dims.filter((d) => d.score >= 5);
  let secondary = dims.filter((d) => d.score < 5);
  if (primary.length === 0 && secondary.length > 0) primary.push(secondary.shift()!);
  if (primary.length > 2) { secondary = [...primary.splice(2), ...secondary]; }

  return (
    <div className={styles.engineLayout}>

      {/* ── 1. MacroHeroQuestion ── */}
      <MacroHeroQuestion />

      {/* ── 2. MacroVerdictStrip ── */}
      <MacroVerdictStrip items={stripItems} />

      {/* ── 3. MacroMasterNarrative ── */}
      <MacroMasterNarrative stance={stance} verdict={macro.overall_verdict.one_liner} />

      {/* ── 4. DomainEntryGrid ── */}
      <DomainEntryGrid primary={primary} secondary={secondary} />

      {/* ── 5. MacroWatchlist ── */}
      <MacroWatchlist watchpoints={narrative.what_to_watch} />

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Subcomponents for the 5-Layer Blueprint
   ══════════════════════════════════════════════════════════════ */

function MacroHeroQuestion() {
  return (
    <div className={styles.framingBlock}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className={styles.framingLabel}>宏观仪表盘</p>
          <h1 className={styles.framingQuestion}>
            现在的宏观底色是什么？更偏进攻还是防守？
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>最后更新于: 刚刚</p>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: '#ccc', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>↻ 刷新推演</button>
        </div>
      </div>
    </div>
  );
}

function MacroVerdictStrip({ items }: { items: DimStripItem[] }) {
  return (
    <div className={styles.dimStrip}>
      {items.map((item) => (
        <Link key={item.key} to={item.url} className={styles.stripItem}>
          <span className={styles.stripDot} style={{ background: item.color }} />
          <span className={styles.stripDimLabel}>{item.label}</span>
          <span className={styles.stripStatus} style={{ color: item.color }}>
            {item.stripLabel}
          </span>
        </Link>
      ))}
    </div>
  );
}

function MacroMasterNarrative({ stance, verdict }: { stance: VerdictStance, verdict: string }) {
  return (
    <div className={styles.verdictBlock}>
      <div className={styles.stancePill} data-stance={stance}>
        {STANCE_LABELS[stance]}
      </div>
      <h2 className={styles.verdictHeadline}>{verdict}</h2>
      <p className={styles.verdictBody}>{STANCE_ASSET_ADVICE[stance]}</p>
    </div>
  );
}

function DomainEntryGrid({ primary, secondary }: { primary: any[], secondary: any[] }) {
  return (
    <section className={styles.dimSection}>
      <div className={styles.grid}>
        {primary.map((d) => (
          <DomainEntryCard key={d.key} dimKey={d.key} dim={d.data} summary={d.summary} isPrimary />
        ))}
        {secondary.map((d) => (
          <DomainEntryCard key={d.key} dimKey={d.key} dim={d.data} summary={d.summary} isPrimary={false} />
        ))}
      </div>
    </section>
  );
}

function MacroWatchlist({ watchpoints }: { watchpoints: string[] }) {
  // Pass through to ForwardAnchors, but wrapping strictly as MacroWatchlist structurally
  return <ForwardAnchors watchpoints={watchpoints} />;
}

/* ══════════════════════════════════════════════════════════════
   DimensionCard — now shows "这个维度看什么" + conclusion first
   ══════════════════════════════════════════════════════════════ */

const DIM_QUESTION: Record<DimensionKey, string> = {
  liquidity:       '市场上的钱是多了还是少了？利率环境在收紧还是放松？',
  economy:         '经济在扩张还是收缩？企业与消费者端的信号一致吗？',
  inflation_rates: '通胀是否在给降息创造空间？还是持续制约联储行动？',
  sentiment:       '市场在恐慌还是贪婪？情绪是否已到拐点区间？',
};

interface DimensionCardProps {
  dimKey: DimensionKey;
  dim: DimensionAssessment;
  summary: string;
  isPrimary: boolean;
}

function DomainEntryCard({ dimKey, dim, summary, isPrimary }: DimensionCardProps) {
  const cardClass = isPrimary
    ? `${styles.dimCard} ${styles.isPrimary}`
    : styles.dimCard;

  return (
    <div className={cardClass}>

      {/* Header: title + status badges */}
      <div className={styles.dimHeader}>
        <span className={styles.dimTitle}>{DIMENSION_LABELS[dimKey]}</span>
        <div className={styles.dimBadges}>
          <span className={`${styles.badge} ${styles[dim.status]}`}>
            {STATUS_LABELS[dim.status]}
          </span>
          <span className={styles.badge}>{CHANGE_LABELS[dim.change]}</span>
        </div>
      </div>

      {/* "这个维度看什么" — why this dimension exists */}
      <p className={styles.dimQuestion}>{DIM_QUESTION[dimKey]}</p>

      {/* Conclusion summary */}
      <p className={styles.dimSummary}>{summary}</p>

      {/* Core metrics */}
      {dim.metrics && dim.metrics.length > 0 ? (
        <div
          className={styles.metricsWrapper}
          style={!isPrimary ? { gridTemplateColumns: '1fr' } : undefined}
        >
          {dim.metrics.slice(0, isPrimary ? 4 : 2).map((m, i) => (
            <SemanticMetricBar key={i} metric={m} />
          ))}
        </div>
      ) : (
        <div className={styles.metricsEmpty}>数据接入中…</div>
      )}

      {/* Signal context */}
      <p className={styles.signalContext}>
        <span className={styles.signalDot} data-signal={dim.signal} />
        {SIGNAL_LABELS[dim.signal]}
        {dim.confidence < 60 && (
          <span className={styles.lowConf}> · 置信度 {dim.confidence}%</span>
        )}
      </p>

      {/* Drilldown link → Layer 2 domain page */}
      <Link to={`/macro/${factorUrlKey(dimKey)}`} className={styles.drilldownLink}>
        查看{DIMENSION_LABELS[dimKey]}详情 ▸
      </Link>

    </div>
  );
}
