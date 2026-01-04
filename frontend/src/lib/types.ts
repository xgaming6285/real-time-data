// Chart type
export type ChartType = "candlestick" | "bar" | "line";

export interface ChartTypeOption {
  value: ChartType;
  label: string;
  icon: string;
}

export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  { value: "candlestick", label: "Candlestick", icon: "📊" },
  { value: "bar", label: "Bar", icon: "📈" },
  { value: "line", label: "Line", icon: "📉" },
];

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
  { value: "M1", label: "M1" },
  { value: "M5", label: "M5" },
  { value: "M15", label: "M15" },
  { value: "M30", label: "M30" },
  { value: "H1", label: "H1" },
  { value: "H4", label: "H4" },
  { value: "D1", label: "D1" },
  { value: "W1", label: "W1" },
  { value: "MN1", label: "MN1" },
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
  market_open?: boolean;
}

// Symbol data
export interface SymbolInfo {
  symbol: string;
  description: string;
  type: string;
  category: string;
  change_percentage?: number;
  market_open?: boolean;
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

// Indicator types
export interface IndicatorConfig {
  period?: number;
  color?: string;
  lineWidth?: number;
  type?: "SMA" | "EMA" | "WMA"; // For Moving Average
  source?: "close" | "open" | "high" | "low";
  // RSI specific
  overbought?: number;
  oversold?: number;
  middle?: number;
  // ZigZag specific
  deviation?: number;
  depth?: number;
  // MACD specific
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  // Stochastic Oscillator specific
  kPeriod?: number;
  dPeriod?: number;
  slowing?: number;
  [key: string]: string | number | boolean | undefined;
}

// Drawing types
export interface Point {
  time: number | string; // Matches lightweight-charts Time type
  price: number;
}

export interface DrawingConfig {
  color?: string;
  lineWidth?: number;
}

export interface Drawing {
  id: string;
  type: string;
  points: Point[];
  symbol: string;
  config?: DrawingConfig;
}

// Indicator that displays in a separate pane (like RSI, MACD, etc.)
export const PANE_INDICATORS = [
  "RSI",
  "MACD",
  "Stochastic Oscillator",
  "CCI",
  "Momentum",
];

export interface ActiveIndicator {
  id: string;
  name: string;
  config: IndicatorConfig;
}
