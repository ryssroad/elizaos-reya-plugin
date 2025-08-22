import {
    type Provider,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
} from "@elizaos/core";

import NodeCache from "node-cache";
import { getReyaConfig } from "../environment.js";
import { API_ENDPOINTS, CACHE_TTL } from "../constants/index.js";
import type { Market, MarketData, ReyaProviderResponse } from "../types/index.js";

export class ReyaMarketService {
    private cache: NodeCache;
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.cache = new NodeCache({ stdTTL: CACHE_TTL.MARKETS });
    }

    async getMarkets(): Promise<Market[]> {
        try {
            const cacheKey = 'reya-markets';
            const cachedValue = this.cache.get<Market[]>(cacheKey);
            if (cachedValue) {
                elizaLogger.info("Cache hit for getMarkets");
                return cachedValue;
            }
            elizaLogger.info("Cache miss for getMarkets");

            const fetchUrl = `${this.baseUrl}${API_ENDPOINTS.MARKETS}`;
            const response = await fetch(fetchUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const markets: Market[] = await response.json();
            this.cache.set(cacheKey, markets, CACHE_TTL.MARKETS);
            return markets;
        } catch (error) {
            elizaLogger.error("Error fetching markets:", error);
            throw error;
        }
    }

    async getMarketsData(): Promise<MarketData[]> {
        try {
            const cacheKey = 'reya-markets-data';
            const cachedValue = this.cache.get<MarketData[]>(cacheKey);
            if (cachedValue) {
                elizaLogger.info("Cache hit for getMarketsData");
                return cachedValue;
            }
            elizaLogger.info("Cache miss for getMarketsData");

            const fetchUrl = `${this.baseUrl}${API_ENDPOINTS.MARKETS_DATA}`;
            const response = await fetch(fetchUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const marketsData: MarketData[] = await response.json();
            this.cache.set(cacheKey, marketsData, CACHE_TTL.MARKET_DATA);
            return marketsData;
        } catch (error) {
            elizaLogger.error("Error fetching markets data:", error);
            throw error;
        }
    }

    async getMarketData(marketId: string): Promise<MarketData> {
        try {
            const cacheKey = `reya-market-data-${marketId}`;
            const cachedValue = this.cache.get<MarketData>(cacheKey);
            if (cachedValue) {
                elizaLogger.info(`Cache hit for getMarketData ${marketId}`);
                return cachedValue;
            }
            elizaLogger.info(`Cache miss for getMarketData ${marketId}`);

            const fetchUrl = `${this.baseUrl}${API_ENDPOINTS.MARKET_DATA(marketId)}`;
            const response = await fetch(fetchUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const marketData: MarketData = await response.json();
            this.cache.set(cacheKey, marketData, CACHE_TTL.MARKET_DATA);
            return marketData;
        } catch (error) {
            elizaLogger.error(`Error fetching market data for ${marketId}:`, error);
            throw error;
        }
    }

    async getMarketByTicker(ticker: string): Promise<Market | null> {
        const markets = await this.getMarkets();
        return markets.find(m => m.ticker.toLowerCase() === ticker.toLowerCase()) || null;
    }

    async getTopMarketsByVolume(limit: number = 5): Promise<MarketData[]> {
        const marketsData = await this.getMarketsData();
        return marketsData
            .sort((a, b) => b.last24hVolume - a.last24hVolume)
            .slice(0, limit);
    }
}

export const initMarketService = async (runtime: IAgentRuntime): Promise<ReyaMarketService> => {
    const config = getReyaConfig(runtime);
    return new ReyaMarketService(config.REYA_API_BASE_URL);
};

export const reyaMarketProvider: Provider = {
    name: "reyaMarketProvider",
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<ReyaProviderResponse> => {
        console.log("🚨 REYA MARKET PROVIDER CALLED! 🚨");
        elizaLogger.info("🚨 REYA MARKET PROVIDER STARTED");
        
        try {
            const marketService = await initMarketService(runtime);
            const markets = await marketService.getMarkets();
            const marketsData = await marketService.getMarketsData();

            console.log(`✅ Fetched ${markets.length} markets`);
            
            // Look for SOL markets
            const solMarkets = markets.filter(m => 
                m.ticker.toUpperCase().includes('SOL') || 
                m.name.toUpperCase().includes('SOL')
            );
            
            if (solMarkets.length > 0) {
                console.log("💰 SOL MARKETS FOUND:", solMarkets.map(m => ({
                    id: m.id,
                    ticker: m.ticker,
                    name: m.name,
                    isActive: m.isActive
                })));
            } else {
                console.log("❌ No SOL markets found");
                console.log("📋 Sample market tickers:", markets.slice(0, 10).map(m => m.ticker));
            }

            const activeMarkets = markets.filter(m => m.isActive);
            const topMarkets = await marketService.getTopMarketsByVolume(3);

            const message = `Reya Network DEX has ${activeMarkets.length} active perpetual markets. Top volume leaders: ${topMarkets.map(m => {
                const market = markets.find(market => market.id === m.marketId);
                return `${market?.ticker || m.marketId} ($${m.last24hVolume.toLocaleString()})`;
            }).join(', ')}. Platform offers cross-margining, unified liquidity, and 100ms block times.`;

            console.log("🎯 MARKET MESSAGE:", message);
            elizaLogger.info("🎯 REYA MARKET PROVIDER COMPLETED");

            return { message };
        } catch (error) {
            console.error("💥 ERROR in Reya Market provider:", error);
            elizaLogger.error("Error in Reya Market provider:", error);
            return {
                message: "Failed to fetch market data from Reya Network",
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },
};