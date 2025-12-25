"use client";

import { useState, useCallback } from "react";
import {
  Header,
  CandlestickChart,
  SymbolSelector,
  TimeframeSelector,
} from "@/components";
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
      <Header onRefresh={refresh} />

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

        {/* Controls Overlay - TOP LEFT */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <SymbolSelector
            value={symbol}
            onChange={handleSymbolChange}
            buttonClassName="h-10 bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white min-w-[140px] shadow-lg"
            dropdownClassName="bg-white/10 backdrop-blur-md border border-white/10 shadow-lg rounded-lg"
          />
          <TimeframeSelector
            value={timeframe}
            onChange={handleTimeframeChange}
            buttonClassName="h-10 bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white min-w-[70px] shadow-lg"
            dropdownClassName="bg-white/10 backdrop-blur-md border border-white/10 shadow-lg rounded-lg"
          />
        </div>

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
      </main>
    </div>
  );
}
