export const REYA_API_BASE_URL = "https://api.reya.xyz";

export const API_ENDPOINTS = {
    MARKETS: "/api/trading/markets",
    MARKETS_DATA: "/api/trading/markets/data",
    MARKET_DATA: (marketId: string) => `/api/trading/market/${marketId}/data`,
    ASSETS: "/api/trading/assets",
    PRICES: "/api/trading/prices",
    PRICE_BY_PAIR: (assetPairId: string) => `/api/trading/prices/${assetPairId}`,
    FEE_TIER_PARAMETERS: "/api/trading/feeTierParameters",
    GLOBAL_FEE_PARAMETERS: "/api/trading/globalFeeParameters",
} as const;

export const CACHE_TTL = {
    MARKETS: 30,         // 30 seconds for testing new tokens
    MARKET_DATA: 30,     // 30 seconds
    ASSETS: 30,          // 30 seconds for testing new tokens
    PRICES: 10,          // 10 seconds
    FEE_PARAMETERS: 3600, // 1 hour
} as const;