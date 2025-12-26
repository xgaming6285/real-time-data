import { useState, useEffect, useCallback } from 'react';

export interface AccountData {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
  leverage: number;
}

export function useAccount() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/trading/account');
      
      if (!response.ok) {
        if (response.status === 401) {
          setAccount(null);
          return;
        }
        throw new Error('Failed to fetch account');
      }
      
      const data = await response.json();
      setAccount(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetAccount = useCallback(async (initialBalance = 10000, leverage = 100) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/trading/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialBalance, leverage }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset account');
      }
      
      await fetchAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchAccount]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchAccount, 5000);
    return () => clearInterval(interval);
  }, [fetchAccount]);

  return {
    account,
    loading,
    error,
    refresh: fetchAccount,
    resetAccount,
  };
}

