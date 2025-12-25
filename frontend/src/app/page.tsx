"use client";

import { useState, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { CandlestickChart } from "@/components/CandlestickChart";
import { PriceTicker } from "@/components/PriceTicker";
import { useMarketData } from "@/hooks/useMarketData";
import { Timeframe } from "@/lib/types";

export default function TradingPage() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("M1");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { candles, quote, loading, error, refresh } = useMarketData({
    symbol,
    timeframe,
    autoRefresh: true,
    refreshInterval: 2000,
  });

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
  }, []);

  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background noise-overlay">
      {/* Header with controls */}
      <Header
        symbol={symbol}
        timeframe={timeframe}
        onSymbolChange={handleSymbolChange}
        onTimeframeChange={handleTimeframeChange}
        onRefresh={refresh}
      />

      {/* Price ticker bar */}
      <div className="px-4 py-3 bg-(--bg-secondary) border-b border-(--border-primary)">
        <PriceTicker quote={quote} candles={candles} symbol={symbol} />
      </div>

      {/* Main chart area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg opacity-50" />

        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-linear-to-b from-(--bg-primary)/50 via-transparent to-transparent pointer-events-none" />

        {/* Chart */}
        <div className="absolute inset-0">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="text-(--accent-red) text-lg">
                ⚠ Connection Error
              </div>
              <p className="text-(--text-secondary) text-sm max-w-md text-center">
                {error}
              </p>
              <button onClick={refresh} className="btn-primary mt-2">
                Retry Connection
              </button>
            </div>
          ) : (
            <CandlestickChart
              data={candles}
              symbol={symbol}
              timeframe={timeframe}
              loading={loading}
            />
          )}
        </div>

        {/* Bottom info bar */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-linear-to-t from-background to-transparent">
          <div className="flex items-center justify-between text-xs text-(--text-muted)">
            <div className="flex items-center gap-4">
              <span>Candles: {candles.length}</span>
              <span>Timeframe: {timeframe}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                Last update: {mounted ? new Date().toLocaleTimeString() : ""}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Status bar */}
      <footer className="flex items-center justify-between px-4 py-2 bg-(--bg-secondary) border-t border-(--border-primary) text-xs text-(--text-muted)">
        <div className="flex items-center gap-4">
          <span>© 2024 AtlasX Trading</span>
          <span>•</span>
          <span>Powered by MetaTrader 5</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-(--accent-green)" />
            WebSocket Active
          </span>
          <span>API: localhost:8001</span>
        </div>
      </footer>
    </div>
  );
}
