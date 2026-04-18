import { useMarketOverview } from '@/shared/hooks/useMarketOverview';
import { PriceChange } from '@/shared/components/PriceChange';
import styles from './CommoditiesStrip.module.css';

export function CommoditiesStrip() {
  const { data } = useMarketOverview();

  const commodities = data?.commodities ?? [];
  if (commodities.length === 0) return null;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>商品</h3>
      <div className={styles.strip}>
        {commodities.map((c) => (
          <div key={c.symbol ?? c.name} className={styles.item}>
            <span className={styles.name}>{c.name}</span>
            <span className={styles.price}>{fmtPrice(c.price)}</span>
            <PriceChange changePercent={c.change_percent} />
          </div>
        ))}
      </div>
    </section>
  );
}

function fmtPrice(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
