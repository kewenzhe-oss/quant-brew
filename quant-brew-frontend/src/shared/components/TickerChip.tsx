import { Link } from 'react-router-dom';
import styles from './TickerChip.module.css';

interface TickerChipProps {
  symbol: string;
  name?: string;
  market?: string;
}

export function TickerChip({ symbol, name, market = 'USStock' }: TickerChipProps) {
  return (
    <Link
      to={`/research/${market}/${symbol}`}
      className={styles.chip}
      title={name}
    >
      {name ?? symbol}
    </Link>
  );
}
