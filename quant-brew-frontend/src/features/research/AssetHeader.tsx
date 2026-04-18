import { MicroLabel } from '@/shared/components/MicroLabel';
import styles from './AssetHeader.module.css';

interface AssetHeaderProps {
  symbol: string;
  market: string;
  name: string | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  sector?: string | null;
  exchange?: string | null;
}

const MARKET_LABELS: Record<string, string> = {
  USStock: '美股',
  Crypto: '加密',
  Forex: '外汇',
  CNStock: 'A股',
  HKStock: '港股',
};

export function AssetHeader({
  symbol,
  market,
  name,
  price,
  change,
  changePercent,
  sector,
  exchange,
}: AssetHeaderProps) {
  const isCrypto = market === 'Crypto';
  const showSector = !isCrypto && !!sector;
  const isUp = (changePercent ?? 0) >= 0;
  const sign = isUp ? '+' : '';

  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <div className={styles.titleRow}>
          <h1 className={styles.symbol}>{symbol}</h1>
          {name && <span className={styles.name}>{name}</span>}
          <MicroLabel color="gold">{MARKET_LABELS[market] ?? market}</MicroLabel>
        </div>
        {(showSector || exchange) && (
          <div className={styles.metaRow}>
            {showSector && <span className={styles.meta}>{sector}</span>}
            {showSector && exchange && <span className={styles.metaSep}>·</span>}
            {exchange && <span className={styles.meta}>{exchange}</span>}
          </div>
        )}
      </div>

      <div className={styles.priceBlock}>
        {price != null ? (
          <>
            <span className={styles.price}>{formatPrice(price)}</span>
            {changePercent != null && (
              <span className={`${styles.change} ${isUp ? styles.up : styles.down}`}>
                {change != null && <>{sign}{formatPrice(change)}</>}
                {' '}({sign}{changePercent.toFixed(2)}%)
              </span>
            )}
          </>
        ) : (
          <span className={styles.priceLoading}>—</span>
        )}
      </div>

      <div className={styles.viewToggle}>
        <button className={`${styles.segment} ${styles.segmentActive}`}>
          研究概览
        </button>
        <button className={`${styles.segment} ${styles.segmentDeferred}`} disabled>
          技术图表
          <span className={styles.comingSoon}>即将推出</span>
        </button>
      </div>
    </header>
  );
}

function formatPrice(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
