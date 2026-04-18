import { useCalendar } from '@/shared/hooks/useGlobalMarket';
import styles from './EconomicCalendar.module.css';

const IMPACT_MAP: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export function EconomicCalendar() {
  const { data, isLoading } = useCalendar();

  if (isLoading) return <div className={styles.loading}>加载中…</div>;

  const events = data?.events ?? [];
  if (events.length === 0) return null;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>经济日历</h3>
      <div className={styles.table}>
        <div className={styles.headerRow}>
          <span className={styles.colDate}>日期</span>
          <span className={styles.colEvent}>事件</span>
          <span className={styles.colImpact}>影响</span>
          <span className={styles.colPrev}>前值</span>
          <span className={styles.colForecast}>预期</span>
        </div>
        {events.slice(0, 10).map((ev, i) => (
          <div key={i} className={styles.row}>
            <span className={styles.colDate}>
              {ev.date}{ev.time ? ` ${ev.time}` : ''}
            </span>
            <span className={styles.colEvent}>{ev.event}</span>
            <span className={`${styles.colImpact} ${styles[`impact_${ev.impact}`]}`}>
              {IMPACT_MAP[ev.impact] ?? ev.impact}
            </span>
            <span className={styles.colPrev}>{ev.previous ?? '—'}</span>
            <span className={styles.colForecast}>{ev.forecast ?? '—'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
