"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useAccount } from "@/hooks/useAccount";
import { useOrders, Order, PlaceOrderParams } from "@/hooks/useOrders";
import { useSymbolInfo } from "@/hooks/useSymbolInfo";
import {
  getContractSize,
  getCategoryFromSymbol,
  getLeverageForSymbol,
} from "@/lib/leverage";

interface TradingSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  symbol: string;
  currentBid: number;
  currentAsk: number;
  marketOpen?: boolean;
  isAutoLeverage: boolean;
}

// Custom hook for auto-repeat button functionality
function useAutoRepeat(callback: () => void, delay: number = 100) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRepeat = useCallback(() => {
    // Execute immediately on first press
    callback();

    // Start repeating after a short delay
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(callback, delay);
    }, 300); // Wait 300ms before starting auto-repeat
  }, [callback, delay]);

  const stopRepeat = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRepeat();
    };
  }, [stopRepeat]);

  return { startRepeat, stopRepeat };
}

export function TradingSidebar({
  isOpen,
  onToggle,
  symbol,
  currentBid,
  currentAsk,
  marketOpen = true,
  isAutoLeverage,
}: TradingSidebarProps) {
  const { account, loading: accountLoading, updateLeverage } = useAccount();
  const { orders, history, placeOrder, closeOrder } = useOrders();
  const [activeSection, setActiveSection] = useState<
    "trade" | "account" | "positions" | "history"
  >("trade");

  // Panel Resize Logic
  const [panelHeight, setPanelHeight] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        // Limit height between 200px and 80% of screen height
        if (newHeight > 200 && newHeight < window.innerHeight * 0.8) {
          setPanelHeight(newHeight);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, resize, stopResizing]);

  const symbolInfo = useSymbolInfo(symbol);

  const autoLeverage = useMemo(() => {
    // If we have symbol info, use it for accurate category
    if (symbolInfo) {
      return getLeverageForSymbol(symbol, 0, symbolInfo.category);
    }
    // Fallback to inferring from symbol string
    return getLeverageForSymbol(symbol);
  }, [symbol, symbolInfo]);

  const handleLeverageChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    if (value === "auto") {
      // Set auto mode and update leverage to auto value - save both to database
      const success = await updateLeverage(autoLeverage, true);
      if (!success) {
        console.error("[Leverage] Failed to save auto leverage");
      } else {
        console.log("[Leverage] Saved auto leverage:", autoLeverage);
      }
    } else {
      // Set manual mode with selected leverage - save both to database
      const newLeverage = parseInt(value, 10);
      if (!isNaN(newLeverage)) {
        const success = await updateLeverage(newLeverage, false);
        if (!success) {
          console.error("[Leverage] Failed to save leverage:", newLeverage);
        } else {
          console.log("[Leverage] Saved manual leverage:", newLeverage);
        }
      }
    }
  };

  const [volume, setVolume] = useState("0.01");
  // Store absolute prices that user enters - they stay fixed
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const spread = currentAsk - currentBid;
  const spreadPips = spread * 10000; // For most forex pairs

  // Auto-repeat handlers for Volume
  const volumeDecrement = useCallback(() => {
    setVolume((v) => Math.max(0.01, parseFloat(v) - 0.01).toFixed(2));
  }, []);
  const volumeIncrement = useCallback(() => {
    setVolume((v) => (parseFloat(v) + 0.01).toFixed(2));
  }, []);
  const { startRepeat: startVolumeDecrement, stopRepeat: stopVolumeDecrement } =
    useAutoRepeat(volumeDecrement, 100);
  const { startRepeat: startVolumeIncrement, stopRepeat: stopVolumeIncrement } =
    useAutoRepeat(volumeIncrement, 100);

  // Auto-repeat handlers for Stop Loss
  const stopLossDecrement = useCallback(() => {
    setStopLossPrice((prev) => {
      if (prev) {
        return (parseFloat(prev) - 0.00001).toFixed(5);
      }
      // If empty, start from current ask price minus small offset
      return (currentAsk - 0.0001).toFixed(5);
    });
  }, [currentAsk]);
  const stopLossIncrement = useCallback(() => {
    setStopLossPrice((prev) => {
      if (prev) {
        return (parseFloat(prev) + 0.00001).toFixed(5);
      }
      // If empty, start from current ask price minus small offset
      return (currentAsk - 0.0001).toFixed(5);
    });
  }, [currentAsk]);
  const {
    startRepeat: startStopLossDecrement,
    stopRepeat: stopStopLossDecrement,
  } = useAutoRepeat(stopLossDecrement, 100);
  const {
    startRepeat: startStopLossIncrement,
    stopRepeat: stopStopLossIncrement,
  } = useAutoRepeat(stopLossIncrement, 100);

  // Auto-repeat handlers for Take Profit
  const takeProfitDecrement = useCallback(() => {
    setTakeProfitPrice((prev) => {
      if (prev) {
        return (parseFloat(prev) - 0.00001).toFixed(5);
      }
      // If empty, start from current ask price plus small offset
      return (currentAsk + 0.0001).toFixed(5);
    });
  }, [currentAsk]);
  const takeProfitIncrement = useCallback(() => {
    setTakeProfitPrice((prev) => {
      if (prev) {
        return (parseFloat(prev) + 0.00001).toFixed(5);
      }
      // If empty, start from current ask price plus small offset
      return (currentAsk + 0.0001).toFixed(5);
    });
  }, [currentAsk]);
  const {
    startRepeat: startTakeProfitDecrement,
    stopRepeat: stopTakeProfitDecrement,
  } = useAutoRepeat(takeProfitDecrement, 100);
  const {
    startRepeat: startTakeProfitIncrement,
    stopRepeat: stopTakeProfitIncrement,
  } = useAutoRepeat(takeProfitIncrement, 100);

  // Handle Stop Loss input - convert offset to absolute price on first entry
  const handleStopLossChange = (value: string) => {
    if (value === "") {
      setStopLossPrice("");
      return;
    }
    const inputValue = parseFloat(value);
    if (!isNaN(inputValue)) {
      // If it's a small value (offset), convert to absolute price once
      if (Math.abs(inputValue) < 0.1) {
        const absolutePrice = currentAsk + inputValue;
        setStopLossPrice(absolutePrice.toFixed(5));
      } else {
        // Already an absolute price, use as-is
        setStopLossPrice(value);
      }
    }
  };

  // Handle Take Profit input - convert offset to absolute price on first entry
  const handleTakeProfitChange = (value: string) => {
    if (value === "") {
      setTakeProfitPrice("");
      return;
    }
    const inputValue = parseFloat(value);
    if (!isNaN(inputValue)) {
      // If it's a small value (offset), convert to absolute price once
      if (Math.abs(inputValue) < 0.1) {
        const absolutePrice = currentAsk + inputValue;
        setTakeProfitPrice(absolutePrice.toFixed(5));
      } else {
        // Already an absolute price, use as-is
        setTakeProfitPrice(value);
      }
    }
  };

  const handlePlaceOrder = useCallback(
    async (type: "buy" | "sell") => {
      setOrderLoading(true);
      setOrderError(null);
      setOrderSuccess(null);

      const entryPrice = type === "buy" ? currentAsk : currentBid;

      // Use the stored absolute prices directly
      const slValue = stopLossPrice ? parseFloat(stopLossPrice) : null;
      const tpValue = takeProfitPrice ? parseFloat(takeProfitPrice) : null;

      // Validate Stop Loss and Take Profit
      if (slValue !== null || tpValue !== null) {
        if (type === "buy") {
          // For BUY orders: Stop Loss must be below entry, Take Profit must be above entry
          if (slValue !== null && slValue >= entryPrice) {
            setOrderError("Stop Loss must be below entry price for BUY orders");
            setOrderLoading(false);
            return;
          }
          if (tpValue !== null && tpValue <= entryPrice) {
            setOrderError(
              "Take Profit must be above entry price for BUY orders"
            );
            setOrderLoading(false);
            return;
          }
        } else {
          // For SELL orders: Stop Loss must be above entry, Take Profit must be below entry
          if (slValue !== null && slValue <= entryPrice) {
            setOrderError(
              "Stop Loss must be above entry price for SELL orders"
            );
            setOrderLoading(false);
            return;
          }
          if (tpValue !== null && tpValue >= entryPrice) {
            setOrderError(
              "Take Profit must be below entry price for SELL orders"
            );
            setOrderLoading(false);
            return;
          }
        }
      }

      const params: PlaceOrderParams = {
        symbol,
        type,
        volume: parseFloat(volume),
        entryPrice,
        stopLoss: slValue,
        takeProfit: tpValue,
      };

      const result = await placeOrder(params);

      if (result.success) {
        setOrderSuccess(`${type.toUpperCase()} order placed!`);
        setTimeout(() => setOrderSuccess(null), 3000);
      } else {
        setOrderError(result.error || "Failed to place order");
      }

      setOrderLoading(false);
    },
    [
      symbol,
      volume,
      currentAsk,
      currentBid,
      stopLossPrice,
      takeProfitPrice,
      placeOrder,
    ]
  );

  const handleCloseOrder = useCallback(
    async (order: Order) => {
      // Use the current price from the order object (from backend) for symbols that don't match
      // Only use live prices for the currently selected symbol
      const closePrice =
        order.symbol === symbol
          ? order.type === "buy"
            ? currentBid
            : currentAsk
          : order.currentPrice;
      const result = await closeOrder(order._id, closePrice);

      if (!result.success) {
        setOrderError(result.error || "Failed to close order");
      }
    },
    [currentBid, currentAsk, closeOrder, symbol]
  );

  const formatPrice = (price: number) => {
    if (price === 0) return "—";
    return price.toFixed(5);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateProfit = (order: Order) => {
    // Only calculate profit for positions matching the current symbol
    // For other symbols, use the profit from the backend
    if (order.symbol !== symbol) {
      return order.profit;
    }

    // For the current symbol, use live prices for real-time updates
    const currentPrice = order.type === "buy" ? currentBid : currentAsk;
    const priceDiff =
      order.type === "buy"
        ? currentPrice - order.entryPrice
        : order.entryPrice - currentPrice;

    // Use correct contract size for the symbol
    const category = getCategoryFromSymbol(order.symbol);
    const contractSize = getContractSize(order.symbol, category);
    return priceDiff * order.volume * contractSize;
  };

  // Calculate total unrealized P&L from all open positions
  const totalUnrealizedPnL = orders.reduce(
    (sum, order) => sum + calculateProfit(order),
    0
  );

  // Calculate real equity and margin level using live prices
  const realEquity = account ? account.balance + totalUnrealizedPnL : 0;
  const realMarginLevel =
    account && account.margin > 0 ? (realEquity / account.margin) * 100 : 0;

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        onClick={onToggle}
        style={{ bottom: isOpen ? panelHeight : 0 }}
        className={`fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center
          w-16 h-6 rounded-t-lg transition-all duration-300 ease-out
          bg-white/10 backdrop-blur-md border border-white/20 border-b-0
          hover:bg-white/20 group`}
      >
        <svg
          className={`w-4 h-4 text-white/70 group-hover:text-white transition-transform duration-300 ${
            isOpen ? "rotate-0" : "rotate-180"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Bottom Panel */}
      <div
        style={{ height: panelHeight }}
        className={`fixed bottom-0 left-0 w-full z-40
          bg-linear-to-b from-[#1a1a24]/95 to-[#0d0d12]/98
          backdrop-blur-xl border-t border-white/10
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-y-0" : "translate-y-full"}
          flex flex-col shadow-2xl`}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className="absolute top-0 left-0 w-full h-1 cursor-ns-resize z-50 hover:bg-cyan-400/50 transition-colors bg-transparent"
        />

        {/* Header & Tabs */}
        <div className="px-4 border-b border-white/10 flex items-center justify-between shrink-0 h-12 bg-[#1a1a24]/50">
          <div className="flex items-center gap-6 h-full">
            {/* Navigation Tabs */}
            <div className="flex h-full">
              <button
                onClick={() => setActiveSection("trade")}
                className={`px-4 h-full text-xs font-medium uppercase tracking-wider transition-colors relative ${
                  activeSection === "trade"
                    ? "text-cyan-400 bg-white/5"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                Quick Trade
                {activeSection === "trade" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400" />
                )}
              </button>
              <button
                onClick={() => setActiveSection("account")}
                className={`px-4 h-full text-xs font-medium uppercase tracking-wider transition-colors relative ${
                  activeSection === "account"
                    ? "text-cyan-400 bg-white/5"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                Account
                {activeSection === "account" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400" />
                )}
              </button>
              <button
                onClick={() => setActiveSection("positions")}
                className={`px-4 h-full text-xs font-medium uppercase tracking-wider transition-colors relative ${
                  activeSection === "positions"
                    ? "text-cyan-400 bg-white/5"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                Positions
                <span
                  className={`ml-1.5 ${
                    activeSection === "positions"
                      ? "text-cyan-400/70"
                      : "text-white/20"
                  }`}
                >
                  {orders.length}
                </span>
                {activeSection === "positions" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400" />
                )}
              </button>
              <button
                onClick={() => setActiveSection("history")}
                className={`px-4 h-full text-xs font-medium uppercase tracking-wider transition-colors relative ${
                  activeSection === "history"
                    ? "text-cyan-400 bg-white/5"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                History
                <span
                  className={`ml-1.5 ${
                    activeSection === "history"
                      ? "text-cyan-400/70"
                      : "text-white/20"
                  }`}
                >
                  {history.length}
                </span>
                {activeSection === "history" && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400" />
                )}
              </button>
            </div>
          </div>

          <div className="text-xs text-white/30">
            Demo Trading • No Real Money
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Quick Trade Tab */}
          {activeSection === "trade" && (
            <div className="absolute inset-0 overflow-y-auto p-6">
              <div className="w-full">
                {/* Price Display */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 bg-linear-to-br from-red-500/10 to-red-600/5 rounded-xl p-4 border border-red-500/20 flex flex-col items-center justify-center">
                    <div className="text-xs text-red-400/70 mb-1 uppercase tracking-wider">
                      SELL (Bid)
                    </div>
                    <div className="text-3xl font-bold text-red-400 tabular-nums">
                      {formatPrice(currentBid)}
                    </div>
                  </div>
                  <div className="flex-1 bg-linear-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-4 border border-emerald-500/20 flex flex-col items-center justify-center">
                    <div className="text-xs text-emerald-400/70 mb-1 uppercase tracking-wider">
                      BUY (Ask)
                    </div>
                    <div className="text-3xl font-bold text-emerald-400 tabular-nums">
                      {formatPrice(currentAsk)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Volume Control */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-white/40 uppercase tracking-wider">
                        Volume (Lots)
                      </label>
                      <span className="text-xs text-white/40">
                        Spread:{" "}
                        <span className="text-white/70">
                          {spreadPips.toFixed(1)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onMouseDown={startVolumeDecrement}
                        onMouseUp={stopVolumeDecrement}
                        onMouseLeave={stopVolumeDecrement}
                        onTouchStart={startVolumeDecrement}
                        onTouchEnd={stopVolumeDecrement}
                        className="w-12 h-12 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center text-lg"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        min="0.01"
                        step="0.01"
                        className="flex-1 h-12 bg-white/5 border border-white/10 rounded-lg px-3 text-center text-xl text-white font-medium focus:border-cyan-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onMouseDown={startVolumeIncrement}
                        onMouseUp={stopVolumeIncrement}
                        onMouseLeave={stopVolumeIncrement}
                        onTouchStart={startVolumeIncrement}
                        onTouchEnd={stopVolumeIncrement}
                        className="w-12 h-12 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* SL/TP Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                        Stop Loss
                      </label>
                      <input
                        type="number"
                        value={stopLossPrice}
                        onChange={(e) => handleStopLossChange(e.target.value)}
                        placeholder="Optional"
                        step="0.00001"
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white placeholder-white/30 focus:border-red-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
                        Take Profit
                      </label>
                      <input
                        type="number"
                        value={takeProfitPrice}
                        onChange={(e) => handleTakeProfitChange(e.target.value)}
                        placeholder="Optional"
                        step="0.00001"
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Trade Buttons */}
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => handlePlaceOrder("sell")}
                    disabled={orderLoading || !account || !marketOpen}
                    className="flex-1 h-14 rounded-xl font-bold text-lg transition-all duration-200
                       bg-linear-to-b from-red-500 to-red-600 text-white
                       hover:from-red-400 hover:to-red-500 hover:shadow-lg hover:shadow-red-500/25
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    {orderLoading ? "Placing..." : "SELL"}
                  </button>
                  <button
                    onClick={() => handlePlaceOrder("buy")}
                    disabled={orderLoading || !account || !marketOpen}
                    className="flex-1 h-14 rounded-xl font-bold text-lg transition-all duration-200
                       bg-linear-to-b from-emerald-500 to-emerald-600 text-white
                       hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    {orderLoading ? "Placing..." : "BUY"}
                  </button>
                </div>

                {/* Messages */}
                {(orderError || orderSuccess) && (
                  <div
                    className={`mt-4 text-sm text-center font-medium ${
                      orderError ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {orderError || orderSuccess}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeSection === "account" && (
            <div className="absolute inset-0 overflow-y-auto p-6 items-start">
              <div className="w-full">
                {accountLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="spinner" />
                  </div>
                ) : account ? (
                  <div className="space-y-3">
                    <div className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/5">
                      <div className="text-sm text-white/40 uppercase tracking-wider font-medium">
                        Balance
                      </div>
                      <div className="text-xl font-bold text-white tracking-wide">
                        {formatMoney(account.balance)}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/5">
                      <div className="text-sm text-white/40 uppercase tracking-wider font-medium">
                        Equity
                      </div>
                      <div
                        className={`text-xl font-bold tracking-wide ${
                          realEquity >= account.balance
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatMoney(realEquity)}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/5">
                      <div className="text-sm text-white/40 uppercase tracking-wider font-medium">
                        Margin Level
                      </div>
                      <div className="text-xl font-bold text-white tracking-wide">
                        {realMarginLevel > 0
                          ? `${realMarginLevel.toFixed(0)}%`
                          : "—"}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/5 relative group">
                      <div className="text-sm text-white/40 uppercase tracking-wider font-medium">
                        Leverage
                      </div>
                      <div className="text-xl font-bold text-cyan-400 tracking-wide flex items-center gap-2">
                        <span>1:{account.leverage}</span>
                        <svg
                          className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                        <select
                          value={
                            isAutoLeverage
                              ? "auto"
                              : account.leverage.toString()
                          }
                          onChange={handleLeverageChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                          <option value="auto">Auto (1:{autoLeverage})</option>
                          {[1, 2, 5, 10, 15, 20, 30, 50, 100, 200, 300, 400, 500, 1000].map((lev) => (
                            <option key={lev} value={lev}>
                              1:{lev}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-lg text-white/50 text-center py-12">
                    Please login to view account details
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Positions Tab */}
          {activeSection === "positions" && (
            <div className="absolute inset-0 overflow-y-auto p-4">
              {orders.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-white/20 text-sm">No open positions</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {orders.map((order) => {
                    const profit = calculateProfit(order);
                    const isProfit = profit >= 0;

                    return (
                      <div
                        key={order._id}
                        className="bg-white/5 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-md ${
                                order.type === "buy"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {order.type.toUpperCase()}
                            </span>
                            <span className="text-base font-bold text-white">
                              {order.symbol}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-white/50">
                            {order.volume} lots
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <div className="text-xs text-white/40 mb-1">
                              Entry Price
                            </div>
                            <div className="text-sm text-white/90 font-mono">
                              {formatPrice(order.entryPrice)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-white/40 mb-1">
                              Profit/Loss
                            </div>
                            <div
                              className={`text-sm font-bold font-mono ${
                                isProfit ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {isProfit ? "+" : ""}
                              {formatMoney(profit)}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCloseOrder(order)}
                          className="w-full h-9 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white/60 hover:text-white transition-colors uppercase tracking-wider"
                        >
                          Close Position
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeSection === "history" && (
            <div className="absolute inset-0 overflow-y-auto p-4">
              {history.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-white/20 text-sm">No trade history</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((order) => {
                    const isProfit = order.profit >= 0;
                    return (
                      <div
                        key={order._id}
                        className="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors opacity-75 hover:opacity-100 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase ${
                              order.type === "buy"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {order.type}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {order.symbol}
                          </span>
                          <span className="text-xs text-white/40">
                            {order.volume} lots
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-xs text-white/30 hidden sm:block">
                            {new Date(
                              order.closedAt || order.createdAt
                            ).toLocaleDateString()}
                          </span>
                          <div
                            className={`text-sm font-bold font-mono ${
                              isProfit ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isProfit ? "+" : ""}
                            {formatMoney(order.profit)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
