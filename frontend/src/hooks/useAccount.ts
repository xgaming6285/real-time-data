import { useState, useEffect, useCallback } from "react";

export type AccountMode = 'live' | 'demo';

export interface TradingAccountInfo {
  _id: string;
  name: string;
  accountNumber: string;
  color?: string;
}

export interface TradingAccountWithBalances extends TradingAccountInfo {
  isActive: boolean;
  createdAt: string;
  balances: {
    live: { balance: number; equity: number; leverage: number };
    demo: { balance: number; equity: number; leverage: number };
  };
}

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
  tradingAccount?: TradingAccountInfo;
}

export function useAccount() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [tradingAccounts, setTradingAccounts] = useState<TradingAccountWithBalances[]>([]);
  const [activeTradingAccount, setActiveTradingAccount] = useState<TradingAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AccountMode>('live');
  const [switchingMode, setSwitchingMode] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  const fetchAccount = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/trading/account");

      if (!response.ok) {
        if (response.status === 401) {
          setAccount(null);
          setTradingAccounts([]);
          setActiveTradingAccount(null);
          return;
        }
        throw new Error("Failed to fetch account");
      }

      const data = await response.json();
      setAccount(data);
      if (data.mode) {
        setMode(data.mode);
      }
      if (data.tradingAccount) {
        setActiveTradingAccount(data.tradingAccount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTradingAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/trading/accounts");
      
      if (!response.ok) {
        if (response.status === 401) {
          setTradingAccounts([]);
          return;
        }
        throw new Error("Failed to fetch trading accounts");
      }

      const data = await response.json();
      console.log("[useAccount] Fetched trading accounts:", data.accounts?.length);
      setTradingAccounts(data.accounts || []);
      
      // Update active trading account from the list
      const active = data.accounts?.find((a: TradingAccountWithBalances) => a.isActive);
      if (active) {
        setActiveTradingAccount({
          _id: active._id,
          name: active.name,
          accountNumber: active.accountNumber,
          color: active.color,
        });
      }
    } catch (err) {
      console.error("[useAccount] Failed to fetch trading accounts:", err);
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
        await fetchTradingAccounts();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [fetchAccount, fetchTradingAccounts]
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
    fetchTradingAccounts();
  }, [fetchAccount, fetchTradingAccounts]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAccount, 30000);
    return () => clearInterval(interval);
  }, [fetchAccount]);

  // Switch between live/demo mode within the current trading account
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
        await fetchTradingAccounts();
        
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
    [fetchAccount, fetchTradingAccounts]
  );

  // Switch to a different trading account
  const switchTradingAccount = useCallback(
    async (accountId: string) => {
      try {
        setSwitchingAccount(true);
        setError(null);

        console.log("[useAccount] Switching to trading account:", accountId);

        const response = await fetch("/api/trading/accounts/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[useAccount] Account switch failed:", response.status, errorData);
          throw new Error(errorData.error || "Failed to switch trading account");
        }

        const data = await response.json();
        console.log("[useAccount] Account switch response:", data);
        
        // Update the active trading account
        if (data.account) {
          setActiveTradingAccount({
            _id: data.account._id,
            name: data.account.name,
            accountNumber: data.account.accountNumber,
            color: data.account.color,
          });
        }
        
        // Update mode from the response
        if (data.account?.mode) {
          setMode(data.account.mode);
        }
        
        // Refresh all data
        await fetchAccount();
        await fetchTradingAccounts();
        
        return true;
      } catch (err) {
        console.error("[useAccount] Account switch error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      } finally {
        setSwitchingAccount(false);
      }
    },
    [fetchAccount, fetchTradingAccounts]
  );

  // Create a new trading account
  const createTradingAccount = useCallback(
    async (name: string, color?: string) => {
      try {
        setError(null);

        console.log("[useAccount] Creating trading account:", name);

        const response = await fetch("/api/trading/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[useAccount] Account creation failed:", response.status, errorData);
          throw new Error(errorData.error || "Failed to create trading account");
        }

        const data = await response.json();
        console.log("[useAccount] Account created:", data);
        
        // Refresh the trading accounts list
        await fetchTradingAccounts();
        
        return { success: true, account: data.account };
      } catch (err) {
        console.error("[useAccount] Account creation error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [fetchTradingAccounts]
  );

  // Transfer funds between trading accounts
  const transferFunds = useCallback(
    async (fromAccountId: string, toAccountId: string, amount: number, transferMode: AccountMode) => {
      try {
        setError(null);

        console.log("[useAccount] Transferring funds:", { fromAccountId, toAccountId, amount, mode: transferMode });

        const response = await fetch("/api/trading/accounts/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            fromAccountId, 
            toAccountId, 
            amount, 
            mode: transferMode 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[useAccount] Transfer failed:", response.status, errorData);
          throw new Error(errorData.error || "Failed to transfer funds");
        }

        const data = await response.json();
        console.log("[useAccount] Transfer successful:", data);
        
        // Refresh all data
        await fetchAccount();
        await fetchTradingAccounts();
        
        return { success: true, transfer: data.transfer };
      } catch (err) {
        console.error("[useAccount] Transfer error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [fetchAccount, fetchTradingAccounts]
  );

  // Update a trading account (name, color)
  const updateTradingAccount = useCallback(
    async (accountId: string, updates: { name?: string; color?: string }) => {
      try {
        setError(null);

        console.log("[useAccount] Updating trading account:", accountId, updates);

        const response = await fetch(`/api/trading/accounts/${accountId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[useAccount] Update failed:", response.status, errorData);
          throw new Error(errorData.error || "Failed to update trading account");
        }

        const data = await response.json();
        console.log("[useAccount] Update successful:", data);
        
        // Refresh the trading accounts list
        await fetchTradingAccounts();
        
        return { success: true, account: data.account };
      } catch (err) {
        console.error("[useAccount] Update error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [fetchTradingAccounts]
  );

  // Delete a trading account
  const deleteTradingAccount = useCallback(
    async (accountId: string) => {
      try {
        setError(null);

        console.log("[useAccount] Deleting trading account:", accountId);

        const response = await fetch(`/api/trading/accounts/${accountId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[useAccount] Delete failed:", response.status, errorData);
          throw new Error(errorData.error || "Failed to delete trading account");
        }

        console.log("[useAccount] Delete successful");
        
        // Refresh all data
        await fetchAccount();
        await fetchTradingAccounts();
        
        return { success: true };
      } catch (err) {
        console.error("[useAccount] Delete error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [fetchAccount, fetchTradingAccounts]
  );

  return {
    account,
    tradingAccounts,
    activeTradingAccount,
    loading,
    error,
    mode,
    switchingMode,
    switchingAccount,
    refresh: fetchAccount,
    refreshTradingAccounts: fetchTradingAccounts,
    resetAccount,
    updateLeverage,
    switchMode,
    switchTradingAccount,
    createTradingAccount,
    updateTradingAccount,
    deleteTradingAccount,
    transferFunds,
  };
}
