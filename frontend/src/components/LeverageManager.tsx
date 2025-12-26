'use client';

import { useEffect } from 'react';
import { useAccount } from '@/hooks/useAccount';
import { useSymbolInfo } from '@/hooks/useSymbolInfo';
import { getLeverageForSymbol } from '@/lib/leverage';

interface LeverageManagerProps {
  symbol: string;
}

/**
 * Component that automatically manages account leverage based on selected symbol
 * This ensures leverage is applied globally according to asset category regulations
 */
export function LeverageManager({ symbol }: LeverageManagerProps) {
  const { account, updateLeverage } = useAccount();
  const symbolInfo = useSymbolInfo(symbol);

  useEffect(() => {
    if (!account || !symbolInfo) return;

    // Calculate the appropriate leverage for this symbol
    const appropriateLeverage = getLeverageForSymbol(
      symbol,
      symbolInfo.category
    );

    // Only update if leverage has changed
    if (account.leverage !== appropriateLeverage) {
      updateLeverage(appropriateLeverage);
    }
  }, [symbol, symbolInfo, account, updateLeverage]);

  // This component doesn't render anything
  return null;
}

