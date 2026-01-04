"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickSeries,
  BarSeries,
  AreaSeries,
  LineSeries,
  HistogramSeries,
  CandlestickData,
  BarData,
  LineData,
  Time,
  ColorType,
  CrosshairMode,
  Coordinate,
  LineStyle,
  LineWidth,
} from "lightweight-charts";
import {
  CandleData,
  Timeframe,
  ChartType,
  ActiveIndicator,
  PANE_INDICATORS,
  Drawing, // Imported from types
  Point, // Imported from types
} from "@/lib/types";
import {
  calculateZigZag,
  calculateSMA,
  calculateEMA,
  calculateWMA,
  calculateRSI,
  calculateMACD,
  calculateCCI,
  calculateStochastic,
} from "@/lib/indicators";

// Removed local Point and Drawing interfaces as they are now in @/lib/types

interface CandlestickChartProps {
  data: CandleData[];
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  loading?: boolean;
  selectedTool?: string | null;
  activeIndicators?: ActiveIndicator[];
  drawings?: Drawing[];
  onDrawingsChange?: (drawings: Drawing[]) => void;
  onToolComplete?: () => void;
}

// Helper to find closest time in data
const getClosestTime = (targetTime: number, data: CandleData[]) => {
  if (!data || data.length === 0) return null;

  // Binary search
  let left = 0;
  let right = data.length - 1;

  // If target is outside range, return closest boundary
  if (targetTime <= data[0].time) return data[0].time;
  if (targetTime >= data[data.length - 1].time)
    return data[data.length - 1].time;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midTime = data[mid].time;

    if (midTime === targetTime) return midTime;

    if (midTime < targetTime) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // Check neighbors
  const p1 = data[right]?.time;
  const p2 = data[left]?.time;

  if (p1 !== undefined && p2 !== undefined) {
    return Math.abs(targetTime - p1) < Math.abs(targetTime - p2) ? p1 : p2;
  }
  return p1 ?? p2 ?? null;
};

