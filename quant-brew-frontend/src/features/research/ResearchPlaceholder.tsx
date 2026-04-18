import { useParams } from 'react-router-dom';
import { PageLayout } from '@/app/layouts/PageLayout';
import styles from './ResearchPlaceholder.module.css';

export function ResearchPlaceholder() {
  const { market, symbol } = useParams<{ market: string; symbol: string }>();

  return (
    <PageLayout
      main={
        <div className={styles.placeholder}>
          <span className={styles.badge}>研究</span>
          <h1 className={styles.title}>
            {market && symbol ? `${symbol}` : '选择标的'}
          </h1>
          {market && symbol && (
            <p className={styles.meta}>{market} · {symbol}</p>
          )}
          <p className={styles.hint}>
            AI 研究分析与技术图表将在 Slice 2 中实现。
            <br />
            使用顶部导航切换页面。
          </p>
        </div>
      }
      context={
        <div className={styles.contextPlaceholder}>
          <span className={styles.contextLabel}>上下文面板</span>
          <p className={styles.hint}>关键指标、观察位、相关标的将在此显示。</p>
        </div>
      }
    />
  );
}
