/**
 * Leverage configuration based on asset type
 * Following regulatory standards (ESMA guidelines)
 *
 * Categories and leverage ranges:
 * - Stock CFDs: 2:1 – 5:1
 * - ETF CFDs: 2:1 – 5:1
 * - Index Futures CFDs: 10:1 – 20:1
 * - Cryptocurrencies: 2:1 – 5:1
 * - Agricultural Commodities: 10:1 – 15:1
 * - Forex: 20:1 – 30:1
 * - Energies (Oil, Gas): 10:1 – 20:1
 * - Metals (Gold, Silver, etc.): 10:1 – 20:1
 * - Cash Indices CFDs: 10:1 – 20:1
 * - Commodity Futures CFDs: 10:1 – 15:1
 */

// Track which symbols have been logged to avoid duplicate debug output
const loggedSymbols = new Set<string>();

export interface LeverageTier {
  upToVolume: number; // Volume in lots (cumulative)
  leverage: number;
}

export interface LeverageConfig {
  min: number;
  max: number;
  default: number;
  description: string;
  tiers?: LeverageTier[];
}

/**
 * Category type enumeration for cleaner mapping
 */
export type LeverageCategoryType =
  | "forex"
  | "crypto"
  | "stocks"
  | "etfs"
  | "indices"
  | "metals"
  | "energies"
  | "agricultural"
  | "commodities"
  | "default";

/**
 * Leverage configuration by category type
 */
export const LEVERAGE_CONFIG: Record<LeverageCategoryType, LeverageConfig> = {
  // Forex: 20:1 – 500:1
  forex: {
    min: 20,
    max: 500,
    default: 100,
    description: "Forex pairs (High leverage available)",
    tiers: [
      { upToVolume: 20, leverage: 500 }, // Up to 20 lots
      { upToVolume: 50, leverage: 200 }, // 20-50 lots
      { upToVolume: Infinity, leverage: 100 }, // > 50 lots
    ],
  },

  // Cryptocurrencies: 2:1 – 5:1
  crypto: {
    min: 2,
    max: 5,
    default: 2,
    description: "Cryptocurrencies - highly volatile, restricted leverage",
    tiers: [
      { upToVolume: 10, leverage: 5 },
      { upToVolume: 20, leverage: 2 },
      { upToVolume: Infinity, leverage: 1 },
    ],
  },

  // Stock CFDs: 2:1 – 5:1
  stocks: {
    min: 2,
    max: 5,
    default: 5,
    description: "Stock CFDs (ESMA cap at 5:1)",
    tiers: [
      { upToVolume: 100, leverage: 5 },
      { upToVolume: 500, leverage: 2 },
      { upToVolume: Infinity, leverage: 1 },
    ],
  },

  // ETF CFDs: 2:1 – 5:1
  etfs: {
    min: 2,
    max: 5,
    default: 5,
    description: "ETF CFDs - same as stocks",
  },

  // Index Futures CFDs / Cash Indices CFDs: 10:1 – 20:1
  indices: {
    min: 10,
    max: 20,
    default: 20,
    description: "Index Futures / Cash Indices CFDs",
  },

  // Metals (Gold, Silver, etc.): 10:1 – 20:1
  metals: {
    min: 10,
    max: 20,
    default: 20,
    description: "Precious metals (Gold, Silver, Platinum, Palladium)",
    tiers: [
      { upToVolume: 10, leverage: 20 },
      { upToVolume: 50, leverage: 10 },
      { upToVolume: Infinity, leverage: 5 },
    ],
  },

  // Energies (Oil, Gas): 10:1 – 20:1
  energies: {
    min: 10,
    max: 20,
    default: 20,
    description: "Oil, gas, and energy futures",
    tiers: [
      { upToVolume: 10, leverage: 20 },
      { upToVolume: 50, leverage: 10 },
      { upToVolume: Infinity, leverage: 5 },
    ],
  },

  // Agricultural Commodities: 10:1 – 15:1
  agricultural: {
    min: 10,
    max: 15,
    default: 15,
    description: "Agricultural commodities",
  },

  // Commodity Futures CFDs: 10:1 – 15:1
  commodities: {
    min: 10,
    max: 15,
    default: 15,
    description: "General commodity futures CFDs",
  },

  // Default fallback - conservative
  default: {
    min: 2,
    max: 5,
    default: 5,
    description: "Default conservative leverage",
  },
};

