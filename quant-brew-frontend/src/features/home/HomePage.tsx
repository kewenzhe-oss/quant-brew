import { PageLayout } from '@/app/layouts/PageLayout';
import { AIMarker } from '@/shared/components/AIMarker';
import { useMarketIntelligence } from '@/shared/market-intelligence';
import {
  headlineSummary,
  whatChanged,
  whatMatters,
  whatToWatch,
  verdictOneLiner,
  snapshotTimestamp,
} from '@/shared/market-intelligence';
import { HeadlineSummary } from './HeadlineSummary';
import { MarketSnapshot } from './MarketSnapshot';
import { KeyMoversStrip } from './KeyMoversStrip';
import { HomeContextPanel } from './HomeContextPanel';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <PageLayout
      main={<HomeMainContent />}
      context={<HomeContextPanel />}
    />
  );
}

function HomeMainContent() {
  const { snapshot, isLoading, isPartiallyReal } = useMarketIntelligence();

  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  // Morning = before 14:00 local time; evening otherwise
  const sessionType: 'morning' | 'evening' = today.getHours() < 14 ? 'morning' : 'evening';

  const headline  = headlineSummary(snapshot);
  const changed   = whatChanged(snapshot);
  const matters   = whatMatters(snapshot);
  const toWatch   = whatToWatch(snapshot);
  const verdict   = verdictOneLiner(snapshot);
  const ts        = snapshotTimestamp(snapshot);
  const sourceLabel = isPartiallyReal ? '规则推导' : '模拟数据';

  return (
    <div className={styles.main}>
      {/* 1. Direction — headline derived from shared snapshot */}
      <HeadlineSummary
        type={sessionType}
        date={dateStr}
        summary={isLoading ? '加载中…' : headline}
      />

      {/* 2. Context — live market numbers (own ticker strip) */}
      <MarketSnapshot />

      {/* 3. Intelligence — shared narrative from same snapshot powering Macro */}
      <AIMarker label="市场情报">
        <div className={styles.briefingBody}>

          {/* What changed */}
          {changed.length > 0 && (
            <div className={styles.narrativeBlock}>
              <h3 className={styles.narrativeTitle}>今日变化</h3>
              <ul className={styles.narrativeList}>
                {changed.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          )}

          {/* What matters */}
          {matters.length > 0 && (
            <div className={styles.narrativeBlock}>
              <h3 className={styles.narrativeTitle}>核心判断</h3>
              <ul className={styles.narrativeList}>
                {matters.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          )}

          {/* What to watch */}
          {toWatch.length > 0 && (
            <div className={styles.narrativeBlock}>
              <h3 className={styles.narrativeTitle}>今日关注</h3>
              <ul className={styles.narrativeList}>
                {toWatch.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          )}

        </div>

        <span className={styles.narrativeMeta}>
          宏观判断：{verdict}
          {' · '}生成于 {new Date(ts).toLocaleString('zh-CN')}
          {' · '}{sourceLabel}
        </span>
      </AIMarker>

      {/* 4. Movers — links into Research */}
      <KeyMoversStrip />

      {/* Briefing Archive — hidden until real Briefing API is connected.
          Do not render mock fabricated summaries as if they are real historical records. */}

      <footer className={styles.footer}>
        <span className={styles.mockNotice}>
          ⓘ 今日情报来源：共享市场快照（规则推导）· 往期简报待 Briefing API 接入后显示
        </span>
      </footer>
    </div>
  );
}
