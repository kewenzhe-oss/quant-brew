import { useAnalysisHistory } from '@/shared/hooks/useAnalysis';
import styles from './PreAnalysisContent.module.css';

interface PreAnalysisContentProps {
  market: string;
  symbol: string;
  onGenerate: () => void;
}

export function PreAnalysisContent({ market, symbol, onGenerate }: PreAnalysisContentProps) {
  const { data: history } = useAnalysisHistory(market, symbol);
  const hasHistory = history && history.length > 0;

  return (
    <div className={styles.root}>
      <section className={styles.intro}>
        <h2 className={styles.introTitle}>开始研究 {symbol}</h2>
        <p className={styles.introBody}>
          AI 将综合技术面、基本面和市场情绪，生成结构化研究报告。
          报告包含多空因素分析、关键观察位、趋势展望等维度。
        </p>
        <button className={styles.generateBtn} onClick={onGenerate}>
          生成 AI 研究分析
        </button>
        <p className={styles.hint}>分析通常需要 15–30 秒</p>
      </section>

      <section className={styles.coverageSection}>
        <h3 className={styles.sectionTitle}>分析覆盖范围</h3>
        <div className={styles.coverageGrid}>
          <CoverageItem title="技术面" desc="趋势、动量、支撑阻力、量价关系" />
          <CoverageItem title="基本面" desc="估值、盈利、财务健康度" />
          <CoverageItem title="情绪面" desc="市场情绪信号、资金流动" />
          <CoverageItem title="趋势展望" desc="多周期方向判断与强度" />
        </div>
      </section>

      {hasHistory && (
        <section className={styles.historySection}>
          <h3 className={styles.sectionTitle}>历史分析记录</h3>
          <div className={styles.historyList}>
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className={styles.historyRow}>
                <span className={styles.historyDate}>
                  {new Date(item.created_at).toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className={styles.historySummary}>{item.summary}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CoverageItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className={styles.coverageItem}>
      <span className={styles.coverageTitle}>{title}</span>
      <span className={styles.coverageDesc}>{desc}</span>
    </div>
  );
}
