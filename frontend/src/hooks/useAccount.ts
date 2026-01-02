import { useState, useEffect, useCallback } from "react";

export type AccountMode = 'live' | 'demo';

export interface AccountData {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
  leverage: number;
  isAutoLeverage: boolean;
  mode: AccountMode;
}

export function useAccount() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AccountMode>('live');
  const [switchingMode, setSwitchingMode] = useState(false);

  const fetchAccount = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/trading/account");

      if (!response.ok) {
        if (response.status === 401) {
          setAccount(null);
          return;
        }
        throw new Error("Failed to fetch account");
      }

      const data = await response.json();
      console.log("[useAccount] Fetched account:", { mode: data.mode, balance: data.balance });
      setAccount(data);
      if (data.mode) {
        setMode(data.mode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetAccount = useCallback(
    async (initialBalance = 10000, leverage = 30) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/trading/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initialBalance, leverage }),
        });

        if (!response.ok) {
          throw new Error("Failed to reset account");
        }

        await fetchAccount();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [fetchAccount]
  );

  const updateLeverage = useCallback(
    async (leverage: number, isAutoLeverage?: boolean) => {
      try {
        setError(null);

        const body: { leverage: number; isAutoLeverage?: boolean } = { leverage };
        if (typeof isAutoLeverage === 'boolean') {
          body.isAutoLeverage = isAutoLeverage;
        }

        console.log("[useAccount] Updating leverage:", body);

        const response = await fetch("/api/trading/account/leverage", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[useAccount] Leverage update failed:", response.status, errorData);
          throw new Error(errorData.error || "Failed to update leverage");
        }

        const result = await response.json();
        console.log("[useAccount] Leverage updated successfully:", result);

        await fetchAccount();
        return true;
      } catch (err) {
        console.error("[useAccount] Leverage update error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      }
    },
    [fetchAccount]
  );

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchAccount, 5000);
    return () => clearInterval(interval);
  }, [fetchAccount]);

  const switchMode = useCallback(
    async (newMode: AccountMode) => {
      try {
        setSwitchingMode(true);
        setError(null);

        console.log("[useAccount] Switching to mode:", newMode);

        const response = await fetch("/api/trading/accounts/mode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: newMode }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[useAccount] Mode switch failed:", response.status, errorData);
          throw new Error("Failed to switch account mode");
        }

        const data = await response.json();
        console.log("[useAccount] Mode switch response:", data);
        
        // Set mode immediately from the switch response
        setMode(data.mode);
        
        // Small delay to ensure database consistency before fetching
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Refresh account data to get the new account's balance
        await fetchAccount();
        
        console.log("[useAccount] Mode switch complete, current mode:", data.mode);
        return true;
      } catch (err) {
        console.error("[useAccount] Mode switch error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      } finally {
        setSwitchingMode(false);
      }
    },
    [fetchAccount]
  );

  return {
    account,
    loading,
    error,
    mode,
    switchingMode,
    refresh: fetchAccount,
    resetAccount,
    updateLeverage,
    switchMode,
  };
}
