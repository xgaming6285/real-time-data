/**
 * Leverage configuration based on asset type
 * Following regulatory standards (ESMA guidelines)
 */

export interface LeverageConfig {
  min: number;
  max: number;
  default: number;
  description: string;
}

export const LEVERAGE_BY_CATEGORY: Record<string, LeverageConfig> = {
  // Forex - Major pairs (matches "Forex" from API)
  Forex: {
    min: 20,
    max: 30,
    default: 30,
    description: 'Major forex pairs (ESMA: max 30:1)',
  },
  Currencies: {
    min: 20,
    max: 30,
    default: 30,
    description: 'Major forex pairs (ESMA: max 30:1)',
  },
  
  // Cryptocurrencies (matches "Cryptocurrencies" from API)
  Cryptocurrencies: {
    min: 2,
    max: 5,
    default: 2,
    description: 'Highly volatile, restricted leverage',
  },
  Crypto: {
    min: 2,
    max: 5,
    default: 2,
    description: 'Highly volatile, restricted leverage',
  },
  
  // Stock CFDs
  Stocks: {
    min: 2,
    max: 5,
    default: 5,
    description: 'Stock CFDs (ESMA cap at 5:1)',
  },
  
  // ETF CFDs
  ETFs: {
    min: 2,
    max: 5,
    default: 5,
    description: 'ETF CFDs - same as stocks',
  },
  
  // Indices / Index Futures / Cash Indices
  Indices: {
    min: 10,
    max: 20,
    default: 20,
    description: 'Less volatile than single stocks',
  },
  'Index Futures': {
    min: 10,
    max: 20,
    default: 20,
    description: 'Index futures CFDs',
  },
  'Cash Indices': {
    min: 10,
    max: 20,
    default: 20,
    description: 'Cash indices CFDs',
  },
  
  // Commodities - General
  Commodities: {
    min: 10,
    max: 20,
    default: 15,
    description: 'General commodities',
  },
  
  // Agricultural commodities
  Agricultures: {
    min: 10,
    max: 15,
    default: 15,
    description: 'Agricultural commodities - moderate volatility',
  },
  Agricultural: {
    min: 10,
    max: 15,
    default: 15,
    description: 'Agricultural commodities - moderate volatility',
  },
  
  // Metals (Gold, Silver, Palladium, etc.)
  Metals: {
    min: 10,
    max: 20,
    default: 15,
    description: 'Precious metals - can move fast',
  },
  
  // Energy commodities
  Energies: {
    min: 10,
    max: 20,
    default: 15,
    description: 'Oil, gas, and energy futures - volatile',
  },
  Energy: {
    min: 10,
    max: 20,
    default: 15,
    description: 'Oil, gas, and energy futures - volatile',
  },
  
  // Default fallback for any unrecognized category
  Default: {
    min: 2,
    max: 100,
    default: 100,
    description: 'Default conservative leverage',
  },
};

/**
 * Get leverage configuration for a given symbol category
 */
export function getLeverageForCategory(category: string): LeverageConfig {
  return LEVERAGE_BY_CATEGORY[category] || LEVERAGE_BY_CATEGORY.Default;
}

/**
 * Determine category from symbol name
 * This is a fallback when category info is not available
 */
export function getCategoryFromSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  
  // Forex pairs (6 characters, typically)
  if (/^[A-Z]{6}$/.test(upperSymbol)) {
    return 'Currencies';
  }
  
  // Crypto (contains BTC, ETH, etc.)
  if (/BTC|ETH|XRP|LTC|ADA|DOT|DOGE/.test(upperSymbol)) {
    return 'Crypto';
  }
  
  // Commodities
  if (/GOLD|SILVER|OIL|GAS|XAU|XAG|WTI|BRENT/.test(upperSymbol)) {
    return 'Commodities';
  }
  
  // Indices
  if (/SPX|NDX|DJI|DAX|FTSE|NIKKEI|US30|US100|US500/.test(upperSymbol)) {
    return 'Indices';
  }
  
  // Default to stocks for everything else
  return 'Stocks';
}

/**
 * Get leverage value for a specific symbol
 * Uses category lookup if available, otherwise infers from symbol name
 */
export function getLeverageForSymbol(
  symbol: string,
  category?: string
): number {
  const actualCategory = category || getCategoryFromSymbol(symbol);
  const config = getLeverageForCategory(actualCategory);
  return config.default;
}

/**
 * Validate if a leverage value is within acceptable range for a category
 */
export function isValidLeverageForCategory(
  leverage: number,
  category: string
): boolean {
  const config = getLeverageForCategory(category);
  return leverage >= config.min && leverage <= config.max;
}

