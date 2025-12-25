"use client";

import { useEffect, useRef, useCallback, useState } from "react";
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
        minBarSpacing: 3,
        maxBarSpacing: 50,
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

    // Create candlestick series with beautiful colors (v5 API)
    const series = chart.addSeries(CandlestickSeries, {
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
      priceLineStyle: 0, // Solid
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
    });

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

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

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
  }, [updatePriceRange]);

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
    const currentKey = `${symbol}-${timeframe}`;
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

  return (
    <div className="relative w-full h-full">
      {/* Chart container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Scroll to newest button */}
      <button
        onClick={handleScrollToNewest}
        className={`absolute bottom-12 right-16 z-20 p-2 rounded-full bg-(--bg-secondary) border border-(--border-primary) text-foreground shadow-lg transition-all duration-200 hover:bg-(--bg-tertiary) cursor-pointer ${
          showScrollButton
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-4 pointer-events-none"
        }`}
        title="Scroll to newest"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
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
            <span className="text-sm text-(--text-secondary)">
              Loading {symbol}...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
