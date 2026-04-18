import { NavLink } from 'react-router-dom';
import { useMarketOverview } from '@/shared/hooks/useMarketOverview';
import { useSentiment } from '@/shared/hooks/useSentiment';
import styles from './MacroStrip.module.css';

const NAV_ITEMS = [
  { to: '/', label: '首页' },
  { to: '/macro', label: '宏观' },
  { to: '/research', label: '研究' },
  { to: '/watchlist', label: '关注' },
] as const;

export function MacroStrip() {
  const { data: overview } = useMarketOverview();
  const { data: sentiment } = useSentiment();

  const tickers = buildTickerItems(overview, sentiment);

  return (
    <header className={styles.strip}>
      <div className={styles.brand}>QB</div>

      <div className={styles.tickers}>
        {tickers.map((t) => (
          <span key={t.label} className={styles.tickerItem}>
            <span className={styles.tickerLabel}>{t.label}</span>
            <span className={styles.tickerValue}>{t.value}</span>
            {t.change != null && (
              <span className={t.change >= 0 ? styles.up : styles.down}>
                {t.change >= 0 ? '+' : ''}{t.changeDisplay}
              </span>
            )}
          </span>
        ))}
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navActive : ''}`
            }
            end={item.to === '/'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

interface TickerDisplay {
  label: string;
  value: string;
  change?: number;
  changeDisplay?: string;
}

function buildTickerItems(
  overview: ReturnType<typeof useMarketOverview>['data'],
  sentiment: ReturnType<typeof useSentiment>['data'],
): TickerDisplay[] {
  const items: TickerDisplay[] = [];

  if (overview) {
    const spx = overview.us_indices?.find(
      (i) => i.symbol?.includes('SPX') || i.symbol?.includes('SPY') || i.name?.includes('S&P'),
    );
    const ndx = overview.us_indices?.find(
      (i) => i.symbol?.includes('NDX') || i.symbol?.includes('QQQ') || i.name?.includes('Nasdaq'),
    );

    if (spx) {
      items.push({
        label: 'SPX',
        value: fmtPrice(spx.price),
        change: spx.change_percent,
        changeDisplay: `${spx.change_percent.toFixed(2)}%`,
      });
    }
    if (ndx) {
      items.push({
        label: 'NDX',
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
    items.push({
      label: 'US10Y',
      value: sentiment.us10y?.value != null ? `${sentiment.us10y.value.toFixed(2)}%` : '—',
    });
    if (sentiment.fear_greed) {
      items.push({
        label: 'F&G',
        value: `${sentiment.fear_greed.value} ${sentiment.fear_greed.label ?? ''}`.trim(),
      });
    }
  }

  return items;
}

function fmtPrice(n: number | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}