export function CandlestickChart({
  data,
  symbol,
  timeframe,
  chartType,
  loading,
  selectedTool,
  activeIndicators = [],
  drawings: externalDrawings,
  onDrawingsChange,
  onToolComplete,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<
    "Candlestick" | "Bar" | "Line" | "Area"
  > | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastFittedRef = useRef<string | null>(null);

  // RSI Pane refs
  const rsiContainerRef = useRef<HTMLDivElement | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiOverboughtLineRef = useRef<IPriceLine | null>(null);
  const rsiOversoldLineRef = useRef<IPriceLine | null>(null);
  const rsiMiddleLineRef = useRef<IPriceLine | null>(null);
  const [rsiContainerMounted, setRsiContainerMounted] = useState(false);
  const rsiChartTypeRef = useRef<ChartType | null>(null);

  // MACD Pane refs
  const macdContainerRef = useRef<HTMLDivElement | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSignalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistogramSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [macdContainerMounted, setMacdContainerMounted] = useState(false);
  const macdChartTypeRef = useRef<ChartType | null>(null);

  // CCI Pane refs
  const cciContainerRef = useRef<HTMLDivElement | null>(null);
  const cciChartRef = useRef<IChartApi | null>(null);
  const cciSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const cciOverboughtLineRef = useRef<IPriceLine | null>(null);
  const cciOversoldLineRef = useRef<IPriceLine | null>(null);
  const [cciContainerMounted, setCciContainerMounted] = useState(false);
  const cciChartTypeRef = useRef<ChartType | null>(null);

  // Stochastic Oscillator Pane refs
  const stochContainerRef = useRef<HTMLDivElement | null>(null);
  const stochChartRef = useRef<IChartApi | null>(null);
  const stochKSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochDSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochOverboughtLineRef = useRef<IPriceLine | null>(null);
  const stochOversoldLineRef = useRef<IPriceLine | null>(null);
  const [stochContainerMounted, setStochContainerMounted] = useState(false);
  const stochChartTypeRef = useRef<ChartType | null>(null);

  // Check if RSI indicator is active
  const rsiIndicator = activeIndicators.find((i) => i.name === "RSI");
  const hasRSI = !!rsiIndicator;

  // Check if MACD indicator is active
  const macdIndicator = activeIndicators.find((i) => i.name === "MACD");
  const hasMACD = !!macdIndicator;

  // Check if CCI indicator is active
  const cciIndicator = activeIndicators.find((i) => i.name === "CCI");
  const hasCCI = !!cciIndicator;

  // Check if Stochastic Oscillator indicator is active
  const stochIndicator = activeIndicators.find(
    (i) => i.name === "Stochastic Oscillator"
  );
  const hasStochastic = !!stochIndicator;

  // Callback ref for RSI container - ensures we know when it's mounted
  const rsiContainerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    rsiContainerRef.current = node;
    setRsiContainerMounted(!!node);
  }, []);

  // Callback ref for MACD container
  const macdContainerCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      macdContainerRef.current = node;
      setMacdContainerMounted(!!node);
    },
    []
  );

  // Callback ref for CCI container
  const cciContainerCallbackRef = useCallback((node: HTMLDivElement | null) => {
    cciContainerRef.current = node;
    setCciContainerMounted(!!node);
  }, []);

  // Callback ref for Stochastic container
  const stochContainerCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      stochContainerRef.current = node;
      setStochContainerMounted(!!node);
    },
    []
  );

  // Data ref to access current data inside event listeners
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const scrollRef = useRef({
    isDragging: false,
    lastX: 0,
    lastTimestamp: 0,
    velocity: 0,
    rafId: 0,
  });
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Drawing state - use external props if provided, otherwise local state
  const [localDrawings, setLocalDrawings] = useState<Drawing[]>([]);

  const drawings =
    externalDrawings !== undefined ? externalDrawings : localDrawings;

  const setDrawings = useCallback(
    (action: React.SetStateAction<Drawing[]>) => {
      if (onDrawingsChange) {
        // If controlled, calculate new value and call handler
        const currentDrawings = externalDrawings || [];
        const newDrawings =
          typeof action === "function" ? action(currentDrawings) : action;
        onDrawingsChange(newDrawings);
      } else {
        // If uncontrolled, update local state
        setLocalDrawings(action);
      }
    },
    [onDrawingsChange, externalDrawings]
  );

  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(
    null
  );
  // Use a ref-based update mechanism instead of state to avoid re-renders during scroll
  const svgOverlayRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<{
    type: "point" | "whole";
    drawingId: string;
    pointIndex?: number;
    startMouse?: { x: number; y: number };
    originalPoints?: Point[];
  } | null>(null);

  // Transform data to lightweight-charts format
  const priceAnimRef = useRef({
    rafId: 0,
    currentMin: 0,
    currentMax: 0,
    targetMin: 0,
    targetMax: 0,
  });

  const updatePriceRange = useCallback(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    const timeScale = chart.timeScale();
    const logicalRange = timeScale.getVisibleLogicalRange();
    if (!logicalRange) return;

    const bars = dataRef.current;
    if (bars.length === 0) return;

    const fromIndex = Math.max(0, Math.ceil(logicalRange.from));
    const toIndex = Math.min(bars.length - 1, Math.floor(logicalRange.to));

    if (fromIndex > toIndex) return;

    let min = Infinity;
    let max = -Infinity;

    for (let i = fromIndex; i <= toIndex; i++) {
      const candle = bars[i];
      if (candle.low < min) min = candle.low;
      if (candle.high > max) max = candle.high;
    }

    if (min === Infinity || max === -Infinity) return;

    const range = max - min;
    const padding = (range * 0.1) / 0.8;

    const targetMin = min - padding;
    const targetMax = max + padding;

    // Initialize if first run
    if (
      priceAnimRef.current.currentMin === 0 &&
      priceAnimRef.current.currentMax === 0
    ) {
      priceAnimRef.current.currentMin = targetMin;
      priceAnimRef.current.currentMax = targetMax;
      chart.priceScale("right").applyOptions({ autoScale: true });
    }

    priceAnimRef.current.targetMin = targetMin;
    priceAnimRef.current.targetMax = targetMax;

    const animatePrice = () => {
      const { currentMin, currentMax, targetMin, targetMax } =
        priceAnimRef.current;

      const factor = 0.15; // Tuned for smoothness
      const nextMin = currentMin + (targetMin - currentMin) * factor;
      const nextMax = currentMax + (targetMax - currentMax) * factor;

      priceAnimRef.current.currentMin = nextMin;
      priceAnimRef.current.currentMax = nextMax;

      // We rely on autoscaleInfoProvider to update the range
      // Just trigger an update on the time scale to force a redraw/recalculation of the price scale
      if (chartRef.current) {
        // Using a subtle scroll or just setting visible range on chart won't work easily.
        // But we can update the options to force a refresh?
        // Actually, if we use autoscaleInfoProvider, we just need to trigger a redraw.
        // chart.timeScale().scrollToPosition(...) was causing issues.
        // Let's try forcing a redraw by updating a harmless option?
        // Or, let's go back to autoscaleInfoProvider but clearer.
      }

      // WAIT. The error was series.priceScale().setVisiblePriceRange is not a function.
      // And we want to avoid autoscaleInfoProvider because it made scroll instant?
      // Actually the user said "horizontal scrolling feels instant" when we used autoscaleInfoProvider.
      // This is because autoscaleInfoProvider might be resetting the scale or interfering.

      // Let's try to set the Price Scale options directly on the chart using applyOptions
      // but without setVisiblePriceRange.
      // We can use autoscaleInfoProvider on the SERIES, which is what we did before.

      // Let's retry autoscaleInfoProvider but make sure we don't trigger it excessively or reset state.
      // The "instant" feel might be because we were calling scrollToPosition in the loop.

      // So, let's restore autoscaleInfoProvider and REMOVE the manual trigger in the loop.
      // Just updating the ref and letting the chart natural refresh (on next interaction or data update)
      // might be too slow. We need a way to trigger a "frame".

      // LightWeight Charts doesn't have a "render" method exposed easily.
      // However, we can use `chart.timeScale().scrollToPosition(..., false)` with the CURRENT position.
      // That's what I did before and it caused "instant" scroll.
      // Maybe because I passed 'false' (no animation) but it still interrupts momentum?

      // If we are in a momentum fling, and we call scrollToPosition, it might cancel the fling.
      // YES. That's the issue.

      // So, we need to update the price scale WITHOUT touching the time scale.

      // Can we use `series.applyOptions`?
      if (seriesRef.current) {
        seriesRef.current.applyOptions({
          autoscaleInfoProvider: () => ({
            priceRange: {
              minValue: nextMin,
              maxValue: nextMax,
            },
          }),
        });
      }

      // Dispatch chart update event to sync drawings with price animation
      if (containerRef.current) {
        containerRef.current.dispatchEvent(new CustomEvent("chartupdate"));
      }

      if (
        Math.abs(targetMin - nextMin) < (targetMax - targetMin) * 0.001 &&
        Math.abs(targetMax - nextMax) < (targetMax - targetMin) * 0.001
      ) {
        priceAnimRef.current.rafId = 0;
        return;
      }

      priceAnimRef.current.rafId = requestAnimationFrame(animatePrice);
    };

    if (!priceAnimRef.current.rafId) {
      priceAnimRef.current.rafId = requestAnimationFrame(animatePrice);
    }
  }, []);

  const transformData = useCallback(
    (
      candles: CandleData[]
    ): (CandlestickData<Time> | BarData<Time> | LineData<Time>)[] => {
      if (chartType === "line") {
        return candles.map((candle) => ({
          time: candle.time as Time,
          value: candle.close,
        }));
      } else if (chartType === "bar") {
        return candles.map((candle) => ({
          time: candle.time as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));
      } else {
        return candles.map((candle) => ({
          time: candle.time as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }));
      }
    },
    [chartType]
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
          color: "rgba(72, 82, 101, 0.4)",
          width: 2,
          style: 2, // Dashed
          labelBackgroundColor: "#485265",
        },
        horzLine: {
          color: "rgba(72, 82, 101, 0.4)",
          width: 2,
          style: 2, // Dashed
          labelBackgroundColor: "#485265",
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
        barSpacing: 5,
        minBarSpacing: 1,
        maxBarSpacing: 200,
        rightOffset: 5,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: false },
        axisDoubleClickReset: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Create series based on chart type with beautiful colors (v5 API)
    let series: ISeriesApi<"Candlestick" | "Bar" | "Line" | "Area">;

    if (chartType === "line") {
      series = chart.addSeries(AreaSeries, {
        lineColor: "rgba(68, 106, 152, 0.85)",
        topColor: "rgba(68, 106, 152, 0.6)",
        bottomColor: "rgba(68, 106, 152, 0.0)",
        lineWidth: 2,
        priceFormat: {
          type: "price",
          precision: 5,
          minMove: 0.00001,
        },
        priceLineColor: "#446a98",
        priceLineStyle: 0,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: true,
        autoscaleInfoProvider: () => {
          const { currentMin, currentMax } = priceAnimRef.current;
          if (currentMin === 0 && currentMax === 0) return null;
          return {
            priceRange: {
              minValue: currentMin,
              maxValue: currentMax,
            },
          };
        },
      });
    } else if (chartType === "bar") {
      series = chart.addSeries(BarSeries, {
        upColor: "#45b734",
        downColor: "#ff3e1f",
        priceFormat: {
          type: "price",
          precision: 5,
          minMove: 0.00001,
        },
        priceLineColor: "#426590",
        priceLineStyle: 0,
        lastValueVisible: false,
        priceLineVisible: true,
        autoscaleInfoProvider: () => {
          const { currentMin, currentMax } = priceAnimRef.current;
          if (currentMin === 0 && currentMax === 0) return null;
          return {
            priceRange: {
              minValue: currentMin,
              maxValue: currentMax,
            },
          };
        },
      });
    } else {
      series = chart.addSeries(CandlestickSeries, {
        upColor: "#45b734",
        downColor: "#ff3e1f",
        borderUpColor: "#45b734",
        borderDownColor: "#ff3e1f",
        wickUpColor: "#45b734",
        wickDownColor: "#ff3e1f",
        priceFormat: {
          type: "price",
          precision: 5,
          minMove: 0.00001,
        },
        priceLineColor: "#426590",
        priceLineStyle: 0,
        lastValueVisible: false,
        priceLineVisible: true,
        autoscaleInfoProvider: () => {
          const { currentMin, currentMax } = priceAnimRef.current;
          if (currentMin === 0 && currentMax === 0) return null;
          return {
            priceRange: {
              minValue: currentMin,
              maxValue: currentMax,
            },
          };
        },
      });
    }

    chartRef.current = chart;
    seriesRef.current = series;

    // Detect scrolling - consolidated handler for performance
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(() => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (!logicalRange) return;

      // scrollPosition() returns the number of bars from the right edge
      // Negative values mean we've scrolled into history
      const scrollPos = timeScale.scrollPosition();
      setShowScrollButton(scrollPos < -5);

      // Dispatch chart update event synchronously - drawings need immediate update
      // to stay in sync with the chart (like Moving Averages do)
      containerRef.current?.dispatchEvent(new CustomEvent("chartupdate"));
    });

    // Handle resize with requestAnimationFrame for smooth performance
    let resizeRafId: number = 0;
    resizeObserverRef.current = new ResizeObserver((entries) => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = 0;
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          chart.resize(width, height);
          // Dispatch update event instead of state change
          containerRef.current?.dispatchEvent(new CustomEvent("chartupdate"));
        }
      });
    });

    resizeObserverRef.current.observe(container);

    // Kinetic scrolling logic
    const handleMouseDown = (e: MouseEvent) => {
      // Stop any existing momentum
      if (scrollRef.current.rafId) {
        cancelAnimationFrame(scrollRef.current.rafId);
        scrollRef.current.rafId = 0;
      }

      scrollRef.current.isDragging = true;
      scrollRef.current.lastX = e.clientX;
      scrollRef.current.lastTimestamp = performance.now();
      scrollRef.current.velocity = 0;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollRef.current.isDragging) return;

      const now = performance.now();
      const dt = now - scrollRef.current.lastTimestamp;
      const dx = e.clientX - scrollRef.current.lastX;

      if (dt > 0) {
        // Calculate velocity in pixels/ms
        const newVelocity = dx / dt;
        // Low-pass filter for smoothing
        scrollRef.current.velocity =
          newVelocity * 0.5 + scrollRef.current.velocity * 0.5;
      }

      scrollRef.current.lastX = e.clientX;
      scrollRef.current.lastTimestamp = now;
    };

    const handleMouseUp = () => {
      if (!scrollRef.current.isDragging) return;
      scrollRef.current.isDragging = false;

      // Start momentum if velocity is significant (pixels/ms)
      if (Math.abs(scrollRef.current.velocity) > 0.2) {
        startMomentum();
      }
    };

    const startMomentum = () => {
      let lastTime = performance.now();

      const animate = () => {
        const now = performance.now();
        const dt = now - lastTime;
        lastTime = now;

        // Apply friction
        const friction = 0.95;
        scrollRef.current.velocity *= friction;

        if (Math.abs(scrollRef.current.velocity) < 0.05) {
          scrollRef.current.rafId = 0;
          return;
        }

        // Convert velocity (px/ms) to scroll position delta (bars)
        const logicalRange = timeScale.getVisibleLogicalRange();
        if (logicalRange) {
          const visibleBars = logicalRange.to - logicalRange.from;
          const chartWidth = container.clientWidth;
          const barsPerPixel = visibleBars / chartWidth;

          // Drag right (+velocity) -> Scroll left (into history) -> Decrease scrollPosition
          const scrollDelta = scrollRef.current.velocity * dt * barsPerPixel;
          const currentPos = timeScale.scrollPosition();

          timeScale.scrollToPosition(currentPos - scrollDelta, false);
        }

        scrollRef.current.rafId = requestAnimationFrame(animate);
      };

      scrollRef.current.rafId = requestAnimationFrame(animate);
    };

    timeScale.subscribeVisibleLogicalRangeChange(updatePriceRange);

    // Initial calculation after short delay
    setTimeout(updatePriceRange, 50);

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Click handler for background deselect
    const handleBackgroundClick = (e: MouseEvent) => {
      // Only deselect if we clicked on the container directly (canvas area)
      // We check if the click target is the canvas element created by lightweight-charts
      if ((e.target as HTMLElement).tagName === "CANVAS") {
        setSelectedDrawingId(null);
      }
    };
    container.addEventListener("click", handleBackgroundClick);

    const indicatorSeriesMap = indicatorSeriesRef.current;

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("click", handleBackgroundClick);

      // eslint-disable-next-line react-hooks/exhaustive-deps
      const scrollVal = scrollRef.current;
      if (scrollVal.rafId) cancelAnimationFrame(scrollVal.rafId);

      // eslint-disable-next-line react-hooks/exhaustive-deps
      const priceVal = priceAnimRef.current;
      if (priceVal.rafId) cancelAnimationFrame(priceVal.rafId);

      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeObserverRef.current?.disconnect();
      indicatorSeriesMap.clear();
      chart.remove();

      // Also clean up RSI chart if it exists
      if (rsiChartRef.current) {
        (
          rsiChartRef.current as IChartApi & { _cleanup?: () => void }
        )._cleanup?.();
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
      }

      // Clean up MACD chart if it exists
      if (macdChartRef.current) {
        (
          macdChartRef.current as IChartApi & { _cleanup?: () => void }
        )._cleanup?.();
        macdChartRef.current.remove();
        macdChartRef.current = null;
      }

      // Clean up CCI chart if it exists
      if (cciChartRef.current) {
        (
          cciChartRef.current as IChartApi & { _cleanup?: () => void }
        )._cleanup?.();
        cciChartRef.current.remove();
        cciChartRef.current = null;
      }

      // Clean up Stochastic chart if it exists
      if (stochChartRef.current) {
        (
          stochChartRef.current as IChartApi & { _cleanup?: () => void }
        )._cleanup?.();
        stochChartRef.current.remove();
        stochChartRef.current = null;
      }
    };
  }, [updatePriceRange, chartType]);

  // Manage Indicators (overlay indicators like Moving Average)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || data.length === 0) return;

    const currentIndicatorIds = new Set(activeIndicators.map((i) => i.id));

    // 1. Remove series that are no longer active
    for (const [id, series] of indicatorSeriesRef.current.entries()) {
      if (!currentIndicatorIds.has(id)) {
        chart.removeSeries(series);
        indicatorSeriesRef.current.delete(id);
      }
    }

    // 2. Add or Update series (only overlay indicators, not pane indicators)
    activeIndicators.forEach((indicator) => {
      // Skip pane indicators (RSI, MACD, etc.) - they're handled separately
      if (PANE_INDICATORS.includes(indicator.name)) return;

      // Support Moving Average and ZigZag
      if (indicator.name !== "Moving Average" && indicator.name !== "ZigZag")
        return;

      let series = indicatorSeriesRef.current.get(indicator.id);

      // Calculate data based on type
      let indicatorData: LineData<Time>[] = [];

      if (indicator.name === "Moving Average") {
        const period = indicator.config.period || 14;
        const source = indicator.config.source || "close";

        switch (indicator.config.type) {
          case "EMA":
            indicatorData = calculateEMA(data, period, source);
            break;
          case "WMA":
            indicatorData = calculateWMA(data, period, source);
            break;
          case "SMA":
          default:
            indicatorData = calculateSMA(data, period, source);
            break;
        }
      } else if (indicator.name === "ZigZag") {
        indicatorData = calculateZigZag(
          data,
          indicator.config.deviation ?? 0.1,
          indicator.config.depth ?? 10
        );
      }

      if (!series) {
        // Create new series
        // Note: LineSeries is imported and valid for addSeries
        series = chart.addSeries(LineSeries, {
          color: indicator.config.color || "#2962FF",
          lineWidth: (indicator.config.lineWidth || 2) as LineWidth,
          priceLineVisible: false,
          crosshairMarkerVisible: true,
          lastValueVisible: true,
          // Add title for the legend if needed, but lightweight-charts built-in legend is basic
        });
        indicatorSeriesRef.current.set(indicator.id, series);
      } else {
        // Update options
        series.applyOptions({
          color: indicator.config.color || "#2962FF",
          lineWidth: (indicator.config.lineWidth || 2) as LineWidth,
        });
      }

      // Update data
      series.setData(indicatorData);
    });
  }, [activeIndicators, data, chartType]);

  // RSI Chart Management
  useEffect(() => {
    // If RSI is not active, clean up
    if (!hasRSI) {
      if (rsiChartRef.current) {
        (
          rsiChartRef.current as IChartApi & { _cleanup?: () => void }
        )._cleanup?.();
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
        rsiOverboughtLineRef.current = null;
        rsiOversoldLineRef.current = null;
        rsiMiddleLineRef.current = null;
      }
      return;
    }

    // Wait for container to be mounted
    if (!rsiContainerMounted || !rsiContainerRef.current) {
      return;
    }

    const container = rsiContainerRef.current;
    const period = rsiIndicator?.config.period || 14;
    const overbought = rsiIndicator?.config.overbought || 70;
    const oversold = rsiIndicator?.config.oversold || 30;
    const middle = rsiIndicator?.config.middle || 50;
    const color = rsiIndicator?.config.color || "#d4af37";
    const lineWidth = (rsiIndicator?.config.lineWidth || 2) as LineWidth;

    // Force recreation if main chart type changed (time scale sync becomes stale)
    if (rsiChartRef.current && rsiChartTypeRef.current !== chartType) {
      (
        rsiChartRef.current as IChartApi & { _cleanup?: () => void }
      )._cleanup?.();
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
      rsiOverboughtLineRef.current = null;
      rsiOversoldLineRef.current = null;
      rsiMiddleLineRef.current = null;
    }

    // Create RSI chart if it doesn't exist
    if (!rsiChartRef.current) {
      const rsiChart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9090a0",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(42, 42, 54, 0.3)" },
          horzLines: { color: "rgba(42, 42, 54, 0.3)" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: "rgba(72, 82, 101, 0.4)",
            width: 2,
            style: 2,
            labelBackgroundColor: "#485265",
          },
          horzLine: {
            color: "rgba(72, 82, 101, 0.4)",
            width: 2,
            style: 2,
            labelBackgroundColor: "#485265",
          },
        },
        rightPriceScale: {
          borderColor: "#2a2a36",
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        localization: {
          // Only show labels for RSI reference levels, hide auto-generated ones
          priceFormatter: (price: number) => {
            const rsiLevels = [oversold, middle, overbought];
            // Show label only if price is very close to one of our levels
            if (rsiLevels.some((level) => Math.abs(price - level) < 0.5)) {
              return price.toFixed(0);
            }
            return "";
          },
        },
        timeScale: {
          borderColor: "#2a2a36",
          timeVisible: true,
          secondsVisible: true,
          visible: false, // Hide time scale since main chart shows it
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: { time: true, price: false },
          axisDoubleClickReset: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      rsiChartRef.current = rsiChart;

      // Create RSI line first
      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: color,
        lineWidth: lineWidth,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
        lastValueVisible: false,
        priceFormat: {
          type: "price",
          precision: 0,
          minMove: 1,
        },
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: 0,
            maxValue: 100,
          },
        }),
      });
      rsiSeriesRef.current = rsiSeries;

      // Create price lines for reference levels (these show values on Y-axis)
      const overboughtLine = rsiSeries.createPriceLine({
        price: overbought,
        color: "rgba(0, 150, 136, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        axisLabelColor: "transparent",
        axisLabelTextColor: "#9090a0",
        title: "",
      });
      rsiOverboughtLineRef.current = overboughtLine;

      const oversoldLine = rsiSeries.createPriceLine({
        price: oversold,
        color: "rgba(0, 150, 136, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        axisLabelColor: "transparent",
        axisLabelTextColor: "#9090a0",
        title: "",
      });
      rsiOversoldLineRef.current = oversoldLine;

      const middleLine = rsiSeries.createPriceLine({
        price: middle,
        color: "rgba(128, 128, 128, 0.3)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        axisLabelColor: "transparent",
        axisLabelTextColor: "#9090a0",
        title: "",
      });
      rsiMiddleLineRef.current = middleLine;

      // Sync time scales between main chart and RSI chart
      const mainTimeScale = chartRef.current?.timeScale();
      const rsiTimeScale = rsiChart.timeScale();

      if (mainTimeScale) {
        // Initial sync - set RSI chart to match main chart's current view
        const initialRange = mainTimeScale.getVisibleLogicalRange();
        if (initialRange) {
          rsiTimeScale.setVisibleLogicalRange(initialRange);
        }

        // Keep charts in sync when scrolling/zooming
        mainTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range) {
            rsiTimeScale.setVisibleLogicalRange(range);
          }
        });

        rsiTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range && mainTimeScale) {
            const mainRange = mainTimeScale.getVisibleLogicalRange();
            if (
              mainRange &&
              (mainRange.from !== range.from || mainRange.to !== range.to)
            ) {
              mainTimeScale.setVisibleLogicalRange(range);
            }
          }
        });
      }

      // Handle resize
      const resizeHandler = () => {
        const rect = container.getBoundingClientRect();
        rsiChart.resize(rect.width, rect.height);
      };

      const rsiResizeObserver = new ResizeObserver(resizeHandler);
      rsiResizeObserver.observe(container);

      // Store cleanup function
      (rsiChartRef.current as IChartApi & { _cleanup?: () => void })._cleanup =
        () => {
          rsiResizeObserver.disconnect();
        };

      // Track which chart type this RSI chart was synced with
      rsiChartTypeRef.current = chartType;
    }

    // Update RSI data
    if (rsiSeriesRef.current && data.length > 0) {
      const rsiData = calculateRSI(data, period);
      rsiSeriesRef.current.setData(rsiData);

      // Update RSI line color
      rsiSeriesRef.current.applyOptions({
        color: color,
        lineWidth: lineWidth,
      });

      // Update reference line positions (in case config changed)
      rsiOverboughtLineRef.current?.applyOptions({ price: overbought });
      rsiOversoldLineRef.current?.applyOptions({ price: oversold });
      rsiMiddleLineRef.current?.applyOptions({ price: middle });
    }

    return () => {
      // Cleanup on unmount or when chartType changes (main chart recreated)
      // Note: The cleanup for when RSI is removed is handled at the start of the effect
    };
  }, [
    hasRSI,
    rsiIndicator?.config.period,
    rsiIndicator?.config.overbought,
    rsiIndicator?.config.oversold,
    rsiIndicator?.config.middle,
    rsiIndicator?.config.color,
    rsiIndicator?.config.lineWidth,
    data,
    rsiContainerMounted,
    chartType,
  ]);

  // MACD Chart Management
  useEffect(() => {
    // If MACD is not active, clean up
    if (!hasMACD) {
      if (macdChartRef.current) {
        (
          macdChartRef.current as IChartApi & { _cleanup?: () => void }
        )._cleanup?.();
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdSeriesRef.current = null;
        macdSignalSeriesRef.current = null;
        macdHistogramSeriesRef.current = null;
      }
      return;
    }

    // Wait for container to be mounted
    if (!macdContainerMounted || !macdContainerRef.current) {
      return;
    }

    const container = macdContainerRef.current;
    const fastPeriod = Number(macdIndicator?.config.fastPeriod) || 12;
    const slowPeriod = Number(macdIndicator?.config.slowPeriod) || 26;
    const signalPeriod = Number(macdIndicator?.config.signalPeriod) || 9;
    const color = macdIndicator?.config.color || "#2962FF";
    const lineWidth = (macdIndicator?.config.lineWidth || 2) as LineWidth;

    // Force recreation if main chart type changed
    if (macdChartRef.current && macdChartTypeRef.current !== chartType) {
      (
        macdChartRef.current as IChartApi & { _cleanup?: () => void }
      )._cleanup?.();
      macdChartRef.current.remove();
      macdChartRef.current = null;
      macdSeriesRef.current = null;
      macdSignalSeriesRef.current = null;
      macdHistogramSeriesRef.current = null;
    }

    // Create MACD chart if it doesn't exist
    if (!macdChartRef.current) {
      const macdChart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9090a0",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(42, 42, 54, 0.3)" },
          horzLines: { color: "rgba(42, 42, 54, 0.3)" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: "rgba(72, 82, 101, 0.4)",
            width: 2,
            style: 2,
            labelBackgroundColor: "#485265",
          },
          horzLine: {
            color: "rgba(72, 82, 101, 0.4)",
            width: 2,
            style: 2,
            labelBackgroundColor: "#485265",
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
          visible: false, // Hide time scale since main chart shows it
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: { time: true, price: false },
          axisDoubleClickReset: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      macdChartRef.current = macdChart;

      // Create Histogram Series (add first to be behind lines)
      const histogramSeries = macdChart.addSeries(HistogramSeries, {
        color: "#26a69a",
        priceFormat: {
          type: "volume",
        },
        priceScaleId: "right",
      });
      macdHistogramSeriesRef.current = histogramSeries;

      // Create MACD Line
      const macdSeries = macdChart.addSeries(LineSeries, {
        color: color,
        lineWidth: lineWidth,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
      });
      macdSeriesRef.current = macdSeries;

      // Create Signal Line
      const signalSeries = macdChart.addSeries(LineSeries, {
        color: "#FF6D00",
        lineWidth: 2,
        priceScaleId: "right",
        crosshairMarkerVisible: false,
      });
      macdSignalSeriesRef.current = signalSeries;

      // Sync time scales between main chart and MACD chart
      const mainTimeScale = chartRef.current?.timeScale();
      const macdTimeScale = macdChart.timeScale();

      if (mainTimeScale) {
        // Initial sync
        const initialRange = mainTimeScale.getVisibleLogicalRange();
        if (initialRange) {
          macdTimeScale.setVisibleLogicalRange(initialRange);
        }

        // Keep charts in sync
        mainTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range) {
            macdTimeScale.setVisibleLogicalRange(range);
          }
        });

        macdTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range && mainTimeScale) {
            const mainRange = mainTimeScale.getVisibleLogicalRange();
            if (
              mainRange &&
              (mainRange.from !== range.from || mainRange.to !== range.to)
            ) {
              mainTimeScale.setVisibleLogicalRange(range);
            }
          }
        });
      }

      // Handle resize
      const resizeHandler = () => {
        const rect = container.getBoundingClientRect();
        macdChart.resize(rect.width, rect.height);
      };

      const macdResizeObserver = new ResizeObserver(resizeHandler);
      macdResizeObserver.observe(container);

      // Store cleanup function
      (macdChartRef.current as IChartApi & { _cleanup?: () => void })._cleanup =
        () => {
          macdResizeObserver.disconnect();
        };

      macdChartTypeRef.current = chartType;
    }

    // Update MACD data
    if (
      macdSeriesRef.current &&
      macdSignalSeriesRef.current &&
      macdHistogramSeriesRef.current &&
      data.length > 0
    ) {
      const { macd, signal, histogram } = calculateMACD(
        data,
        fastPeriod,
        slowPeriod,
        signalPeriod
      );
      macdSeriesRef.current.setData(macd);
      macdSeriesRef.current.applyOptions({
        color: color,
        lineWidth: lineWidth,
      });
      macdSignalSeriesRef.current.setData(signal);
      macdHistogramSeriesRef.current.setData(histogram);
    }
  }, [
    hasMACD,
    macdIndicator?.config.fastPeriod,
    macdIndicator?.config.slowPeriod,
    macdIndicator?.config.signalPeriod,
    macdIndicator?.config.color,
    macdIndicator?.config.lineWidth,
    data,
    macdContainerMounted,
    chartType,
  ]);

  // CCI Chart Management
  useEffect(() => {
    // If CCI is not active, clean up
    if (!hasCCI) {
      if (cciChartRef.current) {
        (
          cciChartRef.current as IChartApi & { _cleanup?: () => void }
        )._cleanup?.();
        cciChartRef.current.remove();
        cciChartRef.current = null;
        cciSeriesRef.current = null;
        cciOverboughtLineRef.current = null;
        cciOversoldLineRef.current = null;
      }
      return;
    }

    // Wait for container to be mounted
    if (!cciContainerMounted || !cciContainerRef.current) {
      return;
    }

    const container = cciContainerRef.current;
    const period = cciIndicator?.config.period || 20;
    const overbought = cciIndicator?.config.overbought || 100;
    const oversold = cciIndicator?.config.oversold || -100;
    const color = cciIndicator?.config.color || "#FF6D00";
    const lineWidth = (cciIndicator?.config.lineWidth || 2) as LineWidth;

    // Force recreation if main chart type changed
    if (cciChartRef.current && cciChartTypeRef.current !== chartType) {
      (
        cciChartRef.current as IChartApi & { _cleanup?: () => void }
      )._cleanup?.();
      cciChartRef.current.remove();
      cciChartRef.current = null;
      cciSeriesRef.current = null;
      cciOverboughtLineRef.current = null;
      cciOversoldLineRef.current = null;
    }

    // Create CCI chart if it doesn't exist
    if (!cciChartRef.current) {
      const cciChart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9090a0",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(42, 42, 54, 0.3)" },
          horzLines: { color: "rgba(42, 42, 54, 0.3)" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: "rgba(72, 82, 101, 0.4)",
            width: 2,
            style: 2,
            labelBackgroundColor: "#485265",
          },
          horzLine: {
            color: "rgba(72, 82, 101, 0.4)",
            width: 2,
            style: 2,
            labelBackgroundColor: "#485265",
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
          visible: false, // Hide time scale since main chart shows it
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: { time: true, price: false },
          axisDoubleClickReset: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      cciChartRef.current = cciChart;

      // Create CCI Line
      const cciSeries = cciChart.addSeries(LineSeries, {
        color: color,
        lineWidth: lineWidth,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
        lastValueVisible: false,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });
      cciSeriesRef.current = cciSeries;

      // Create price lines for reference levels
      const overboughtLine = cciSeries.createPriceLine({
        price: overbought,
        color: "rgba(150, 150, 150, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        axisLabelColor: "transparent",
        axisLabelTextColor: "#9090a0",
        title: "",
      });
      cciOverboughtLineRef.current = overboughtLine;

      const oversoldLine = cciSeries.createPriceLine({
        price: oversold,
        color: "rgba(150, 150, 150, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        axisLabelColor: "transparent",
        axisLabelTextColor: "#9090a0",
        title: "",
      });
      cciOversoldLineRef.current = oversoldLine;

      // Sync time scales between main chart and CCI chart
      const mainTimeScale = chartRef.current?.timeScale();
      const cciTimeScale = cciChart.timeScale();

      if (mainTimeScale) {
        // Initial sync
        const initialRange = mainTimeScale.getVisibleLogicalRange();
        if (initialRange) {
          cciTimeScale.setVisibleLogicalRange(initialRange);
        }

        // Keep charts in sync
        mainTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range) {
            cciTimeScale.setVisibleLogicalRange(range);
          }
        });

        cciTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range && mainTimeScale) {
            const mainRange = mainTimeScale.getVisibleLogicalRange();
            if (
              mainRange &&
              (mainRange.from !== range.from || mainRange.to !== range.to)
            ) {
              mainTimeScale.setVisibleLogicalRange(range);
            }
          }
        });
      }

      // Handle resize
      const resizeHandler = () => {
        const rect = container.getBoundingClientRect();
        cciChart.resize(rect.width, rect.height);
      };

      const cciResizeObserver = new ResizeObserver(resizeHandler);
      cciResizeObserver.observe(container);

      // Store cleanup function
      (cciChartRef.current as IChartApi & { _cleanup?: () => void })._cleanup =
        () => {
          cciResizeObserver.disconnect();
        };

      cciChartTypeRef.current = chartType;
    }

    // Update CCI data
    if (cciSeriesRef.current && data.length > 0) {
      const cciData = calculateCCI(data, period);
      cciSeriesRef.current.setData(cciData);

      // Update CCI line color
      cciSeriesRef.current.applyOptions({
        color: color,
        lineWidth: lineWidth,
      });

      // Update reference line positions
      cciOverboughtLineRef.current?.applyOptions({ price: overbought });
      cciOversoldLineRef.current?.applyOptions({ price: oversold });
    }
  }, [
    hasCCI,
    cciIndicator?.config.period,
    cciIndicator?.config.overbought,
    cciIndicator?.config.oversold,
    cciIndicator?.config.color,
    cciIndicator?.config.lineWidth,
    data,
    cciContainerMounted,
    chartType,
  ]);

  // Stochastic Oscillator Chart Management
  useEffect(() => {
    // If Stochastic is not active, clean up
    if (!hasStochastic) {
      if (stochChartRef.current) {
        (
          stochChartRef.current as IChartApi & { _cleanup?: () => void }
        )._cleanup?.();
        stochChartRef.current.remove();
        stochChartRef.current = null;
        stochKSeriesRef.current = null;
        stochDSeriesRef.current = null;
        stochOverboughtLineRef.current = null;
        stochOversoldLineRef.current = null;
      }
      return;
    }

    // Wait for container to be mounted
    if (!stochContainerMounted || !stochContainerRef.current) {
      return;
    }

    const container = stochContainerRef.current;
    const kPeriod = Number(stochIndicator?.config.kPeriod) || 14;
    const dPeriod = Number(stochIndicator?.config.dPeriod) || 3;
    const slowing = Number(stochIndicator?.config.slowing) || 3;
    const overbought = stochIndicator?.config.overbought || 80;
    const oversold = stochIndicator?.config.oversold || 20;
    const color = stochIndicator?.config.color || "#00E676";
    const lineWidth = (stochIndicator?.config.lineWidth || 2) as LineWidth;

    // Force recreation if main chart type changed
    if (stochChartRef.current && stochChartTypeRef.current !== chartType) {
      (
        stochChartRef.current as IChartApi & { _cleanup?: () => void }
      )._cleanup?.();
      stochChartRef.current.remove();
      stochChartRef.current = null;
      stochKSeriesRef.current = null;
      stochDSeriesRef.current = null;
      stochOverboughtLineRef.current = null;
      stochOversoldLineRef.current = null;
    }

    // Create Stochastic chart if it doesn't exist
    if (!stochChartRef.current) {
      const stochChart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#9090a0",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: "rgba(42, 42, 54, 0.3)" },
          horzLines: { color: "rgba(42, 42, 54, 0.3)" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: "rgba(72, 82, 101, 0.4)",
            width: 2,
            style: 2,
            labelBackgroundColor: "#485265",
          },
          horzLine: {
            color: "rgba(72, 82, 101, 0.4)",
            width: 2,
            style: 2,
            labelBackgroundColor: "#485265",
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
          visible: false, // Hide time scale since main chart shows it
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: { time: true, price: false },
          axisDoubleClickReset: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      stochChartRef.current = stochChart;

      // Create %K Line (main line)
      const kSeries = stochChart.addSeries(LineSeries, {
        color: color,
        lineWidth: lineWidth,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
        lastValueVisible: false,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });
      stochKSeriesRef.current = kSeries;

      // Create %D Line (signal line - slightly different color)
      const dSeries = stochChart.addSeries(LineSeries, {
        color: "#FF5252", // Red for %D signal line
        lineWidth: lineWidth,
        priceLineVisible: false,
        crosshairMarkerVisible: true,
        lastValueVisible: false,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });
      stochDSeriesRef.current = dSeries;

      // Create price lines for reference levels
      const overboughtLine = kSeries.createPriceLine({
        price: overbought,
        color: "rgba(150, 150, 150, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        axisLabelColor: "transparent",
        axisLabelTextColor: "#9090a0",
        title: "",
      });
      stochOverboughtLineRef.current = overboughtLine;

      const oversoldLine = kSeries.createPriceLine({
        price: oversold,
        color: "rgba(150, 150, 150, 0.5)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        axisLabelColor: "transparent",
        axisLabelTextColor: "#9090a0",
        title: "",
      });
      stochOversoldLineRef.current = oversoldLine;

      // Sync time scales between main chart and Stochastic chart
      const mainTimeScale = chartRef.current?.timeScale();
      const stochTimeScale = stochChart.timeScale();

      if (mainTimeScale) {
        // Initial sync
        const initialRange = mainTimeScale.getVisibleLogicalRange();
        if (initialRange) {
          stochTimeScale.setVisibleLogicalRange(initialRange);
        }

        // Keep charts in sync
        mainTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range) {
            stochTimeScale.setVisibleLogicalRange(range);
          }
        });

        stochTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range && mainTimeScale) {
            const mainRange = mainTimeScale.getVisibleLogicalRange();
            if (
              mainRange &&
              (mainRange.from !== range.from || mainRange.to !== range.to)
            ) {
              mainTimeScale.setVisibleLogicalRange(range);
            }
          }
        });
      }

      // Handle resize
      const resizeHandler = () => {
        const rect = container.getBoundingClientRect();
        stochChart.resize(rect.width, rect.height);
      };

      const stochResizeObserver = new ResizeObserver(resizeHandler);
      stochResizeObserver.observe(container);

      // Store cleanup function
      (
        stochChartRef.current as IChartApi & { _cleanup?: () => void }
      )._cleanup = () => {
        stochResizeObserver.disconnect();
      };

      stochChartTypeRef.current = chartType;
    }

    // Update Stochastic data
    if (stochKSeriesRef.current && stochDSeriesRef.current && data.length > 0) {
      const stochData = calculateStochastic(data, kPeriod, dPeriod, slowing);
      stochKSeriesRef.current.setData(stochData.k);
      stochDSeriesRef.current.setData(stochData.d);

      // Update line colors
      stochKSeriesRef.current.applyOptions({
        color: color,
        lineWidth: lineWidth,
      });

      // Update reference line positions
      stochOverboughtLineRef.current?.applyOptions({ price: overbought });
      stochOversoldLineRef.current?.applyOptions({ price: oversold });
    }
  }, [
    hasStochastic,
    stochIndicator?.config.kPeriod,
    stochIndicator?.config.dPeriod,
    stochIndicator?.config.slowing,
    stochIndicator?.config.overbought,
    stochIndicator?.config.oversold,
    stochIndicator?.config.color,
    stochIndicator?.config.lineWidth,
    data,
    stochContainerMounted,
    chartType,
  ]);

  // Scroll to newest data logic
  const scrollToNewest = useCallback((animated: boolean = true) => {
    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const logicalRange = timeScale.getVisibleLogicalRange();

      if (logicalRange) {
        const visibleBars = logicalRange.to - logicalRange.from;
        // Position newest candle at ~70% of screen width (30% empty space on right)
        const offset = visibleBars * 0.3;
        timeScale.scrollToPosition(offset, animated);
      } else {
        timeScale.scrollToPosition(0, animated);
      }
    }
  }, []);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const chartData = transformData(data);
    seriesRef.current.setData(chartData);

    // Trigger price scale update when data changes
    updatePriceRange();

    // Fit content only if symbol or timeframe has changed
    const currentKey = `${symbol}-${timeframe}-${chartType}`;
    if (chartRef.current && lastFittedRef.current !== currentKey) {
      // Instead of fitContent, we position the newest candle with the same 70% offset logic
      // We use a small timeout to ensure the chart has properly calculated its dimensions
      setTimeout(() => {
        scrollToNewest(false);
      }, 0);
      lastFittedRef.current = currentKey;
    }
  }, [
    data,
    transformData,
    symbol,
    timeframe,
    chartType,
    scrollToNewest,
    updatePriceRange,
  ]);

  // Click handler wrapper
  const handleScrollToNewest = useCallback(() => {
    scrollToNewest(true);
  }, [scrollToNewest]);

  // Handle aggressive zooming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.isTrusted) return;

      e.preventDefault();
      e.stopPropagation();

      const newEvent = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        view: window,
        detail: e.detail,
        screenX: e.screenX,
        screenY: e.screenY,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        button: e.button,
        buttons: e.buttons,
        relatedTarget: e.relatedTarget,
        deltaX: e.deltaX,
        deltaY: e.deltaY * 4, // 4x faster zooming
        deltaZ: e.deltaZ,
        deltaMode: e.deltaMode,
      });

      e.target?.dispatchEvent(newEvent);
    };

    container.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      container.removeEventListener("wheel", handleWheel, {
        capture: true,
      });
    };
  }, []);

  // Drawing helpers
  const getChartCoordinates = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (!chart || !series || !containerRef.current) return null;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const timeScale = chart.timeScale();
      let time = timeScale.coordinateToTime(x as Coordinate);
      const price = series.coordinateToPrice(y as Coordinate);

      // If time is null (beyond data range), extrapolate based on visible logical range
      if (time === null && dataRef.current.length > 0) {
        const logicalRange = timeScale.getVisibleLogicalRange();
        if (logicalRange) {
          const chartWidth = rect.width;
          const logicalWidth = logicalRange.to - logicalRange.from;
          const logicalPerPixel = logicalWidth / chartWidth;

          // Convert x coordinate to logical index
          const logicalIndex = logicalRange.from + x * logicalPerPixel;

          // Extrapolate time based on logical position
          const bars = dataRef.current;
          if (logicalIndex < 0) {
            // Before first candle
            const firstTime = bars[0].time;
            const secondTime = bars.length > 1 ? bars[1].time : firstTime;
            const timeStep = secondTime - firstTime;
            time = (firstTime + Math.floor(logicalIndex) * timeStep) as Time;
          } else if (logicalIndex >= bars.length) {
            // After last candle
            const lastTime = bars[bars.length - 1].time;
            const prevTime =
              bars.length > 1 ? bars[bars.length - 2].time : lastTime;
            const timeStep = lastTime - prevTime;
            time = (lastTime +
              Math.floor(logicalIndex - bars.length + 1) * timeStep) as Time;
          }
        }
      }

      if (time === null || price === null) return null;

      return { time, price, x, y };
    },
    []
  );

  const getPointCoords = useCallback((point: Point) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;

    const timeScale = chart.timeScale();
    let x = timeScale.timeToCoordinate(point.time as Time) as number | null;

    // If exact time not found, extrapolate the position
    if (
      x === null &&
      typeof point.time === "number" &&
      dataRef.current.length > 0
    ) {
      const bars = dataRef.current;
      const logicalRange = timeScale.getVisibleLogicalRange();

      if (logicalRange) {
        // Calculate the time step between bars
        const lastTime = bars[bars.length - 1].time;
        const prevTime =
          bars.length > 1 ? bars[bars.length - 2].time : lastTime;
        const timeStep = lastTime - prevTime || 1;

        // Find logical position based on time extrapolation
        let logicalIndex: number;

        if (point.time < bars[0].time) {
          // Before first candle
          const firstTime = bars[0].time;
          logicalIndex = (point.time - firstTime) / timeStep;
        } else if (point.time > lastTime) {
          // After last candle
          logicalIndex = bars.length - 1 + (point.time - lastTime) / timeStep;
        } else {
          // Try to find closest time in current data
          const closestTime = getClosestTime(point.time, bars);
          if (closestTime !== null) {
            x = timeScale.timeToCoordinate(closestTime as Time) as
              | number
              | null;
          }
          if (x !== null) {
            const y = series.priceToCoordinate(point.price);
            return { x, y };
          }
          logicalIndex = bars.length - 1;
        }

        // Convert logical index to pixel coordinate
        const logicalWidth = logicalRange.to - logicalRange.from;
        const container = containerRef.current;
        if (container) {
          const chartWidth = container.getBoundingClientRect().width;
          const pixelsPerLogical = chartWidth / logicalWidth;
          x = (logicalIndex - logicalRange.from) * pixelsPerLogical;
        }
      }
    }

    const y = series.priceToCoordinate(point.price);

    return { x, y };
  }, []);

  // Handle interactions
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      if (selectedTool === "Trend Line") {
        const coords = getChartCoordinates(e);
        if (!coords) return;

        if (!currentDrawing) {
          // Start creating
          const newDrawing: Drawing = {
            id: Math.random().toString(36).substr(2, 9),
            type: "Trend Line",
            symbol,
            points: [
              { time: coords.time as number, price: coords.price },
              { time: coords.time as number, price: coords.price },
            ],
          };
          setCurrentDrawing(newDrawing);
        } else {
          // Finish creating (Click-Move-Click flow)
          setDrawings((prev) => [...prev, currentDrawing]);
          setCurrentDrawing(null);
          setSelectedDrawingId(null); // Don't auto-select after creation
          onToolComplete?.();
        }
        return;
      }

      // If not creating, clicking background deselects
      // Logic moved to native event listener for better propagation handling
    },
    [
      selectedTool,
      getChartCoordinates,
      currentDrawing,
      onToolComplete,
      symbol,
      setDrawings,
    ]
  );

  // Global mouse move/up for dragging and creation
  useEffect(() => {
    if (!dragState && !currentDrawing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const coords = getChartCoordinates(e);
      if (!coords) return;

      if (currentDrawing) {
        // Update end point
        setCurrentDrawing((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            points: [
              prev.points[0],
              { time: coords.time as number, price: coords.price },
            ],
          };
        });
      } else if (dragState) {
        setDrawings((prevDrawings) =>
          prevDrawings.map((d) => {
            if (d.id !== dragState.drawingId) return d;

            const newPoints = [...d.points];

            if (
              dragState.type === "point" &&
              dragState.pointIndex !== undefined
            ) {
              newPoints[dragState.pointIndex] = {
                time: coords.time as number,
                price: coords.price,
              };
            } else if (
              dragState.type === "whole" &&
              dragState.originalPoints &&
              dragState.startMouse
            ) {
              // Move whole drawing
              const chart = chartRef.current;
              const series = seriesRef.current;
              if (chart && series && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;

                const deltaX = currentX - dragState.startMouse.x;
                const deltaY = currentY - dragState.startMouse.y;

                // For each point, calculate new position based on pixels
                // This is approximate but smoother than trying to add time deltas
                const timeScale = chart.timeScale();

                d.points.forEach((p, i) => {
                  const originalP = dragState.originalPoints![i];
                  const ox = timeScale.timeToCoordinate(originalP.time as Time);
                  const oy = series.priceToCoordinate(originalP.price);

                  if (ox !== null && oy !== null) {
                    const nx = ox + deltaX;
                    const ny = oy + deltaY;

                    const nt = timeScale.coordinateToTime(nx as Coordinate);
                    const np = series.coordinateToPrice(ny as Coordinate);

                    if (nt !== null && np !== null) {
                      newPoints[i] = { time: nt as number, price: np };
                    }
                  }
                });
              }
            }

            return { ...d, points: newPoints };
          })
        );
      }
    };

    const handleMouseUp = () => {
      // For Drag-to-Create support: if we released mouse and points are far apart, finish.
      // If points are close, assume Click-Move-Click flow and keep drawing.
      if (currentDrawing && selectedTool === "Trend Line") {
        const p1 = getPointCoords(currentDrawing.points[0]);
        const p2 = getPointCoords(currentDrawing.points[1]);

        if (
          p1 &&
          p2 &&
          p1.x !== null &&
          p1.y !== null &&
          p2.x !== null &&
          p2.y !== null
        ) {
          const dist = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
          );
          if (dist > 10) {
            // User dragged significantly -> Finish
            setDrawings((prev) => [...prev, currentDrawing]);
            setCurrentDrawing(null);
            setSelectedDrawingId(null); // Don't auto-select after creation
            onToolComplete?.();
          }
        }
      }
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState,
    currentDrawing,
    getChartCoordinates,
    onToolComplete,
    getPointCoords,
    selectedTool,
    setDrawings,
  ]);

  // Handle delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedDrawingId) {
        setDrawings((prev) => prev.filter((d) => d.id !== selectedDrawingId));
        setSelectedDrawingId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDrawingId, setDrawings]);

  // Pulse animation is now CSS-only - no interval needed for performance

  // For React-based updates (when drawings list changes, etc.)
  const [overlayUpdateTrigger, setOverlayUpdateTrigger] = useState(0);

  // Direct DOM update function for zero-lag drawing synchronization
  // This bypasses React entirely to match lightweight-charts' sync rendering
  const updateDrawingsDirectly = useCallback(() => {
    const svg = svgOverlayRef.current;
    const chart = chartRef.current;
    const series = seriesRef.current;

    if (!svg || !chart || !series) return;

    const timeScale = chart.timeScale();

    // Update all drawing lines directly in the DOM
    const lines = svg.querySelectorAll("[data-drawing-id]");
    lines.forEach((group) => {
      const drawingId = group.getAttribute("data-drawing-id");
      const drawing =
        drawings.find((d) => d.id === drawingId) ||
        (currentDrawing?.id === drawingId ? currentDrawing : null);

      if (!drawing || drawing.points.length < 2) return;

      // Calculate new coordinates
      const p1 = drawing.points[0];
      const p2 = drawing.points[1];

      let x1 = timeScale.timeToCoordinate(p1.time as Time);
      const y1 = series.priceToCoordinate(p1.price);
      let x2 = timeScale.timeToCoordinate(p2.time as Time);
      const y2 = series.priceToCoordinate(p2.price);

      // Handle extrapolation for times outside visible range
      if (x1 === null || x2 === null) {
        const logicalRange = timeScale.getVisibleLogicalRange();
        if (logicalRange && dataRef.current.length > 0) {
          const bars = dataRef.current;
          const lastTime = bars[bars.length - 1].time;
          const prevTime =
            bars.length > 1 ? bars[bars.length - 2].time : lastTime;
          const timeStep = lastTime - prevTime || 1;
          const container = containerRef.current;

          if (container) {
            const chartWidth = container.getBoundingClientRect().width;
            const logicalWidth = logicalRange.to - logicalRange.from;
            const pixelsPerLogical = chartWidth / logicalWidth;

            // Calculate x1 if needed
            if (x1 === null && typeof p1.time === "number") {
              let logicalIndex: number;
              if (p1.time < bars[0].time) {
                logicalIndex = (p1.time - bars[0].time) / timeStep;
              } else if (p1.time > lastTime) {
                logicalIndex =
                  bars.length - 1 + (p1.time - lastTime) / timeStep;
              } else {
                logicalIndex = bars.length - 1;
              }
              x1 = ((logicalIndex - logicalRange.from) *
                pixelsPerLogical) as Coordinate;
            }

            // Calculate x2 if needed
            if (x2 === null && typeof p2.time === "number") {
              let logicalIndex: number;
              if (p2.time < bars[0].time) {
                logicalIndex = (p2.time - bars[0].time) / timeStep;
              } else if (p2.time > lastTime) {
                logicalIndex =
                  bars.length - 1 + (p2.time - lastTime) / timeStep;
              } else {
                logicalIndex = bars.length - 1;
              }
              x2 = ((logicalIndex - logicalRange.from) *
                pixelsPerLogical) as Coordinate;
            }
          }
        }
      }

      if (x1 === null || y1 === null || x2 === null || y2 === null) return;

      // Update all line elements in this group
      const lineElements = group.querySelectorAll("line");
      lineElements.forEach((line) => {
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(y1));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(y2));
      });

      // Update handle circles if they exist
      const circles = group.querySelectorAll("circle");
      if (circles.length >= 2) {
        circles[0].setAttribute("cx", String(x1));
        circles[0].setAttribute("cy", String(y1));
        circles[1].setAttribute("cx", String(x2));
        circles[1].setAttribute("cy", String(y2));
      }
    });

    // Update price dot and pulse for line chart
    if (chartType === "line" && dataRef.current.length > 0) {
      const lastCandle = dataRef.current[dataRef.current.length - 1];
      const x = timeScale.timeToCoordinate(lastCandle.time as Time);
      const y = series.priceToCoordinate(lastCandle.close);

      if (x !== null && y !== null) {
        const priceDot = svg.querySelector("[data-price-dot]");
        if (priceDot) {
          priceDot.setAttribute("cx", String(x));
          priceDot.setAttribute("cy", String(y));
        }

        const pulseRing = containerRef.current?.querySelector(
          "[data-pulse-ring]"
        ) as HTMLElement;
        if (pulseRing) {
          pulseRing.style.left = `${x}px`;
          pulseRing.style.top = `${y}px`;
        }
      }
    }

    // Update price label
    if (dataRef.current.length > 0) {
      const lastCandle = dataRef.current[dataRef.current.length - 1];
      const y = series.priceToCoordinate(lastCandle.close);

      if (y !== null && containerRef.current) {
        const chartHeight = containerRef.current.clientHeight;
        const minY = 10;
        const maxY = chartHeight - 30;
        const clampedY = Math.max(minY, Math.min(maxY, y));

        const priceLabel = containerRef.current.querySelector(
          "[data-price-label]"
        ) as HTMLElement;
        if (priceLabel) {
          priceLabel.style.top = `${clampedY}px`;
        }
      }
    }
  }, [drawings, currentDrawing, chartType]);

  // Listen for chart updates - use direct DOM manipulation for zero-lag updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleChartUpdate = () => {
      // Direct DOM update - bypasses React for immediate response
      updateDrawingsDirectly();
    };

    container.addEventListener("chartupdate", handleChartUpdate);
    return () => {
      container.removeEventListener("chartupdate", handleChartUpdate);
    };
  }, [updateDrawingsDirectly]);

  // React-based update for when drawings list actually changes
  useEffect(() => {
    setOverlayUpdateTrigger((v) => v + 1);
  }, [drawings, currentDrawing, selectedDrawingId]);

  // Memoize filtered drawings to avoid recalculating on every render
  const visibleDrawings = useMemo(() => {
    const filtered = drawings.filter((d) => d.symbol === symbol);
    return currentDrawing ? [...filtered, currentDrawing] : filtered;
  }, [drawings, symbol, currentDrawing]);

  // Memoize price info to avoid recalculating on every render
  const priceInfo = useMemo(() => {
    if (data.length === 0) return null;
    const lastCandle = data[data.length - 1];
    const prevCandle = data.length > 1 ? data[data.length - 2] : null;
    const isPositive = prevCandle ? lastCandle.close >= prevCandle.close : true;
    return {
      currentPrice: lastCandle.close,
      lastTime: lastCandle.time,
      isPositive,
    };
  }, [data]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Chart container */}
      <div
        ref={containerRef}
        className={`w-full ${
          hasRSI || hasMACD || hasCCI ? "flex-1 min-h-0" : "h-full"
        }`}
      />

      {/* RSI Panel */}
      {hasRSI && (
        <div className="relative w-full" style={{ height: "120px" }}>
          {/* RSI Label */}
          <div className="absolute top-1 left-2 z-10 flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">
              RSI ({rsiIndicator?.config.period || 14})
            </span>
          </div>
          {/* Separator line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
          {/* RSI Chart */}
          <div ref={rsiContainerCallbackRef} className="w-full h-full" />
        </div>
      )}

      {/* MACD Panel */}
      {hasMACD && (
        <div className="relative w-full" style={{ height: "120px" }}>
          {/* MACD Label */}
          <div className="absolute top-1 left-2 z-10 flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">
              MACD ({macdIndicator?.config.fastPeriod || 12},{" "}
              {macdIndicator?.config.slowPeriod || 26},{" "}
              {macdIndicator?.config.signalPeriod || 9})
            </span>
          </div>
          {/* Separator line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
          {/* MACD Chart */}
          <div ref={macdContainerCallbackRef} className="w-full h-full" />
        </div>
      )}

      {/* CCI Panel */}
      {hasCCI && (
        <div className="relative w-full" style={{ height: "120px" }}>
          {/* CCI Label */}
          <div className="absolute top-1 left-2 z-10 flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">
              CCI ({cciIndicator?.config.period || 20})
            </span>
          </div>
          {/* Separator line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
          {/* CCI Chart */}
          <div ref={cciContainerCallbackRef} className="w-full h-full" />
        </div>
      )}

      {/* Stochastic Oscillator Pane */}
      {hasStochastic && (
        <div className="relative w-full" style={{ height: "120px" }}>
          {/* Stochastic Label */}
          <div className="absolute top-1 left-2 z-10 flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">
              Stoch ({Number(stochIndicator?.config.kPeriod) || 14},{" "}
              {Number(stochIndicator?.config.dPeriod) || 3},{" "}
              {Number(stochIndicator?.config.slowing) || 3})
            </span>
          </div>
          {/* Separator line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
          {/* Stochastic Chart */}
          <div ref={stochContainerCallbackRef} className="w-full h-full" />
        </div>
      )}

      {/* Drawing Overlay - Using ref for direct DOM updates during scroll */}
      <svg
        ref={svgOverlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
        data-update={overlayUpdateTrigger} // Forces re-render when needed
      >
        {visibleDrawings.map((d) => {
          if (d.points.length < 2) return null;
          const p1 = getPointCoords(d.points[0]);
          const p2 = getPointCoords(d.points[1]);

          if (
            !p1 ||
            !p2 ||
            p1.x === null ||
            p2.x === null ||
            p1.y === null ||
            p2.y === null
          )
            return null;

          const isSelected =
            selectedDrawingId === d.id || currentDrawing?.id === d.id;

          return (
            <g key={d.id} data-drawing-id={d.id}>
              {/* Hit area for easier selection & dragging */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="transparent"
                strokeWidth={10}
                className={
                  selectedTool ? "" : "cursor-move pointer-events-auto"
                }
                onMouseDown={(e) => {
                  if (selectedTool) return;
                  e.stopPropagation();
                  setSelectedDrawingId(d.id);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setDragState({
                      type: "whole",
                      drawingId: d.id,
                      startMouse: {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      },
                      originalPoints: d.points,
                    });
                  }
                }}
              />
              {/* Visible Line */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={d.config?.color ?? "#2962ff"}
                strokeWidth={d.config?.lineWidth ?? 2}
                className="pointer-events-none"
              />

              {/* Handles */}
              {isSelected && (
                <>
                  {[p1, p2].map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x!}
                      cy={p.y!}
                      r={5}
                      fill="white"
                      stroke={d.config?.color ?? "#2962ff"}
                      strokeWidth={2}
                      className={
                        selectedTool
                          ? "pointer-events-none"
                          : "cursor-pointer pointer-events-auto"
                      }
                      onMouseDown={(e) => {
                        if (selectedTool) return;
                        e.stopPropagation();
                        setDragState({
                          type: "point",
                          drawingId: d.id,
                          pointIndex: i,
                        });
                      }}
                    />
                  ))}
                </>
              )}
            </g>
          );
        })}

        {/* Current Price Dot for Line Chart - Center dot only in SVG */}
        {chartType === "line" &&
          priceInfo &&
          (() => {
            const chart = chartRef.current;
            const series = seriesRef.current;

            if (!chart || !series) return null;

            const timeScale = chart.timeScale();
            const x = timeScale.timeToCoordinate(priceInfo.lastTime as Time);
            const y = series.priceToCoordinate(priceInfo.currentPrice);

            if (x === null || y === null) return null;

            return (
              <circle
                key={`price-dot-${priceInfo.lastTime}`}
                data-price-dot
                cx={x}
                cy={y}
                r={5}
                fill="#00b6f8"
                className="pointer-events-none"
              />
            );
          })()}
      </svg>

      {/* Current Price Pulse Ring - CSS-only animation, no React re-renders */}
      {chartType === "line" &&
        priceInfo &&
        (() => {
          const chart = chartRef.current;
          const series = seriesRef.current;

          if (!chart || !series) return null;

          const timeScale = chart.timeScale();
          const x = timeScale.timeToCoordinate(priceInfo.lastTime as Time);
          const y = series.priceToCoordinate(priceInfo.currentPrice);

          if (x === null || y === null) return null;

          return (
            <div
              data-pulse-ring
              className="absolute pointer-events-none z-11"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{
                  backgroundColor: "rgba(0, 182, 248, 0.5)",
                  animation: "price-pulse-ring 2s ease-out infinite",
                }}
              />
            </div>
          );
        })()}

      {/* Custom Current Price Label - Always positioned at visible horizontal line */}
      {priceInfo &&
        (() => {
          const chart = chartRef.current;
          const series = seriesRef.current;

          if (!chart || !series || !containerRef.current) return null;

          const y = series.priceToCoordinate(priceInfo.currentPrice);
          if (y === null) return null;

          // Get chart dimensions to clamp label position
          const chartHeight = containerRef.current.clientHeight;
          const minY = 10;
          const maxY = chartHeight - 30;
          const clampedY = Math.max(minY, Math.min(maxY, y));

          const bgColor = priceInfo.isPositive ? "#00e676" : "#ff4976";

          return (
            <div
              data-price-label
              className="absolute pointer-events-none z-30"
              style={{
                right: "0px",
                top: `${clampedY}px`,
                transform: "translateY(-50%)",
              }}
            >
              <div
                className="px-2 py-1 text-xs font-bold tabular-nums"
                style={{
                  backgroundColor: bgColor,
                  color: "#ffffff",
                  borderRadius: "2px 0 0 2px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
                }}
              >
                {priceInfo.currentPrice.toFixed(5)}
              </div>
            </div>
          );
        })()}

      {/* Interaction Layer */}
      {selectedTool && (
        <div
          className="absolute inset-0 z-20 cursor-crosshair"
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Scroll to newest button */}
      <button
        onClick={handleScrollToNewest}
        className={`absolute right-24 z-20 p-1.5 rounded-full bg-[--bg-secondary] border border-[--border-primary] text-foreground shadow-lg transition-all duration-200 hover:bg-[--bg-tertiary] cursor-pointer ${
          showScrollButton
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-4 pointer-events-none"
        }`}
        style={{
          bottom: `${
            48 + (hasRSI ? 120 : 0) + (hasMACD ? 120 : 0) + (hasCCI ? 120 : 0)
          }px`,
        }}
        title="Scroll to newest"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="13 17 18 12 13 7" />
          <polyline points="6 17 11 12 6 7" />
        </svg>
      </button>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner" />
            <span className="text-sm text-[--text-secondary]">
              Loading {symbol}...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
