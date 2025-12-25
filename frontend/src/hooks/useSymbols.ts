'use client';

import { useState, useEffect } from 'react';
import { fetchAvailableSymbols } from '@/lib/api';
import { SymbolInfo, SymbolCategory } from '@/lib/types';

export function useSymbols() {
  const [symbols, setSymbols] = useState<SymbolCategory>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await fetchAvailableSymbols();
        if (mounted) {
          setSymbols(data.data);
          setCategories(data.categories);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load symbols');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const searchSymbols = (query: string): SymbolInfo[] => {
    if (!query.trim()) return [];
    
    const normalizedQuery = query.toLowerCase();
    const results: SymbolInfo[] = [];

    Object.values(symbols).forEach((categorySymbols) => {
      categorySymbols.forEach((sym) => {
        if (
          sym.symbol.toLowerCase().includes(normalizedQuery) ||
          sym.description.toLowerCase().includes(normalizedQuery)
        ) {
          results.push(sym);
        }
      });
    });

    return results.slice(0, 20); // Limit results for performance
  };

  return {
    symbols,
    categories,
    loading,
    error,
    searchSymbols,
  };
}

