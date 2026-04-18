/**
 * DimensionInterpretationBlock — three-part structured interpretation.
 * Always in fixed order: 当前状况 / 近期趋势 / 未来展望
 * Content is rule-derived from visible metrics; no freeform AI prose.
 */

import type { DimensionInterpretation } from '@/shared/market-intelligence/dimensionDetail';
import styles from './MacroDimensionPage.module.css';

interface Props {
  interpretation: DimensionInterpretation;
}

const BLOCKS = [
  { icon: '◎', label: '当前状况', field: 'current' as const },
  { icon: '↗', label: '近期趋势', field: 'trend'   as const },
  { icon: '◈', label: '未来展望', field: 'outlook'  as const },
] as const;

export function DimensionInterpretationBlock({ interpretation }: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>解读</h2>
      <div className={styles.interpretationGrid}>
        {BLOCKS.map(({ icon, label, field }) => (
          <div key={field} className={styles.interpretRow}>
            <div className={styles.interpretIcon}>{icon}</div>
            <div className={styles.interpretContent}>
              <span className={styles.interpretLabel}>{label}</span>
              <p className={styles.interpretText}>{interpretation[field]}</p>
            </div>
          </div>
        ))}
      </div>
      <p className={styles.interpNote}>
        ⓘ 解读内容由规则引擎从已呈现指标中自动推导，不含额外推断。
      </p>
    </section>
  );
}
