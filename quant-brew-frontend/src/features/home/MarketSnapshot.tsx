import { useMarketOverview } from '@/shared/hooks/useMarketOverview';
import { useSentiment } from '@/shared/hooks/useSentiment';
import styles from './MarketSnapshot.module.css';

export function MarketSnapshot() {
  const { data: overview } = useMarketOverview();
  const { data: sentiment } = useSentiment();

  const items = buildItems(overview, sentiment);

  if (items.length === 0) return null;

  return (
    <div className={styles.strip}>
      {items.map((t) => (
        <div key={t.label} className={styles.item}>
          <span className={styles.label}>{t.label}</span>
          <span className={styles.value}>{t.value}</span>
          {t.change != null && (
            <span className={t.change >= 0 ? styles.up : styles.down}>
              {t.change >= 0 ? '+' : ''}{t.changeDisplay}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

interface SnapItem {
  label: string;
  value: string;
  change?: number;
  changeDisplay?: string;
}

function buildItems(
  overview: ReturnType<typeof useMarketOverview>['data'],
  sentiment: ReturnType<typeof useSentiment>['data'],
): SnapItem[] {
  const items: SnapItem[] = [];

  if (overview) {
    const spx = overview.us_indices?.find(
      (i) => i.symbol?.includes('SPX') || i.symbol?.includes('SPY') || i.name?.includes('S&P'),
    );
    const ndx = overview.us_indices?.find(
      (i) => i.symbol?.includes('NDX') || i.symbol?.includes('QQQ') || i.name?.includes('Nasdaq'),
    );

    if (spx) {
      items.push({
        label: 'S&P 500',
        value: fmtPrice(spx.price),
        change: spx.change_percent,
        changeDisplay: `${spx.change_percent.toFixed(2)}%`,
      });
    }
    if (ndx) {
      items.push({
        label: 'Nasdaq',
        value: fmtPrice(ndx.price),
        change: ndx.change_percent,
        changeDisplay: `${ndx.change_percent.toFixed(2)}%`,
      });
    }
  }

  if (sentiment) {
    items.push({
      label: 'VIX',
      value: sentiment.vix?.value?.toFixed(1) ?? '—',
    });
    items.push({
      label: 'DXY',
      value: sentiment.dxy?.value?.toFixed(1) ?? '—',
    });
    if (sentiment.us10y) {
      items.push({
        label: 'US10Y',
        value: `${sentiment.us10y.value.toFixed(2)}%`,
      });
    }
  }

  return items;
}

function fmtPrice(n: number | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}
