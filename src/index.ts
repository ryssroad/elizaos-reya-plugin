import { Plugin } from "@elizaos/core";
import { reyaMarketProvider } from "./providers/marketProvider.js";
import { reyaPriceProvider } from "./providers/priceProvider.js";
import { reyaAssetProvider } from "./providers/assetProvider.js";
import { smartDispatchProvider } from "./providers/dispatchProvider.js";
import { smartDispatchAction } from "./actions/smartDispatchAction.js";
import { getMarketsAction } from "./actions/marketAction.js";
import { getPricesAction } from "./actions/priceAction.js";
import { getAssetsAction } from "./actions/assetAction.js";

export const reyaPlugin: Plugin = {
    name: "reya",
    description: "Reya Network Plugin for Eliza - provides market data, price information, and asset details from Reya Network DEX",
    providers: [
        // Run Smart Dispatch first to populate state flags
        smartDispatchProvider,
        reyaMarketProvider,
        reyaPriceProvider,
        reyaAssetProvider
    ],
    evaluators: [],
    services: [],
    actions: [
        smartDispatchAction,  // Smart dispatcher must be first
        getMarketsAction,
        getPricesAction,  
        getAssetsAction
    ],
};

export default reyaPlugin;

// Re-export types for external use
export type {
    Market,
    MarketData,
    Asset,
    Price,
    FeeTierParameter,
    GlobalFeeParameters,
    ReyaApiResponse,
    ReyaProviderResponse
} from "./types/index.js";

// Re-export services for external use
export {
    ReyaMarketService,
    initMarketService
} from "./providers/marketProvider.js";

export {
    ReyaPriceService,
    initPriceService
} from "./providers/priceProvider.js";

export {
    ReyaAssetService,
    initAssetService
} from "./providers/assetProvider.js";

// Re-export constants
export {
    REYA_API_BASE_URL,
    API_ENDPOINTS,
    CACHE_TTL
} from "./constants/index.js";

// Re-export configuration utilities
export {
    getReyaConfig,
    validateReyaConfig
} from "./environment.js";
