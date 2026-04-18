import { useSentiment } from '@/shared/hooks/useSentiment';
import { DataCard } from '@/shared/components/DataCard';
import styles from './SentimentDashboard.module.css';

export function SentimentDashboard() {
  const { data, isLoading } = useSentiment();

  if (isLoading) return <div className={styles.loading}>加载中…</div>;
  if (!data) return null;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>市场情绪</h3>
      <div className={styles.grid}>
        <SentimentCard
          label="VIX 恐慌指数"
          value={data.vix?.value?.toFixed(1) ?? '—'}
          sub={data.vix?.status}
          change={data.vix?.change_percent}
        />
        <SentimentCard
          label="恐惧贪婪指数"
          value={String(data.fear_greed?.value ?? '—')}
          sub={data.fear_greed?.label}
          badge
        />
        <SentimentCard
          label="美元指数 DXY"
          value={data.dxy?.value?.toFixed(1) ?? '—'}
          change={data.dxy?.change_percent}
        />
        <SentimentCard
          label="10Y 美债收益率"
          value={data.us10y?.value != null ? `${data.us10y.value.toFixed(2)}%` : '—'}
          change={data.us10y?.change}
        />
        {data.yield_curve && (
          <SentimentCard
            label="收益率曲线"
            value={`${data.yield_curve.spread > 0 ? '+' : ''}${data.yield_curve.spread.toFixed(0)}bps`}
            sub={data.yield_curve.status}
          />
        )}
        {data.put_call_ratio && (
          <SentimentCard
            label="Put/Call 比率"
            value={data.put_call_ratio.value?.toFixed(2) ?? '—'}
            sub={data.put_call_ratio.status}
          />
        )}
      </div>
    </section>
  );
}

interface SentimentCardProps {
  label: string;
  value: string;
  sub?: string;
  change?: number;
  badge?: boolean;
}

function SentimentCard({ label, value, sub, change, badge }: SentimentCardProps) {
  return (
    <DataCard>
      <div className={styles.card}>
        <span className={styles.cardLabel}>{label}</span>
        <span className={styles.cardValue}>{value}</span>
        {sub && (
          <span className={`${styles.cardSub} ${badge ? styles.badge : ''}`}>
            {sub}
          </span>
        )}
        {change != null && (
          <span className={change >= 0 ? styles.up : styles.down}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
        )}
      </div>
    </DataCard>
  );
}
