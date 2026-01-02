"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Header,
  CandlestickChart,
  SymbolSelector,
  TimeframeSelector,
  ChartTypeSelector,
  IndicatorSelector,
  DrawingToolSelector,
  TradingSidebar,
  LeverageManager,
} from "@/components";
import { useMarketData, useLocalStorage, useIndicators } from "@/hooks";
import { useAccount } from "@/hooks/useAccount";
import { Timeframe, ChartType, ActiveIndicator, IndicatorConfig } from "@/lib/types";

export default function TradingPage() {
  const [symbol, setSymbol] = useLocalStorage(
    "atlas_selected_symbol",
    "EURUSD"
  );
  const [timeframe, setTimeframe] = useState<Timeframe>("M1");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const {
    activeIndicators,
    favoriteIndicators,
    updateActiveIndicators,
    updateFavoriteIndicators,
  } = useIndicators();

  // Get isAutoLeverage from account data (persisted in database)
  const { account } = useAccount();
  const isAutoLeverage = account?.isAutoLeverage ?? false;

  const { candles, quote, loading, error, refresh } = useMarketData({
    symbol,
    timeframe,
    autoRefresh: true,
    refreshInterval: 2000,
    limit: 10000,
  });

  // Get current prices from the latest candle
  const { currentBid, currentAsk } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { currentBid: 0, currentAsk: 0 };
    }
    const lastCandle = candles[candles.length - 1];
    const price = lastCandle.close;
    // Approximate spread based on price magnitude (typical forex spread)
    const spreadEstimate = price > 10 ? 0.0003 : 0.00003;
    return {
      currentBid: price,
      currentAsk: price + spreadEstimate,
    };
  }, [candles]);

  const handleSymbolChange = useCallback(
    (newSymbol: string) => {
      console.log(
        "TradingPage: Symbol changed to:",
        newSymbol,
        "Type:",
        typeof newSymbol,
        "Length:",
        newSymbol?.length
      );
      setSymbol(newSymbol);
    },
    [setSymbol]
  );

  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);
  }, []);

  const handleChartTypeChange = useCallback((newChartType: ChartType) => {
    setChartType(newChartType);
  }, []);

  const handleAddIndicator = (name: string, config: IndicatorConfig = {}) => {
    const newIndicator: ActiveIndicator = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      config,
    };
    updateActiveIndicators([...activeIndicators, newIndicator]);
  };

  const handleRemoveIndicator = (id: string) => {
    updateActiveIndicators(activeIndicators.filter((i) => i.id !== id));
  };

  const handleUpdateIndicator = (id: string, newConfig: IndicatorConfig) => {
    updateActiveIndicators(
      activeIndicators.map((i) =>
        i.id === id ? { ...i, config: newConfig } : i
      )
    );
  };

  const handleToggleFavorite = (indicator: string) => {
    const newFavorites = favoriteIndicators.includes(indicator)
      ? favoriteIndicators.filter((f) => f !== indicator)
      : [...favoriteIndicators, indicator];
    updateFavoriteIndicators(newFavorites);
  };

  return (
    <div className="h-screen flex flex-col bg-background noise-overlay">
      {/* Leverage Manager - automatically adjusts leverage based on symbol */}
      <LeverageManager symbol={symbol} enabled={isAutoLeverage} />

      {/* Header with controls */}
      <Header />

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
        <div className="absolute top-4 left-4 z-50 flex items-center gap-1 sm:gap-2">
          <SymbolSelector
            value={symbol}
            onChange={handleSymbolChange}
            buttonClassName="h-8 sm:h-9 bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white min-w-[100px] sm:min-w-[120px] shadow-lg text-xs sm:text-sm"
            dropdownClassName="bg-white/10 backdrop-blur-md border border-white/10 shadow-lg rounded-lg"
          />
          <TimeframeSelector
            value={timeframe}
            onChange={handleTimeframeChange}
            buttonClassName="h-8 w-8 sm:h-9 sm:w-9 bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white shadow-lg flex items-center justify-center p-0"
            dropdownClassName="bg-white/10 backdrop-blur-md border border-white/10 shadow-lg rounded-lg"
          />
          <ChartTypeSelector
            value={chartType}
            onChange={handleChartTypeChange}
            buttonClassName="h-8 w-8 sm:h-9 sm:w-9 bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white shadow-lg flex items-center justify-center p-0"
            dropdownClassName="bg-white/10 backdrop-blur-md border border-white/10 shadow-lg rounded-lg"
          />
          <IndicatorSelector
            buttonClassName="h-8 w-8 sm:h-9 sm:w-9 bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white shadow-lg flex items-center justify-center p-0"
            dropdownClassName="bg-white/10 backdrop-blur-md border border-white/10 shadow-lg rounded-lg"
            activeIndicators={activeIndicators}
            favoriteIndicators={favoriteIndicators}
            onAddIndicator={handleAddIndicator}
            onRemoveIndicator={handleRemoveIndicator}
            onUpdateIndicator={handleUpdateIndicator}
            onToggleFavorite={handleToggleFavorite}
          />
          <DrawingToolSelector
            buttonClassName={`h-8 w-8 sm:h-9 sm:w-9 bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 text-white shadow-lg flex items-center justify-center p-0 ${
              selectedTool
                ? "bg-white/20 border-white/30 text-(--accent-cyan)"
                : ""
            }`}
            dropdownClassName="bg-white/10 backdrop-blur-md border border-white/10 shadow-lg rounded-lg"
            onToolSelect={setSelectedTool}
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
              chartType={chartType}
              loading={loading}
              selectedTool={selectedTool}
              activeIndicators={activeIndicators}
              onToolComplete={() => setSelectedTool(null)}
            />
          )}
        </div>

        {/* Trading Sidebar */}
        <TradingSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          symbol={symbol}
          currentBid={currentBid}
          currentAsk={currentAsk}
          marketOpen={quote?.market_open}
          isAutoLeverage={isAutoLeverage}
        />
      </main>
    </div>
  );
}
