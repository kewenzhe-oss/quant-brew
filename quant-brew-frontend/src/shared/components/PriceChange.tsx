import styles from './PriceChange.module.css';

interface PriceChangeProps {
  price?: number;
  change?: number;
  changePercent: number;
  size?: 'sm' | 'md' | 'lg';
  showPrice?: boolean;
}

export function PriceChange({
  price,
  change,
  changePercent,
  size = 'sm',
  showPrice = false,
}: PriceChangeProps) {
  const isUp = changePercent >= 0;
  const sign = isUp ? '+' : '';
  const colorClass = isUp ? styles.up : styles.down;

  return (
    <span className={`${styles.wrapper} ${styles[size]}`}>
      {showPrice && price != null && (
        <span className={styles.price}>{formatNum(price)}</span>
      )}
      {change != null && (
        <span className={`${styles.change} ${colorClass}`}>
          {sign}{formatNum(change)}
        </span>
      )}
      <span className={`${styles.percent} ${colorClass}`}>
        {sign}{changePercent.toFixed(2)}%
      </span>
    </span>
  );
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