/**
 * Map API/MT5 category names to our leverage category types
 * This handles variations in naming from the backend
 */
function normalizeCategoryToType(category: string): LeverageCategoryType {
  const lower = category.toLowerCase().trim();

  // Cryptocurrencies - MUST check before Forex because "cryptocurrencies" contains "currencies"
  if (
    lower.includes("crypto") ||
    lower.includes("bitcoin") ||
    lower.includes("digital")
  ) {
    return "crypto";
  }

  // Forex / Currencies
  if (
    lower.includes("forex") ||
    lower.includes("currencies") ||
    lower.includes("currency") ||
    lower === "fx"
  ) {
    return "forex";
  }

  // Indices (Index Futures, Cash Indices)
  if (
    lower.includes("index") ||
    lower.includes("indices") ||
    lower.includes("cash indices") ||
    lower.includes("index futures")
  ) {
    return "indices";
  }

  // ETFs
  if (lower.includes("etf")) {
    return "etfs";
  }

  // Metals
  if (
    lower.includes("metal") ||
    lower.includes("gold") ||
    lower.includes("silver") ||
    lower.includes("platinum") ||
    lower.includes("palladium")
  ) {
    return "metals";
  }

  // Energies
  if (
    lower.includes("energy") ||
    lower.includes("energies") ||
    lower.includes("oil") ||
    lower.includes("gas") ||
    lower.includes("brent") ||
    lower.includes("wti")
  ) {
    return "energies";
  }

  // Agricultural
  if (
    lower.includes("agricult") ||
    lower.includes("grain") ||
    lower.includes("wheat") ||
    lower.includes("corn") ||
    lower.includes("soy") ||
    lower.includes("coffee") ||
    lower.includes("cocoa") ||
    lower.includes("sugar") ||
    lower.includes("cotton")
  ) {
    return "agricultural";
  }

  // General Commodities
  if (lower.includes("commodit")) {
    return "commodities";
  }

  // Stocks
  if (
    lower.includes("stock") ||
    lower.includes("share") ||
    lower.includes("equity") ||
    lower.includes("equities")
  ) {
    return "stocks";
  }

  // Default
  return "default";
}

/**
 * Get leverage configuration for a given category string
 */
export function getLeverageForCategory(category: string): LeverageConfig {
  const categoryType = normalizeCategoryToType(category);
  return LEVERAGE_CONFIG[categoryType];
}

/**
 * Get the default leverage value for a category
 * This is the main function used for margin calculations
 */
export function getLeverageValueForCategory(category: string): number {
  return getLeverageForCategory(category).default;
}

// Common Forex currencies used to identify Forex pairs
// Only pairs composed entirely of these currencies are treated as standard Forex (100k lot size)
const FOREX_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "NZD", // Majors
  "SGD",
  "HKD",
  "SEK",
  "NOK",
  "TRY",
  "ZAR",
  "MXN", // Common Minors/Exotics
]);

/**
 * Determine category from symbol name
 * This is a MINIMAL fallback when category info is not available from the API
 * The proper category should come from the API/MT5 backend
 */
export function getCategoryFromSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();

  // Check for Metals (XAU, XAG, XPT, XPD)
  if (
    upperSymbol.includes("XAU") ||
    upperSymbol.includes("XAG") ||
    upperSymbol.includes("XPT") ||
    upperSymbol.includes("XPD")
  ) {
    return "Metals";
  }

  // Forex pairs (standard 6-char format like EURUSD)
  // We strictly check if BOTH parts are known Forex currencies to distinguish from Crypto pairs (like ETHUSD)
  if (/^[A-Z]{6}$/.test(upperSymbol)) {
    const base = upperSymbol.substring(0, 3);
    const quote = upperSymbol.substring(3, 6);

    if (FOREX_CURRENCIES.has(base) && FOREX_CURRENCIES.has(quote)) {
      return "Forex";
    }

    // If it's 6 chars but not pure Forex currencies, default to Crypto
    return "Crypto";
  }

  // Indices - broker format with underscore prefix (e.g., _Canada60_H6)
  if (/^_/.test(symbol)) {
    return "Indices";
  }

  // Default - will use default leverage
  return "Stocks";
}

