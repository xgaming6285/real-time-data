"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  CandlestickData,
  Time,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import { CandleData, Timeframe } from "@/lib/types";

interface CandlestickChartProps {
  data: CandleData[];
  symbol: string;
  timeframe: Timeframe;
  loading?: boolean;
}

export function CandlestickChart({
  data,
  symbol,
  timeframe,
  loading,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastFittedRef = useRef<string | null>(null);

  // Transform data to lightweight-charts format
  const transformData = useCallback(
    (candles: CandleData[]): CandlestickData<Time>[] => {
      return candles.map((candle) => ({
        time: candle.time as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));
    },
    []
  );

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Create chart with optimized settings for smooth performance
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9090a0",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(42, 42, 54, 0.5)" },
        horzLines: { color: "rgba(42, 42, 54, 0.5)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(0, 212, 255, 0.4)",
          width: 1,
          style: 2, // Dashed
          labelBackgroundColor: "#00d4ff",
        },
        horzLine: {
          color: "rgba(0, 212, 255, 0.4)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#00d4ff",
        },
      },
      rightPriceScale: {
        borderColor: "#2a2a36",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#2a2a36",
        timeVisible: true,
        secondsVisible: true,
        barSpacing: 8,
        minBarSpacing: 2,
        rightOffset: 5,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Create candlestick series with beautiful colors (v5 API)
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00e676",
      downColor: "#ff4976",
      borderUpColor: "#00e676",
      borderDownColor: "#ff4976",
      wickUpColor: "#00e676",
      wickDownColor: "#ff4976",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Handle resize with debouncing for smooth performance
    let resizeTimeout: NodeJS.Timeout;
    resizeObserverRef.current = new ResizeObserver((entries) => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          chart.resize(width, height);
        }
      }, 16); // ~60fps
    });

    resizeObserverRef.current.observe(container);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserverRef.current?.disconnect();
      chart.remove();
    };
  }, []);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const chartData = transformData(data);
    seriesRef.current.setData(chartData);

    // Fit content only if symbol or timeframe has changed
    const currentKey = `${symbol}-${timeframe}`;
    if (chartRef.current && lastFittedRef.current !== currentKey) {
      chartRef.current.timeScale().fitContent();
      lastFittedRef.current = currentKey;
    }
  }, [data, transformData, symbol, timeframe]);

  return (
    <div className="relative w-full h-full">
      {/* Chart container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner" />
            <span className="text-sm text-(--text-secondary)">
              Loading {symbol}...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
