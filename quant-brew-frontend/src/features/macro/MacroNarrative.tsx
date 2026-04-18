import { useMarketIntelligence } from '@/shared/market-intelligence';
import { headlineSummary, whatChanged, snapshotTimestamp } from '@/shared/market-intelligence';
import { AIMarker } from '@/shared/components/AIMarker';
import styles from './MacroNarrative.module.css';

export function MacroNarrative() {
  const { snapshot, isPartiallyReal } = useMarketIntelligence();

  const headline = headlineSummary(snapshot);
  const changed  = whatChanged(snapshot);
  const ts       = snapshotTimestamp(snapshot);
  const label    = isPartiallyReal ? '规则推导' : '模拟数据';

  return (
    <section className={styles.section}>
      <AIMarker label="宏观解读">
        <h2 className={styles.heading}>{headline}</h2>
        {changed.length > 0 && (
          <ul className={styles.body}>
            {changed.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        )}
        <span className={styles.timestamp}>
          生成于 {new Date(ts).toLocaleString('zh-CN')}
          {' · '}{label}
        </span>
      </AIMarker>
    </section>
  );
}
