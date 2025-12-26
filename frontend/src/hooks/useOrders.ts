import { useState, useEffect, useCallback } from 'react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (status: 'open' | 'closed' | 'all' = 'open') => {
    try {
      setError(null);
      const response = await fetch(`/api/trading/orders?status=${status}`);
      
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
      await fetchOrders('open');
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
      
      // Refresh orders list
      await fetchOrders('open');
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [fetchOrders]);

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
      await fetchOrders('open');
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders('open');
  }, [fetchOrders]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchOrders('open'), 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refresh: fetchOrders,
    placeOrder,
    closeOrder,
    modifyOrder,
  };
}