/**
 * Calculate required margin using a banded (tiered) approach
 * This prevents "margin cliffs" and "order splitting" exploits
 */
export function calculateDynamicMargin(
  symbol: string,
  newVolume: number,
  existingVolume: number,
  price: number,
  contractSize: number,
  category?: string
): number {
  const actualCategory = category || getCategoryFromSymbol(symbol);
  const leverageConfig = getLeverageForCategory(actualCategory);

  // If no tiers, use the default leverage for the whole volume
  if (!leverageConfig.tiers || leverageConfig.tiers.length === 0) {
    return (newVolume * contractSize * price) / leverageConfig.default;
  }

  let remainingVolume = newVolume;
  let currentTierStart = existingVolume;
  let totalMargin = 0;

  // Sort tiers by volume to ensure correct order
  const sortedTiers = [...leverageConfig.tiers].sort(
    (a, b) => a.upToVolume - b.upToVolume
  );

  for (const tier of sortedTiers) {
    if (remainingVolume <= 0) break;

    // The max volume this tier handles is its limit
    const tierLimit = tier.upToVolume;

    // Calculate how much volume fits in this tier considering we started at currentTierStart
    // If currentTierStart is already past tierLimit, available is 0
    const volumeAvailableInTier = Math.max(0, tierLimit - currentTierStart);

    // If there is space in this tier, take as much as possible from remainingVolume
    if (volumeAvailableInTier > 0) {
      const volumeToProcess = Math.min(remainingVolume, volumeAvailableInTier);

      const tierMargin =
        (volumeToProcess * contractSize * price) / tier.leverage;
      totalMargin += tierMargin;

      remainingVolume -= volumeToProcess;
      currentTierStart += volumeToProcess;
    } else {
      // We are already past this tier, check the next one
      continue;
    }
  }

  // If there is still volume left (meaning we exceeded the last defined tier limit,
  // or the last tier was Infinity and the loop logic handled it, but just in case...)
  // Note: The last tier usually has Infinity, so the loop should handle it.
  // But if the last tier has a hard limit, we need a fallback.
  if (remainingVolume > 0) {
    // Fallback: use the last tier's leverage for the remainder
    const lastTier = sortedTiers[sortedTiers.length - 1];
    const finalLeverage = lastTier ? lastTier.leverage : leverageConfig.default;
    totalMargin += (remainingVolume * contractSize * price) / finalLeverage;
  }

  return totalMargin;
}

/**
 * Get leverage value for a specific symbol
 * Uses provided category if available, otherwise infers from symbol name
 * Applies dynamic tiering based on volume if provided
 *
 * NOTE: This function returns a single "effective" leverage value for display purposes.
 * For actual margin calculation, use calculateDynamicMargin().
 */
