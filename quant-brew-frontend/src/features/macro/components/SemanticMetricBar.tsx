import type { DimensionMetric } from '@/shared/market-intelligence/types';
import styles from './SemanticMetricBar.module.css';

interface Props {
  metric: DimensionMetric;
}

export function SemanticMetricBar({ metric }: Props) {
  switch (metric.key) {
    case 'fear_greed':
      return <FearGreedBar metric={metric} />;
    case 'vix':
      return <VixBar metric={metric} />;
    case 'us10y':
      return <US10YBar metric={metric} />;
    case 'yield_spread_2s10s':
      return <YieldSpreadBar metric={metric} />;
    default:
      return <DefaultBar metric={metric} />;
  }
}

function FearGreedBar({ metric }: Props) {
  const v = metric.value;
  // 0 - 100 range
  let color = '#ef4444'; // red
  if (v > 25) color = '#f59e0b'; // orange
  if (v > 45) color = '#737373'; // gray
  if (v > 55) color = '#10b981'; // green
  if (v > 75) color = '#059669'; // dark green

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value}>{v} <span className={styles.unit}>{metric.unit}</span></span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${Math.min(Math.max(v, 0), 100)}%`, backgroundColor: color }} />
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}

function VixBar({ metric }: Props) {
  const v = metric.value;
  // Normalize 10 to 45 as 0 to 100%
  let pct = ((v - 10) / 35) * 100;
  pct = Math.min(Math.max(pct, 0), 100);

  let color = '#10b981'; // healthy
  if (v > 18) color = '#f59e0b'; // warning
  if (v > 28) color = '#ef4444'; // danger

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value}>{v} <span className={styles.unit}>{metric.unit}</span></span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%`, backgroundColor: color }} />
        {/* Fixed reference markers for VIX */}
        <div className={styles.marker} style={{ left: '0%' }} title="10" />
        <div className={styles.marker} style={{ left: '25%' }} title="18" />
        <div className={styles.marker} style={{ left: '50%' }} title="28" />
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}

function US10YBar({ metric }: Props) {
  const v = metric.value;
  // 3.0% to 5.5% range
  let pct = ((v - 3.0) / 2.5) * 100;
  pct = Math.min(Math.max(pct, 0), 100);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value}>{v}{metric.unit}</span>
      </div>
      <div className={styles.track}>
        {/* Just a dot on a number line instead of a fill bar */}
        <div className={styles.line} />
        <div className={styles.dot} style={{ left: `${pct}%` }} />
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}

function YieldSpreadBar({ metric }: Props) {
  const v = metric.value;
  // Center is 0, range typically -100 to +100
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value} style={{ color: v < 0 ? '#ef4444' : '#10b981' }}>{v} <span className={styles.unit}>{metric.unit}</span></span>
      </div>
      <div className={styles.zeroTrack}>
        <div className={styles.zeroCenter} />
        {v < 0 ? (
           // Negative, grows left from center
           <div className={styles.zeroFillLeft} style={{ width: `${Math.min(Math.abs(v), 100)}%`, backgroundColor: '#ef4444' }} />
        ) : (
           // Positive, grows right from center
           <div className={styles.zeroFillRight} style={{ width: `${Math.min(v, 100)}%`, backgroundColor: '#10b981' }} />
        )}
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}

function DefaultBar({ metric }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value}>
          {metric.value} <span className={styles.unit}>{metric.unit}</span>
          {metric.change !== null && (
            <span className={styles.change} style={{ color: metric.change >= 0 ? '#10b981' : '#ef4444' }}>
              {metric.change > 0 ? '+' : ''}{metric.change}{metric.change_unit}
            </span>
          )}
        </span>
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}
