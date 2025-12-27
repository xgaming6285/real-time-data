import { Timeframe, CandleData, QuoteData, SymbolCategory } from "./types";

// API base URL - adjust this to match your backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

/**
 * Fetch historical candle data for a symbol
 */
export async function fetchHistory(
  symbol: string,
  timeframe: Timeframe,
  limit: number = 1000,
  signal?: AbortSignal
): Promise<{ data: CandleData[] }> {
  // Validate symbol is not empty
  if (!symbol || symbol.trim() === "") {
    console.error("fetchHistory called with empty symbol:", symbol);
    throw new Error("Symbol is required for history fetch");
  }

  // URL encode the symbol to handle special characters like # which are treated as fragments
  const encodedSymbol = encodeURIComponent(symbol);
  const url = `${API_BASE_URL}/history/${encodedSymbol}?timeframe=${timeframe}&limit=${limit}`;

  const response = await fetch(url, { 
    signal,
    headers: {
      'ngrok-skip-browser-warning': '69420',
      'User-Agent': 'AtlasX-Trading-Platform'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch history: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch current quote for a symbol
 */
export async function fetchQuote(symbol: string): Promise<QuoteData> {
  // Validate symbol is not empty
  if (!symbol || symbol.trim() === "") {
    console.error("fetchQuote called with empty symbol:", symbol);
    throw new Error("Symbol is required for quote fetch");
  }

  // URL encode the symbol to handle special characters like # which are treated as fragments
  const encodedSymbol = encodeURIComponent(symbol);
  const url = `${API_BASE_URL}/quote/${encodedSymbol}`;

  const response = await fetch(url, {
    headers: {
      'ngrok-skip-browser-warning': '69420',
      'User-Agent': 'AtlasX-Trading-Platform'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch quote: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform the API response to match our QuoteData interface
  return {
    symbol: data.symbol,
    bid: data.bid,
    ask: data.ask,
    spread: data.ask - data.bid,
    timestamp: data.time_msc || data.time * 1000,
    market_open: data.market_open,
  };
}

/**
 * Fetch available symbols
 */
export async function fetchAvailableSymbols(): Promise<{
  data: SymbolCategory;
  categories: string[];
}> {
  const url = `${API_BASE_URL}/available-symbols`;

  const response = await fetch(url, {
    headers: {
      'ngrok-skip-browser-warning': '69420',
      'User-Agent': 'AtlasX-Trading-Platform'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch symbols: ${response.statusText}`);
  }

  return response.json();
}
