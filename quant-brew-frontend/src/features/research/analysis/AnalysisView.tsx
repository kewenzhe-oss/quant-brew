import { useAnalysis } from '@/shared/hooks/useAnalysis';
import { AISynthesis } from './AISynthesis';
import { PreAnalysisContent } from '../PreAnalysisContent';
import styles from './AnalysisView.module.css';

interface AnalysisViewProps {
  market: string;
  symbol: string;
}

export function AnalysisView({ market, symbol }: AnalysisViewProps) {
  const { data, isLoading, isError, error, runAnalysis } = useAnalysis(market, symbol);

  if (isLoading) {
    return <AnalysisLoading />;
  }

  if (isError && !data) {
    return <AnalysisError message={error?.message} onRetry={runAnalysis} />;
  }

  if (!data) {
    return <PreAnalysisContent market={market} symbol={symbol} onGenerate={runAnalysis} />;
  }

  return <AISynthesis data={data} onReanalyze={runAnalysis} />;
}

function AnalysisLoading() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingDot} />
      <h2 className={styles.loadingTitle}>正在分析中…</h2>
      <p className={styles.loadingBody}>
        AI 正在收集市场数据、计算技术指标、分析基本面和情绪信号。
        <br />
        这通常需要 15-30 秒。
      </p>
      <div className={styles.loadingSteps}>
        <Step label="收集行情数据" />
        <Step label="计算技术指标" />
        <Step label="分析基本面" />
        <Step label="综合情绪评估" />
        <Step label="生成研究报告" />
      </div>
    </div>
  );
}

function Step({ label }: { label: string }) {
  return (
    <div className={styles.step}>
      <span className={styles.stepDot} />
      <span className={styles.stepLabel}>{label}</span>
    </div>
  );
}

function AnalysisError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className={styles.error}>
      <h2 className={styles.errorTitle}>分析失败</h2>
      <p className={styles.errorBody}>
        {message ?? '无法完成分析，请稍后重试。'}
      </p>
      <button className={styles.runButton} onClick={onRetry}>
        重试
      </button>
    </div>
  );
}