export function getLeverageForSymbol(
  symbol: string,
  volume: number = 0,
  category?: string
): number {
  const actualCategory = category || getCategoryFromSymbol(symbol);
  const leverageConfig = getLeverageForCategory(actualCategory);

  // Default to base leverage
  let leverage = leverageConfig.default;

  // Apply tiered leverage if volume is provided and tiers exist
  // This logic is simplified for display - it shows the leverage of the "next" unit
  // or the leverage that applies to the bulk of the volume.
  if (volume > 0 && leverageConfig.tiers && leverageConfig.tiers.length > 0) {
    // Find the first tier where volume fits
    const tier = leverageConfig.tiers.find((t) => volume <= t.upToVolume);
    if (tier) {
      leverage = tier.leverage;
    } else {
      // Fallback for very high volume: use the last tier's leverage
      leverage = leverageConfig.tiers[leverageConfig.tiers.length - 1].leverage;
    }
  }

  // Only log once per symbol to avoid console spam
  const logKey = `${symbol}-${volume}`;
  if (!loggedSymbols.has(logKey)) {
    loggedSymbols.add(logKey);
    console.log(`\n========================================`);
    console.log(`[LEVERAGE] Symbol: "${symbol}"`);
    console.log(`[LEVERAGE] Category: "${actualCategory}"`);
    console.log(`[LEVERAGE] Volume: ${volume} lots`);
    if (leverageConfig.tiers && volume > 0) {
      console.log(`[LEVERAGE] Dynamic Tier Applied`);
    }
    console.log(`[LEVERAGE] >>> APPLIED: ${leverage}:1 <<<`);
    console.log(`========================================\n`);
  }

  return leverage;
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

/**
 * Get contract size (lot size) for a given symbol
 * Uses category-based defaults with specific overrides for metals/energies
 */
export function getContractSize(symbol: string, category?: string): number {
  const upperSymbol = symbol.toUpperCase();
  const normalizedCategory = category
    ? normalizeCategoryToType(category)
    : normalizeCategoryToType(getCategoryFromSymbol(symbol));

  // Category-based contract sizes (the main logic)
  switch (normalizedCategory) {
    case "forex":
      return 100000; // Standard forex lot

    case "crypto":
      return 1; // 1 unit per lot

    case "indices":
      return 1; // 1 contract per lot

    case "stocks":
    case "etfs":
      return 1; // 1 share per contract

    case "metals":
      // Metals need specific sizes based on the metal type
      if (upperSymbol.includes("XAU")) return 100; // Gold: 100 troy ounces
      if (upperSymbol.includes("XAG")) return 5000; // Silver: 5000 troy ounces
      if (upperSymbol.includes("XPT")) return 50; // Platinum: 50 troy ounces
      if (upperSymbol.includes("XPD")) return 100; // Palladium: 100 troy ounces
      return 100; // Default for other metals

    case "energies":
      return 1000; // Oil/gas: 1000 barrels per lot

    case "agricultural":
    case "commodities":
      return 1000; // Standard commodity lot

    default:
      // Fallback: check if it looks like forex
      if (/^[A-Z]{6}$/.test(upperSymbol)) return 100000;
      // Check if it looks like an index (underscore prefix)
      if (/^_/.test(symbol)) return 1;
      return 1; // Conservative default
  }
}

// ============================================================
// Legacy exports for backwards compatibility
// These map old category names to the new system
// ============================================================

export const LEVERAGE_BY_CATEGORY: Record<string, LeverageConfig> = {
  // Forex variants
  Forex: LEVERAGE_CONFIG.forex,
  Currencies: LEVERAGE_CONFIG.forex,
  Currency: LEVERAGE_CONFIG.forex,

  // Crypto variants
  Cryptocurrencies: LEVERAGE_CONFIG.crypto,
  Crypto: LEVERAGE_CONFIG.crypto,

  // Stock variants
  Stocks: LEVERAGE_CONFIG.stocks,
  "Stock CFDs": LEVERAGE_CONFIG.stocks,
  Equities: LEVERAGE_CONFIG.stocks,

  // ETF variants
  ETFs: LEVERAGE_CONFIG.etfs,
  "ETF CFDs": LEVERAGE_CONFIG.etfs,

  // Index variants
  Indices: LEVERAGE_CONFIG.indices,
  "Index Futures": LEVERAGE_CONFIG.indices,
  "Index Futures CFDs": LEVERAGE_CONFIG.indices,
  "Cash Indices": LEVERAGE_CONFIG.indices,
  "Cash Indices CFDs": LEVERAGE_CONFIG.indices,

  // Metal variants
  Metals: LEVERAGE_CONFIG.metals,
  "Precious Metals": LEVERAGE_CONFIG.metals,

  // Energy variants
  Energies: LEVERAGE_CONFIG.energies,
  Energy: LEVERAGE_CONFIG.energies,

  // Agricultural variants
  Agricultures: LEVERAGE_CONFIG.agricultural,
  Agricultural: LEVERAGE_CONFIG.agricultural,
  "Agricultural Commodities": LEVERAGE_CONFIG.agricultural,

  // Commodity variants
  Commodities: LEVERAGE_CONFIG.commodities,
  "Commodity Futures": LEVERAGE_CONFIG.commodities,
  "Commodity Futures CFDs": LEVERAGE_CONFIG.commodities,

  // Default
  Default: LEVERAGE_CONFIG.default,
};
