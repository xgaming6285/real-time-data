import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from './useAccount';

export interface Order {
  _id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  status: 'open' | 'closed' | 'cancelled';
  profit: number;
  closePrice: number | null;
  margin: number;
  createdAt: string;
  closedAt: string | null;
}

export interface PlaceOrderParams {
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get account info to trigger refetch when account/mode changes
  const { activeTradingAccount, mode } = useAccount();
  
  // Create a stable key that changes when account or mode changes
  const accountKey = `${activeTradingAccount?._id || 'none'}-${mode}`;
  const prevAccountKeyRef = useRef(accountKey);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/trading/orders?status=open');
      
      if (!response.ok) {
        if (response.status === 401) {
          setOrders([]);
          return;
        }
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/trading/orders?status=closed');
      
      if (!response.ok) {
        if (response.status === 401) {
          setHistory([]);
          return;
        }
        throw new Error('Failed to fetch history');
      }
      
      const data = await response.json();
      setHistory(data.orders);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, []);

  const placeOrder = useCallback(async (params: PlaceOrderParams): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to place order' };
      }
      
      // Refresh orders list
      await fetchOrders();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [fetchOrders]);

  const closeOrder = useCallback(async (orderId: string, closePrice: number): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/trading/orders/${orderId}?closePrice=${closePrice}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to close order' };
      }
      
      // Refresh orders and history
      await Promise.all([fetchOrders(), fetchHistory()]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [fetchOrders, fetchHistory]);

  const modifyOrder = useCallback(async (
    orderId: string, 
    updates: { stopLoss?: number | null; takeProfit?: number | null }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/trading/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to modify order' };
      }
      
      // Refresh orders list
      await fetchOrders();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [fetchOrders]);

  // Initial fetch
  useEffect(() => {
    fetchOrders();
    fetchHistory();
  }, [fetchOrders, fetchHistory]);

  // Refetch when account or mode changes
  useEffect(() => {
    if (accountKey !== prevAccountKeyRef.current) {
      console.log('[useOrders] Account changed, refetching orders...', accountKey);
      prevAccountKeyRef.current = accountKey;
      // Clear existing data immediately for a cleaner transition
      setOrders([]);
      setHistory([]);
      setLoading(true);
      // Fetch new data
      fetchOrders();
      fetchHistory();
    }
  }, [accountKey, fetchOrders, fetchHistory]);

  // Auto-refresh every 10 seconds (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return {
    orders,
    history,
    loading,
    error,
    refresh: fetchOrders,
    refreshHistory: fetchHistory,
    placeOrder,
    closeOrder,
    modifyOrder,
  };
}
