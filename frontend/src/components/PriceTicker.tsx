"use client";

import { useEffect, useRef } from "react";
import { QuoteData, CandleData } from "@/lib/types";

interface PriceTickerProps {
  quote: QuoteData | null;
  candles: CandleData[];
  symbol: string;
}

export function PriceTicker({ quote, candles, symbol }: PriceTickerProps) {
  const priceSpanRef = useRef<HTMLSpanElement>(null);
  const prevBidRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track price changes for flash effect
  useEffect(() => {
    if (!quote) return;

    if (prevBidRef.current !== null && priceSpanRef.current) {
      // Clear previous animation
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      priceSpanRef.current.classList.remove("price-up", "price-down");

      // Add new animation class
      if (quote.bid > prevBidRef.current) {
        priceSpanRef.current.classList.add("price-up");
        timeoutRef.current = setTimeout(() => {
          priceSpanRef.current?.classList.remove("price-up");
        }, 500);
      } else if (quote.bid < prevBidRef.current) {
        priceSpanRef.current.classList.add("price-down");
        timeoutRef.current = setTimeout(() => {
          priceSpanRef.current?.classList.remove("price-down");
        }, 500);
      }
    }

    prevBidRef.current = quote.bid;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [quote]);

  // Calculate change from previous close
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];

  const currentPrice = quote?.bid || lastCandle?.close || 0;
  const previousClose = prevCandle?.close || lastCandle?.open || currentPrice;
  const change = currentPrice - previousClose;
  const changePercent = previousClose ? (change / previousClose) * 100 : 0;
  const isPositive = change >= 0;

  // Calculate high/low for the day
  const todayHigh =
    candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : 0;
  const todayLow =
    candles.length > 0 ? Math.min(...candles.map((c) => c.low)) : 0;

  // Determine decimal places
  const digits = quote?.symbol
    ? symbol.includes("JPY")
      ? 3
      : symbol.includes("XAU") || symbol.includes("GOLD")
      ? 2
      : 5
    : 5;

  const formatPrice = (price: number) => price.toFixed(digits);

  return (
    <div className="flex items-center gap-6">
      {/* Main price */}
      <div className="flex items-baseline gap-3">
        <span
          ref={priceSpanRef}
          className={`
            text-3xl font-bold tabular-nums transition-colors
            ${isPositive ? "text-(--accent-green)" : "text-(--accent-red)"}
          `}
        >
          {formatPrice(currentPrice)}
        </span>

        {/* Change indicator */}
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? "text-(--accent-green)" : "text-(--accent-red)"
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={isPositive ? "" : "rotate-180"}
          >
            <path d="M12 4l-8 8h5v8h6v-8h5z" />
          </svg>
          <span>
            {isPositive ? "+" : ""}
            {formatPrice(change)}
          </span>
          <span className="text-(--text-muted)">
            ({isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Bid/Ask spread */}
      {quote && (
        <div className="flex flex-col gap-0.5 border-l border-(--border-primary) pl-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-(--text-muted)">BID</span>
            <span className="font-medium text-(--accent-red) tabular-nums">
              {formatPrice(quote.bid)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-(--text-muted)">ASK</span>
            <span className="font-medium text-(--accent-green) tabular-nums">
              {formatPrice(quote.ask)}
            </span>
          </div>
        </div>
      )}

      {/* High/Low */}
      <div className="flex flex-col gap-0.5 border-l border-(--border-primary) pl-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-(--text-muted)">HIGH</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatPrice(todayHigh)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-(--text-muted)">LOW</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatPrice(todayLow)}
          </span>
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 ml-auto">
        <div className="w-2 h-2 rounded-full bg-(--accent-green) live-indicator" />
        <span className="text-xs text-(--text-muted)">LIVE</span>
      </div>
    </div>
  );
}
