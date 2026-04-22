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
    case 'cpi_yoy':
    case 'pce_core_yoy':
      return <InflationYoYBar metric={metric} />;
    case 'unemployment_rate':
      return <UnemploymentBar metric={metric} />;
    case 'initial_jobless_claims':
      return <InitialClaimsBar metric={metric} />;
    case 'nonfarm_payrolls':
      return <NonFarmPayrollsBar metric={metric} />;
    case 'ism_manufacturing':
    case 'ism_services':
      return <ISMBar metric={metric} />;
    case 'retail_sales_mom':
      return <RetailSalesBar metric={metric} />;
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

// ── Inflation YoY bar (CPI / PCE): 0–6% range, target at 2% ──────────────────
function InflationYoYBar({ metric }: Props) {
  const v = metric.value;
  // Range 0→6%; split: <2% green, 2-3% amber, >3% red
  const pct = Math.min(Math.max((v / 6) * 100, 0), 100);
  const color = v > 3 ? '#ef4444' : v > 2.5 ? '#f59e0b' : '#10b981';
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value} style={{ color }}>{v.toFixed(1)}<span className={styles.unit}>%</span></span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%`, backgroundColor: color }} />
        {/* 2% target marker */}
        <div className={styles.marker} style={{ left: '33.3%' }} title="2% target" />
        {/* 3% warning marker */}
        <div className={styles.marker} style={{ left: '50%' }} title="3%" />
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}

// ── Unemployment Rate bar: 3–7% range ────────────────────────────────────────
function UnemploymentBar({ metric }: Props) {
  const v = metric.value;
  // Range 3→7%; healthy <4%, warning >4.5%
  const pct = Math.min(Math.max(((v - 3) / 4) * 100, 0), 100);
  const color = v > 5 ? '#ef4444' : v > 4.5 ? '#f59e0b' : '#10b981';
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value} style={{ color }}>{v.toFixed(1)}<span className={styles.unit}>%</span></span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%`, backgroundColor: color }} />
        {/* 4% marker */}
        <div className={styles.marker} style={{ left: '25%' }} title="4%" />
        {/* 4.5% marker */}
        <div className={styles.marker} style={{ left: '37.5%' }} title="4.5%" />
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}

// ── Initial Jobless Claims bar: 150K–400K range ───────────────────────────────
function InitialClaimsBar({ metric }: Props) {
  const v = metric.value;
  // Range 150→400K; alert >280K, warning >250K
  const pct = Math.min(Math.max(((v - 150) / 250) * 100, 0), 100);
  const color = v > 300 ? '#ef4444' : v > 250 ? '#f59e0b' : '#10b981';
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value} style={{ color }}>{v.toFixed(0)}<span className={styles.unit}>K</span></span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%`, backgroundColor: color }} />
        {/* 250K: watch marker */}
        <div className={styles.marker} style={{ left: '40%' }} title="250K" />
        {/* 300K: alert marker */}
        <div className={styles.marker} style={{ left: '60%' }} title="300K" />
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}

// ── Nonfarm Payrolls MoM signed bar: -200K → +400K ───────────────────────────
function NonFarmPayrollsBar({ metric }: Props) {
  const v = metric.value;
  const color = v > 0 ? '#10b981' : '#ef4444';
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value} style={{ color }}>
          {v > 0 ? '+' : ''}{v.toFixed(0)}<span className={styles.unit}>K</span>
        </span>
      </div>
      <div className={styles.zeroTrack}>
        <div className={styles.zeroCenter} />
        {v < 0 ? (
          <div className={styles.zeroFillLeft}
               style={{ width: `${Math.min((Math.abs(v) / 300) * 50, 50)}%`, backgroundColor: '#ef4444' }} />
        ) : (
          <div className={styles.zeroFillRight}
               style={{ width: `${Math.min((v / 400) * 50, 50)}%`, backgroundColor: '#10b981' }} />
        )}
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}

// ── ISM PMI bar: 40–65 range, pivot at 50 ────────────────────────────────────
function ISMBar({ metric }: Props) {
  const v = metric.value;
  // Range 40→65; pivot at 50 (expansion line = 40% of bar)
  const pct = Math.min(Math.max(((v - 40) / 25) * 100, 0), 100);
  const color = v > 55 ? '#059669' : v > 50 ? '#10b981' : v > 48 ? '#f59e0b' : '#ef4444';
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value} style={{ color }}>{v.toFixed(1)}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%`, backgroundColor: color }} />
        {/* 50 expansion line (40% of 40→65 range) */}
        <div className={styles.marker} style={{ left: '40%' }} title="50 expansion line" />
        {/* 55 strong expansion */}
        <div className={styles.marker} style={{ left: '60%' }} title="55" />
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}

// ── Retail Sales MoM signed bar: -2% → +2% ───────────────────────────────────
function RetailSalesBar({ metric }: Props) {
  const v = metric.value;
  const color = v >= 0 ? '#10b981' : '#ef4444';
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{metric.label}</span>
        <span className={styles.value} style={{ color }}>
          {v > 0 ? '+' : ''}{v.toFixed(2)}<span className={styles.unit}>%</span>
        </span>
      </div>
      <div className={styles.zeroTrack}>
        <div className={styles.zeroCenter} />
        {v < 0 ? (
          <div className={styles.zeroFillLeft}
               style={{ width: `${Math.min(Math.abs(v) * 25, 50)}%`, backgroundColor: '#ef4444' }} />
        ) : (
          <div className={styles.zeroFillRight}
               style={{ width: `${Math.min(v * 25, 50)}%`, backgroundColor: '#10b981' }} />
        )}
      </div>
      <div className={styles.context}>{metric.context}</div>
    </div>
  );
}
