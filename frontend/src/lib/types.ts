// Timeframe types
export type Timeframe =
  | "M1"
  | "M5"
  | "M15"
  | "M30"
  | "H1"
  | "H4"
  | "D1"
  | "W1"
  | "MN1";

export interface TimeframeOption {
  value: Timeframe;
  label: string;
}

export const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { value: "M1", label: "1m" },
  { value: "M5", label: "5m" },
  { value: "M15", label: "15m" },
  { value: "M30", label: "30m" },
  { value: "H1", label: "1h" },
  { value: "H4", label: "4h" },
  { value: "D1", label: "1D" },
  { value: "W1", label: "1W" },
  { value: "MN1", label: "1M" },
];

// Candle data
export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Quote data
export interface QuoteData {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

// Symbol data
export interface SymbolInfo {
  symbol: string;
  description: string;
  type: string;
  category: string;
  change_percentage?: number;
}

export interface SymbolCategory {
  [category: string]: SymbolInfo[];
}

// API Response types
export interface HistoryResponse {
  data: CandleData[];
}

export interface AvailableSymbolsResponse {
  data: SymbolCategory;
  categories: string[];
}
