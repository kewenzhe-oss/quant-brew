import { PageLayout } from '@/app/layouts/PageLayout';
import styles from './WatchlistPlaceholder.module.css';

export function WatchlistPlaceholder() {
  return (
    <PageLayout
      main={
        <div className={styles.placeholder}>
          <span className={styles.badge}>关注列表</span>
          <h1 className={styles.title}>我的关注</h1>
          <p className={styles.hint}>
            关注列表将在 Slice 2 中实现，支持追踪标的、查看每日变动、一键进入研究页面。
          </p>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◎</span>
            <span className={styles.emptyText}>添加你关注的标的</span>
          </div>
        </div>
      }
    />
  );
}
