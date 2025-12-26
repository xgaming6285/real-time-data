"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchHistory, fetchQuote } from "@/lib/api";
import { CandleData, QuoteData, Timeframe } from "@/lib/types";

interface UseMarketDataOptions {
  symbol: string;
  timeframe: Timeframe;
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

export function useMarketData({
  symbol,
  timeframe,
  autoRefresh = true,
  refreshInterval = 1000,
  limit = 1000,
}: UseMarketDataOptions) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const pollInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(
    async (isPolling = false) => {
      // If polling and previous request is still running, skip this poll
      if (isPolling && pollInProgressRef.current) {
        return;
      }

      // Cancel previous request if strictly necessary?
      // Usually only on timeframe change, but we handle that in useEffect cleanup.
      // Here we just want to avoid overlapping polls.

      if (isPolling) {
        pollInProgressRef.current = true;
      } else {
        // If it's a manual load (initial or refresh), cancel any existing
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
      }

      const signal = abortControllerRef.current?.signal;

      try {
        const data = await fetchHistory(symbol, timeframe, limit, signal);
        if (mountedRef.current) {
          setCandles(data.data);
          setError(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Ignore abort errors
          return;
        }
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          // If data load fails, maybe clear candles to avoid showing stale data with error?
          // But better to keep stale data usually.
        }
      } finally {
        if (isPolling) {
          pollInProgressRef.current = false;
        }
      }
    },
    [symbol, timeframe, limit]
  );

  const loadQuote = useCallback(async () => {
    try {
      const data = await fetchQuote(symbol);
      if (mountedRef.current) {
        setQuote(data);
      }
    } catch (err) {
      console.warn("Quote fetch failed:", err);
    }
  }, [symbol]);

  // Initial load when symbol or timeframe changes
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setCandles([]); // Clear old candles immediately
    setError(null);
    pollInProgressRef.current = false;

    // Create new controller for this effect lifecycle
    const controller = new AbortController();
    abortControllerRef.current = controller;

    Promise.all([
      fetchHistory(symbol, timeframe, limit, controller.signal)
        .then((data) => {
          if (mountedRef.current) {
            setCandles(data.data);
            setError(null);
          }
        })
        .catch((err) => {
          if (err.name !== "AbortError" && mountedRef.current) {
            setError(
              err instanceof Error ? err.message : "Failed to load data"
            );
          }
        }),
      loadQuote(),
    ]).finally(() => {
      if (mountedRef.current) {
        setLoading(false);
      }
    });

    return () => {
      // Cancel pending request on unmount or change
      controller.abort();
    };
  }, [symbol, timeframe, loadQuote, limit]);

  // Auto-refresh for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      loadQuote();
      // Refresh candles less frequently for performance
      if (timeframe === "M1") {
        loadHistory(true);
      }
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, loadQuote, loadHistory, timeframe]);

  const refresh = useCallback(() => {
    loadHistory(false);
    loadQuote();
  }, [loadHistory, loadQuote]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    candles,
    quote,
    loading,
    error,
    refresh,
  };
}
