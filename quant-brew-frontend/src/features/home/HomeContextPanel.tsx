import { useCalendar, useNews } from '@/shared/hooks/useGlobalMarket';
import { DataCard } from '@/shared/components/DataCard';
import styles from './HomeContextPanel.module.css';

export function HomeContextPanel() {
  return (
    <div className={styles.panel}>
      <CalendarWidget />
      <NewsWidget />
    </div>
  );
}

function CalendarWidget() {
  const { data } = useCalendar();
  const events = data?.events?.slice(0, 5) ?? [];

  return (
    <DataCard title="经济日历">
      {events.length === 0 ? (
        <span className={styles.empty}>暂无数据</span>
      ) : (
        <div className={styles.calList}>
          {events.map((ev, i) => (
            <div key={i} className={styles.calRow}>
              <span className={styles.calDate}>{ev.date}</span>
              <span className={styles.calEvent}>{ev.event}</span>
              <span className={`${styles.calImpact} ${styles[`impact_${ev.impact}`]}`}>
                {ev.impact === 'high' ? '高' : ev.impact === 'medium' ? '中' : '低'}
              </span>
            </div>
          ))}
        </div>
      )}
    </DataCard>
  );
}

function NewsWidget() {
  const { data } = useNews();
  const articles = data?.articles?.slice(0, 6) ?? [];

  return (
    <DataCard title="市场快讯">
      {articles.length === 0 ? (
        <span className={styles.empty}>暂无新闻</span>
      ) : (
        <div className={styles.newsList}>
          {articles.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.newsItem}
            >
              <span className={styles.newsTitle}>{a.title}</span>
              <span className={styles.newsMeta}>{a.source}</span>
            </a>
          ))}
        </div>
      )}
    </DataCard>
  );
}
