"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  BarSeries,
  AreaSeries,
  CandlestickData,
  BarData,
  LineData,
  Time,
  ColorType,
  CrosshairMode,
  Coordinate,
} from "lightweight-charts";
import { CandleData, Timeframe, ChartType } from "@/lib/types";

interface Point {
  time: Time;
  price: number;
}

interface Drawing {
  id: string;
  type: string;
  points: Point[];
  symbol: string;
}

interface CandlestickChartProps {
  data: CandleData[];
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  loading?: boolean;
  selectedTool?: string | null;
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
  onToolComplete,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<
    "Candlestick" | "Bar" | "Line" | "Area"
  > | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastFittedRef = useRef<string | null>(null);

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
  const [pulseKey, setPulseKey] = useState(0);

  // Drawing state
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(
    null
  );
  const [chartLayoutVersion, setChartLayoutVersion] = useState(0);
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
        lastValueVisible: true,
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

    // Detect scrolling
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(() => {
      const logicalRange = timeScale.getVisibleLogicalRange();
      if (!logicalRange) return;

      // scrollPosition() returns the number of bars from the right edge
      // Negative values mean we've scrolled into history
      const scrollPos = timeScale.scrollPosition();
      setShowScrollButton(scrollPos < -5);

      // Force re-render for overlay
      setChartLayoutVersion((v) => v + 1);
    });

    // Handle resize with debouncing for smooth performance
    let resizeTimeout: NodeJS.Timeout;
    resizeObserverRef.current = new ResizeObserver((entries) => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          chart.resize(width, height);
          setChartLayoutVersion((v) => v + 1);
        }
      }, 16); // ~60fps
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

      clearTimeout(resizeTimeout);
      resizeObserverRef.current?.disconnect();
      chart.remove();
    };
  }, [updatePriceRange, chartType]);

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
    let x = timeScale.timeToCoordinate(point.time) as number | null;

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
              { time: coords.time, price: coords.price },
              { time: coords.time, price: coords.price },
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
    [selectedTool, getChartCoordinates, currentDrawing, onToolComplete, symbol]
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
              { time: coords.time, price: coords.price },
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
                time: coords.time,
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
                  const ox = timeScale.timeToCoordinate(originalP.time);
                  const oy = series.priceToCoordinate(originalP.price);

                  if (ox !== null && oy !== null) {
                    const nx = ox + deltaX;
                    const ny = oy + deltaY;

                    const nt = timeScale.coordinateToTime(nx as Coordinate);
                    const np = series.coordinateToPrice(ny as Coordinate);

                    if (nt !== null && np !== null) {
                      newPoints[i] = { time: nt, price: np };
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
  }, [selectedDrawingId]);

  // Pulse animation for line chart current price dot
  useEffect(() => {
    if (chartType !== "line") return;

    const interval = setInterval(() => {
      setPulseKey((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [chartType]);

  return (
    <div className="relative w-full h-full">
      {/* Chart container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Drawing Overlay */}
      <svg
        key={chartLayoutVersion}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
      >
        {drawings
          .filter((d) => d.symbol === symbol)
          .concat(currentDrawing ? [currentDrawing] : [])
          .map((d) => {
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
              <g key={d.id}>
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
                  stroke={isSelected ? "#2962ff" : "#2962ff"}
                  strokeWidth={2}
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
                        stroke="#2962ff"
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
          data.length > 0 &&
          (() => {
            const lastCandle = data[data.length - 1];
            const chart = chartRef.current;
            const series = seriesRef.current;

            if (!chart || !series) return null;

            const timeScale = chart.timeScale();
            const x = timeScale.timeToCoordinate(lastCandle.time as Time);
            const y = series.priceToCoordinate(lastCandle.close);

            if (x === null || y === null) return null;

            return (
              <circle
                key={`price-dot-${lastCandle.time}`}
                cx={x}
                cy={y}
                r={5}
                fill="#00b6f8"
                className="pointer-events-none"
              />
            );
          })()}
      </svg>

      {/* Current Price Pulse Ring - HTML overlay for better animation */}
      {chartType === "line" &&
        data.length > 0 &&
        (() => {
          const lastCandle = data[data.length - 1];
          const chart = chartRef.current;
          const series = seriesRef.current;

          if (!chart || !series) return null;

          const timeScale = chart.timeScale();
          const x = timeScale.timeToCoordinate(lastCandle.time as Time);
          const y = series.priceToCoordinate(lastCandle.close);

          if (x === null || y === null) return null;

          return (
            <div
              key={pulseKey}
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
                  animation: "price-pulse-ring 2s ease-out forwards",
                }}
              />
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
        className={`absolute bottom-12 right-24 z-20 p-1.5 rounded-full bg-[--bg-secondary] border border-[--border-primary] text-foreground shadow-lg transition-all duration-200 hover:bg-[--bg-tertiary] cursor-pointer ${
          showScrollButton
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-4 pointer-events-none"
        }`}
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
