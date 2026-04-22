import type { BreakdownOutlineNode } from '@/shared/market-intelligence/dimensionDetail';
import styles from './BreakdownSection.module.css';

interface Props {
  outline: { id: string; title: string; question: string }[];
}

export function BreakdownSection({ outline }: Props) {
  if (!outline || outline.length === 0) return null;

  return (
    <section className={styles.breakdownSection}>
      <h2 className={styles.sectionTitle}>维度解构：框架剖析</h2>
      <p className={styles.sectionDesc}>
        要看清本维度的全貌，我们需要自上而下将其拆解为以下几个核心观察点。
      </p>

      <div className={styles.outlineGrid}>
        {outline.map((node, i) => (
          <div key={node.id} className={styles.outlineCard}>
            <div className={styles.stepNumber}>0{i + 1}</div>
            <div className={styles.cardContent}>
              <h3 className={styles.nodeTitle}>{node.title}</h3>
              <p className={styles.nodeQuestion}>{node.question}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
