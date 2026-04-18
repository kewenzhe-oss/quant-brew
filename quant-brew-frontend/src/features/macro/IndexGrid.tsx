import { useMarketOverview } from '@/shared/hooks/useMarketOverview';
import { PriceChange } from '@/shared/components/PriceChange';
import styles from './IndexGrid.module.css';

export function IndexGrid() {
  const { data, isLoading } = useMarketOverview();

  if (isLoading) return <div className={styles.loading}>加载中…</div>;
  if (!data) return null;

  const indices = [
    ...(data.us_indices ?? []),
    ...(data.global_indices ?? []),
  ].slice(0, 12);

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>主要指数</h3>
      <div className={styles.grid}>
        {indices.map((idx) => (
          <div key={idx.symbol ?? idx.name} className={styles.card}>
            <span className={styles.name}>{idx.name}</span>
            <div className={styles.priceRow}>
              <span className={styles.price}>{fmtPrice(idx.price)}</span>
              <PriceChange changePercent={idx.change_percent} change={idx.change} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function fmtPrice(n: number | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
