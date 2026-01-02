"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "@/hooks/useAccount";
import { useSymbolInfo } from "@/hooks/useSymbolInfo";
import { getLeverageForSymbol } from "@/lib/leverage";

interface LeverageManagerProps {
  symbol: string;
  enabled?: boolean;
}

/**
 * Component that automatically manages account leverage based on selected symbol
 * This ensures leverage is applied globally according to asset category regulations
 * Only active when user has selected "Auto" leverage mode
 */
export function LeverageManager({ symbol, enabled = true }: LeverageManagerProps) {
  const { account, updateLeverage } = useAccount();
  const symbolInfo = useSymbolInfo(symbol);
  const prevSymbolRef = useRef<string | null>(null);

  useEffect(() => {
    // Only update when auto-leverage is enabled
    if (!account || !symbolInfo || !enabled) return;

    // Only update leverage when symbol actually changes (not on initial load)
    // This prevents overwriting the user's saved leverage on page load
    if (prevSymbolRef.current === null) {
      prevSymbolRef.current = symbol;
      return;
    }

    // Skip if symbol hasn't changed
    if (prevSymbolRef.current === symbol) return;
    
    prevSymbolRef.current = symbol;

    // Calculate the appropriate leverage for this symbol
    const appropriateLeverage = getLeverageForSymbol(
      symbol,
      0, // Base leverage
      symbolInfo.category
    );

    // Only update if leverage has changed
    if (account.leverage !== appropriateLeverage) {
      // Update leverage and keep isAutoLeverage as true
      updateLeverage(appropriateLeverage, true);
    }
  }, [symbol, symbolInfo, account, updateLeverage, enabled]);

  // This component doesn't render anything
  return null;
}
