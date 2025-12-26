"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAccount } from "@/hooks/useAccount";
import { useOrders, Order, PlaceOrderParams } from "@/hooks/useOrders";
import { getContractSize, getCategoryFromSymbol } from "@/lib/leverage";

interface TradingSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  symbol: string;
  currentBid: number;
  currentAsk: number;
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
}: TradingSidebarProps) {
  const { account, loading: accountLoading } = useAccount();
  const { orders, placeOrder, closeOrder } = useOrders();

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
        className={`fixed top-1/2 -translate-y-1/2 z-50 flex items-center justify-center
          w-8 h-20 rounded-l-lg transition-all duration-300 ease-out
          bg-white/10 backdrop-blur-md border border-white/20 border-r-0
          hover:bg-white/20 hover:w-10 group
          ${isOpen ? "right-[380px]" : "right-0"}`}
      >
        <svg
          className={`w-4 h-4 text-white/70 group-hover:text-white transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[380px] z-40
          bg-linear-to-b from-[#1a1a24]/95 to-[#0d0d12]/98
          backdrop-blur-xl border-l border-white/10
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              Trade
            </h2>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-white/5 text-xs font-medium text-white/70">
                {symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Account Summary */}
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
              Account
            </h3>

            {accountLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="spinner" />
              </div>
            ) : account ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/40 mb-1">Balance</div>
                  <div className="text-sm font-semibold text-white">
                    {formatMoney(account.balance)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/40 mb-1">Equity</div>
                  <div
                    className={`text-sm font-semibold ${
                      realEquity >= account.balance
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatMoney(realEquity)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/40 mb-1">Margin Level</div>
                  <div className="text-sm font-semibold text-white">
                    {realMarginLevel > 0
                      ? `${realMarginLevel.toFixed(0)}%`
                      : "—"}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/40 mb-1">Leverage</div>
                  <div className="text-sm font-semibold text-cyan-400">
                    1:{account.leverage}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/50 text-center py-4">
                Login to view account
              </div>
            )}
          </div>

          {/* Quick Trade Panel */}
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
              Quick Trade
            </h3>

            {/* Price Display */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-linear-to-br from-red-500/10 to-red-600/5 rounded-lg p-3 border border-red-500/20">
                <div className="text-xs text-red-400/70 mb-0.5">SELL (Bid)</div>
                <div className="text-xl font-bold text-red-400 tabular-nums">
                  {formatPrice(currentBid)}
                </div>
              </div>
              <div className="flex-1 bg-linear-to-br from-emerald-500/10 to-emerald-600/5 rounded-lg p-3 border border-emerald-500/20">
                <div className="text-xs text-emerald-400/70 mb-0.5">
                  BUY (Ask)
                </div>
                <div className="text-xl font-bold text-emerald-400 tabular-nums">
                  {formatPrice(currentAsk)}
                </div>
              </div>
            </div>

            {/* Spread */}
            <div className="text-center mb-4">
              <span className="text-xs text-white/40">Spread: </span>
              <span className="text-xs font-medium text-white/70">
                {spreadPips.toFixed(1)} pips
              </span>
            </div>

            {/* Volume Input */}
            <div className="mb-4">
              <label className="block text-xs text-white/40 mb-1.5">
                Volume (Lots)
              </label>
              <div className="flex items-center gap-2">
                <button
                  onMouseDown={startVolumeDecrement}
                  onMouseUp={stopVolumeDecrement}
                  onMouseLeave={stopVolumeDecrement}
                  onTouchStart={startVolumeDecrement}
                  onTouchEnd={stopVolumeDecrement}
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <input
                  type="number"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="flex-1 h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-center text-white font-medium focus:border-cyan-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onMouseDown={startVolumeIncrement}
                  onMouseUp={stopVolumeIncrement}
                  onMouseLeave={stopVolumeIncrement}
                  onTouchStart={startVolumeIncrement}
                  onTouchEnd={stopVolumeIncrement}
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* SL/TP Inputs */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">
                  Stop Loss
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onMouseDown={startStopLossDecrement}
                    onMouseUp={stopStopLossDecrement}
                    onMouseLeave={stopStopLossDecrement}
                    onTouchStart={startStopLossDecrement}
                    onTouchEnd={stopStopLossDecrement}
                    className="w-6 h-9 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center text-xs"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={stopLossPrice}
                    onChange={(e) => handleStopLossChange(e.target.value)}
                    placeholder="Optional"
                    step="0.00001"
                    className="flex-1 min-w-0 h-9 bg-white/5 border border-white/10 rounded-md px-2 text-xs text-white placeholder-white/30 focus:border-red-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onMouseDown={startStopLossIncrement}
                    onMouseUp={stopStopLossIncrement}
                    onMouseLeave={stopStopLossIncrement}
                    onTouchStart={startStopLossIncrement}
                    onTouchEnd={stopStopLossIncrement}
                    className="w-6 h-9 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">
                  Take Profit
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onMouseDown={startTakeProfitDecrement}
                    onMouseUp={stopTakeProfitDecrement}
                    onMouseLeave={stopTakeProfitDecrement}
                    onTouchStart={startTakeProfitDecrement}
                    onTouchEnd={stopTakeProfitDecrement}
                    className="w-6 h-9 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center text-xs"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={takeProfitPrice}
                    onChange={(e) => handleTakeProfitChange(e.target.value)}
                    placeholder="Optional"
                    step="0.00001"
                    className="flex-1 min-w-0 h-9 bg-white/5 border border-white/10 rounded-md px-2 text-xs text-white placeholder-white/30 focus:border-emerald-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onMouseDown={startTakeProfitIncrement}
                    onMouseUp={stopTakeProfitIncrement}
                    onMouseLeave={stopTakeProfitIncrement}
                    onTouchStart={startTakeProfitIncrement}
                    onTouchEnd={stopTakeProfitIncrement}
                    className="w-6 h-9 rounded-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Error/Success Messages */}
            {orderError && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {orderError}
              </div>
            )}
            {orderSuccess && (
              <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                {orderSuccess}
              </div>
            )}

            {/* Trade Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePlaceOrder("sell")}
                disabled={orderLoading || !account}
                className="flex-1 h-12 rounded-lg font-semibold text-sm transition-all duration-200
                  bg-linear-to-b from-red-500 to-red-600 text-white
                  hover:from-red-400 hover:to-red-500 hover:shadow-lg hover:shadow-red-500/25
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                  active:scale-[0.98]"
              >
                {orderLoading ? "Placing..." : "SELL"}
              </button>
              <button
                onClick={() => handlePlaceOrder("buy")}
                disabled={orderLoading || !account}
                className="flex-1 h-12 rounded-lg font-semibold text-sm transition-all duration-200
                  bg-linear-to-b from-emerald-500 to-emerald-600 text-white
                  hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                  active:scale-[0.98]"
              >
                {orderLoading ? "Placing..." : "BUY"}
              </button>
            </div>
          </div>

          {/* Open Positions */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Open Positions
              </h3>
              <span className="text-xs text-white/30">
                {orders.length} open
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-white/20 text-sm">No open positions</div>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => {
                  const profit = calculateProfit(order);
                  const isProfit = profit >= 0;

                  return (
                    <div
                      key={order._id}
                      className="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              order.type === "buy"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {order.type.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {order.symbol}
                          </span>
                        </div>
                        <span className="text-xs text-white/40">
                          {order.volume} lots
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-white/40">
                          Entry:{" "}
                          <span className="text-white/70">
                            {formatPrice(order.entryPrice)}
                          </span>
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            isProfit ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isProfit ? "+" : ""}
                          {formatMoney(profit)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCloseOrder(order)}
                        className="w-full h-8 rounded-md bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white transition-colors"
                      >
                        Close Position
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/5 bg-black/20">
          <div className="text-xs text-white/30 text-center">
            Demo Trading • No Real Money
          </div>
        </div>
      </div>
    </>
  );
}
