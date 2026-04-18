import { useOpportunities } from '@/shared/hooks/useGlobalMarket';
import { PriceChange } from '@/shared/components/PriceChange';
import { Link } from 'react-router-dom';
import styles from './KeyMoversStrip.module.css';

export function KeyMoversStrip() {
  const { data } = useOpportunities();
  const items = data?.opportunities?.slice(0, 5) ?? [];

  if (items.length === 0) return null;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>今日关键异动</h3>
      <div className={styles.strip}>
        {items.map((item) => (
          <Link
            key={item.symbol}
            to={`/research/${item.market ?? 'USStock'}/${item.symbol}`}
            className={styles.card}
          >
            <div className={styles.cardTop}>
              <span className={styles.symbol}>{item.symbol}</span>
              <PriceChange changePercent={item.change_percent} />
            </div>
            <span className={styles.name}>{item.name}</span>
            {item.reason && (
              <span className={styles.reason}>{item.reason}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
