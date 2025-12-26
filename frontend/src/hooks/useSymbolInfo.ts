import { useMemo } from 'react';
import { useSymbols } from './useSymbols';
import { SymbolInfo } from '@/lib/types';
import { getCategoryFromSymbol } from '@/lib/leverage';

/**
 * Hook to get symbol information including category
 */
export function useSymbolInfo(symbol: string): SymbolInfo | null {
  const { symbols, loading } = useSymbols();

  return useMemo(() => {
    // Search through all categories to find the symbol
    for (const [category, symbolsList] of Object.entries(symbols)) {
      const found = symbolsList.find((s) => s.symbol === symbol);
      if (found) {
        // Add the category to the symbol info since it's not in the original object
        return {
          ...found,
          category, // Add category from the object key
        };
      }
    }

    // If not found, create a fallback with inferred category
    const inferredCategory = getCategoryFromSymbol(symbol);
    
    return {
      symbol,
      description: symbol,
      type: 'Unknown',
      category: inferredCategory,
    };
  }, [symbol, symbols, loading]);
}

