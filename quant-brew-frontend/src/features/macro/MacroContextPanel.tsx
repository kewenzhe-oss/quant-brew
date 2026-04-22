import { useHeatmap, useOpportunities, useNews } from '@/shared/hooks/useGlobalMarket';
import { useMarketOverview } from '@/shared/hooks/useMarketOverview';
import { DataCard } from '@/shared/components/DataCard';
import { PriceChange } from '@/shared/components/PriceChange';
import styles from './MacroContextPanel.module.css';

export function MacroContextPanel() {
  return (
    <div className={styles.panel}>
      <HeatmapSection />
      <OpportunitiesSection />
      <ForexSection />
      <NewsSection />
    </div>
  );
}

function HeatmapSection() {
  const { data } = useHeatmap();
  const sectors = data?.sectors ?? [];
  if (sectors.length === 0) return null;

  return (
    <DataCard title="板块热力">
      <div className={styles.sectorList}>
        {sectors.slice(0, 11).map((s) => (
          <div key={s.name} className={styles.sectorRow}>
            <span className={styles.sectorName}>{s.name}</span>
            <span
              className={`${styles.sectorChange} ${s.change_percent >= 0 ? styles.up : styles.down}`}
            >
              {s.change_percent >= 0 ? '+' : ''}{(s.change_percent ?? 0).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </DataCard>
  );
}

function OpportunitiesSection() {
  const { data } = useOpportunities();
  const items = data?.opportunities ?? [];
  if (items.length === 0) return null;

  return (
    <DataCard title="异动标的">
      <div className={styles.opList}>
        {items.slice(0, 8).map((item) => (
          <div key={item.symbol} className={styles.opRow}>
            <div className={styles.opInfo}>
              <span className={styles.opSymbol}>{item.symbol}</span>
              <span className={styles.opName}>{item.name}</span>
            </div>
            <PriceChange changePercent={item.change_percent} />
          </div>
        ))}
      </div>
    </DataCard>
  );
}

function ForexSection() {
  const { data } = useMarketOverview();
  const forex = data?.forex ?? [];
  if (forex.length === 0) return null;

  return (
    <DataCard title="外汇">
      <div className={styles.forexList}>
        {forex.slice(0, 6).map((pair) => (
          <div key={pair.symbol ?? pair.name} className={styles.forexRow}>
            <span className={styles.forexName}>{pair.name}</span>
            <span className={styles.forexPrice}>{(pair.price ?? 0).toFixed(4)}</span>
            <PriceChange changePercent={pair.change_percent} />
          </div>
        ))}
      </div>
    </DataCard>
  );
}

function NewsSection() {
  const { data } = useNews();
  const articles = data?.articles ?? [];
  if (articles.length === 0) return null;

  return (
    <DataCard title="市场新闻">
      <div className={styles.newsList}>
        {articles.slice(0, 8).map((a, i) => (
          <a
            key={i}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.newsItem}
          >
            <span className={styles.newsTitle}>{a.title}</span>
            <span className={styles.newsMeta}>
              {a.source} · {formatTime(a.published_at)}
            </span>
          </a>
        ))}
      </div>
    </DataCard>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3_600_000);
    if (diffH < 1) return '刚刚';
    if (diffH < 24) return `${diffH}小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
