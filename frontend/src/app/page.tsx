"use client";

import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { CandlestickChart } from "@/components/CandlestickChart";
import { useMarketData } from "@/hooks/useMarketData";
import { Timeframe } from "@/lib/types";

export default function TradingPage() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("M1");

  const { candles, loading, error, refresh } = useMarketData({
    symbol,
    timeframe,
    autoRefresh: true,
    refreshInterval: 2000,
    limit: 10000,
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

      {/* Price ticker bar removed */}

      {/* Main chart area */}
      <main className="flex-1 relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10 pointer-events-none"
          style={{
            backgroundImage: "url(/photo-1527236278376-a1ed0f95da30.jpg)",
          }}
        />
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg opacity-50" />

        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-linear-to-b from-gray-200/20 via-transparent to-transparent pointer-events-none" />

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

        {/* Bottom info bar - REMOVED */}
      </main>
    </div>
  );
}
