/**
 * DimensionChart — lightweight-charts time-series viewer.
 *
 * Contract:
 * - series === null | length === 0 → "历史走势数据待接入" placeholder (no canvas)
 * - series has data → renders AreaSeries with timeframe slicing
 * - No synthetic data is ever passed from page components
 */

import { useRef, useEffect, useState } from 'react';
import { createChart, ColorType, LineStyle, AreaSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { ChartDataPoint, HistoryTimeframe } from '@/shared/market-intelligence/chartSeries';
import styles from './DimensionChart.module.css';

const TIMEFRAMES: HistoryTimeframe[] = ['1M', '3M', '6M', '1Y', 'ALL'];

const DAYS_FOR_TIMEFRAME: Record<HistoryTimeframe, number | null> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  'ALL': null,
};

interface DimensionChartProps {
  label: string;
  series: ChartDataPoint[] | null;
}

export function DimensionChart({ label, series }: DimensionChartProps) {
  const hasData = series !== null && series.length > 0;

  if (!hasData) {
    return (
      <div className={styles.pendingContainer}>
        <div className={styles.pendingIcon}>⌛</div>
        <div className={styles.pendingTitle}>{label}</div>
        <div className={styles.pendingNotice}>历史走势数据待接入</div>
        <div className={styles.pendingTimeframes}>
          {TIMEFRAMES.map((tf) => (
            <span key={tf} className={styles.timeframeDisabled}>{tf}</span>
          ))}
        </div>
      </div>
    );
  }

  return <LiveChart label={label} series={series} />;
}

/* ── Live chart (only rendered when data is present) ── */

function LiveChart({ label, series }: { label: string; series: ChartDataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<HistoryTimeframe>('3M');

  // Create and destroy chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(148, 163, 184, 0.8)',
        fontFamily: '"Inter", "Outfit", system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.06)', style: LineStyle.Solid },
        horzLines: { color: 'rgba(148, 163, 184, 0.06)', style: LineStyle.Solid },
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.1)',
        scaleMargins: { top: 0.15, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: 'rgba(212, 175, 55, 0.4)', width: 1, style: LineStyle.Dashed },
        horzLine: { color: 'rgba(212, 175, 55, 0.4)', width: 1, style: LineStyle.Dashed },
      },
      width: containerRef.current.clientWidth,
      height: 200,
      handleScroll: false,
      handleScale: false,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: 'rgba(212, 175, 55, 0.9)',
      topColor: 'rgba(212, 175, 55, 0.15)',
      bottomColor: 'rgba(212, 175, 55, 0.01)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: 'rgba(212, 175, 55, 1)',
      crosshairMarkerBackgroundColor: 'rgba(20, 20, 30, 1)',
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update data when timeframe or series changes
  useEffect(() => {
    if (!seriesRef.current) return;
    const sliced = sliceByTimeframe(series, activeTimeframe);
    // lightweight-charts expects ascending time order
    const sorted = [...sliced].sort((a, b) => a.time.localeCompare(b.time));
    seriesRef.current.setData(sorted);
    chartRef.current?.timeScale().fitContent();
  }, [series, activeTimeframe]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.chartLabel}>{label}</span>
        <div className={styles.timeframes}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={`${styles.timeframeBtn} ${activeTimeframe === tf ? styles.active : ''}`}
              onClick={() => setActiveTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className={styles.chartCanvas} />
    </div>
  );
}

/* ── Helpers ── */

function sliceByTimeframe(
  series: ChartDataPoint[],
  timeframe: HistoryTimeframe,
): ChartDataPoint[] {
  const days = DAYS_FOR_TIMEFRAME[timeframe];
  if (days === null) return series;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return series.filter((p) => p.time >= cutoffStr);
}
