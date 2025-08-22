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
import type { Price, PricesResponse, ReyaProviderResponse } from "../types/index.js";

export class ReyaPriceService {
    private cache: NodeCache;
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.cache = new NodeCache({ stdTTL: CACHE_TTL.PRICES });
    }

    async getPrices(): Promise<Price[]> {
        try {
            const cacheKey = 'reya-prices';
            const cachedValue = this.cache.get<Price[]>(cacheKey);
            if (cachedValue) {
                elizaLogger.info("Cache hit for getPrices");
                return cachedValue;
            }
            elizaLogger.info("Cache miss for getPrices");

            const fetchUrl = `${this.baseUrl}${API_ENDPOINTS.PRICES}`;
            const response = await fetch(fetchUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const pricesResponse: PricesResponse = await response.json();
            // Convert object to array with assetPairId
            const prices: Price[] = Object.entries(pricesResponse).map(([assetPairId, price]) => ({
                ...price,
                assetPairId
            }));
            
            this.cache.set(cacheKey, prices, CACHE_TTL.PRICES);
            return prices;
        } catch (error) {
            elizaLogger.error("Error fetching prices:", error);
            throw error;
        }
    }

    async getPrice(assetPairId: string): Promise<Price> {
        try {
            const cacheKey = `reya-price-${assetPairId}`;
            const cachedValue = this.cache.get<Price>(cacheKey);
            if (cachedValue) {
                elizaLogger.info(`Cache hit for getPrice ${assetPairId}`);
                return cachedValue;
            }
            elizaLogger.info(`Cache miss for getPrice ${assetPairId}`);

            const fetchUrl = `${this.baseUrl}${API_ENDPOINTS.PRICE_BY_PAIR(assetPairId)}`;
            const response = await fetch(fetchUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const price: Price = await response.json();
            this.cache.set(cacheKey, price, CACHE_TTL.PRICES);
            return price;
        } catch (error) {
            elizaLogger.error(`Error fetching price for ${assetPairId}:`, error);
            throw error;
        }
    }

    async getPriceByMarketId(marketId: number): Promise<Price | null> {
        const prices = await this.getPrices();
        return prices.find(p => p.marketId === marketId) || null;
    }

    formatPrice(price: string | number | null | undefined): string {
        if (price === null || price === undefined || price === '') {
            return 'N/A';
        }
        
        const num = typeof price === 'string'
            ? parseFloat(price)
            : typeof price === 'number'
                ? price
                : NaN;
                
        if (!Number.isFinite(num) || isNaN(num)) {
            return 'N/A';
        }
        
        if (num >= 1e18) {
            // For very large numbers (likely in wei), convert to readable format
            return (num / 1e18).toFixed(2);
        }
        
        // Ensure we have a valid finite number before calling toLocaleString
        const validNum = Number(num);
        if (!Number.isFinite(validNum)) {
            return 'N/A';
        }
        
        return validNum.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        });
    }

    async getPricesSummary(): Promise<{
        totalMarkets: number;
        averagePrice: number;
        priceRange: { min: number | null; max: number | null };
        lastUpdate: number | null;
    }> {
        const prices = await this.getPrices();
        const numericPrices = prices
            .map(p => parseFloat(p.price))
            .filter(p => Number.isFinite(p) && p > 0) as number[];

        const averagePrice = numericPrices.length
            ? numericPrices.reduce((sum, p) => sum + p, 0) / numericPrices.length
            : 0;

        const priceRange = numericPrices.length
            ? { min: Math.min(...numericPrices), max: Math.max(...numericPrices) }
            : { min: null, max: null };

        const lastUpdate = prices.length
            ? Math.max(...prices.map(p => Number(p.updatedAt) || 0))
            : null;

        return {
            totalMarkets: prices.length,
            averagePrice,
            priceRange,
            lastUpdate,
        };
    }
}

export const initPriceService = async (runtime: IAgentRuntime): Promise<ReyaPriceService> => {
    const config = getReyaConfig(runtime);
    return new ReyaPriceService(config.REYA_API_BASE_URL);
};

export const reyaPriceProvider: Provider = {
    name: "reyaPriceProvider",
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<ReyaProviderResponse> => {
        console.log("🚨 REYA PRICE PROVIDER CALLED! 🚨");
        elizaLogger.info("🚨 REYA PRICE PROVIDER STARTED");
        
        try {
            const priceService = await initPriceService(runtime);
            console.log("✅ Price service initialized");
            
            const prices = await priceService.getPrices();
            console.log(`✅ Fetched ${prices.length} prices from API`);
            
            const summary = await priceService.getPricesSummary();
            console.log("✅ Generated price summary:", summary);

            const valid = prices.filter(p => p?.price != null && Number.isFinite(parseFloat(p.price)));
            const topPrices = valid
                .slice(0, 3)
                .map(p => `Market ${p.marketId}: $${priceService.formatPrice(p.price)}`)
                .join(', ');

            console.log("🔥 TOP 3 PRICES:", topPrices);
            
            // Log detailed info about SOL if present
            const solPrice = prices.find(p => {
                // Try to find SOL-related market (might need to check market data too)
                return String(p.marketId).includes("SOL") || p.assetPairId?.includes("SOL");
            });
            
            if (solPrice) {
                console.log("💰 SOL PRICE FOUND:", {
                    marketId: solPrice.marketId,
                    price: solPrice.price,
                    oraclePrice: solPrice.oraclePrice,
                    poolPrice: solPrice.poolPrice,
                    formatted: {
                        price: priceService.formatPrice(solPrice.price),
                        oracle: priceService.formatPrice(solPrice.oraclePrice),
                        pool: priceService.formatPrice(solPrice.poolPrice)
                    }
                });
            } else {
                console.log("❌ SOL price not found in", prices.length, "prices");
                // Log first few prices to see structure
                console.log("📋 Sample prices:", prices.slice(0, 3).map(p => ({
                    marketId: p.marketId,
                    price: p.price,
                    assetPairId: p.assetPairId
                })));
            }

            // Create detailed SOL price info if found
            let solPriceInfo = "";
            if (solPrice) {
                solPriceInfo = ` CURRENT SOL-rUSD PRICES: Mark Price: $${priceService.formatPrice(solPrice.price)}, Oracle Price: $${priceService.formatPrice(solPrice.oraclePrice)}, Pool Price: $${priceService.formatPrice(solPrice.poolPrice)}.`;
            }

            const message = `REYA NETWORK LIVE PRICE DATA: ${summary.totalMarkets} active price feeds.${solPriceInfo} Top markets: ${topPrices}. Last update: ${summary.lastUpdate ? new Date(summary.lastUpdate).toLocaleTimeString() : 'N/A'}.`;
            
            console.log("🎯 FINAL MESSAGE:", message);
            elizaLogger.info("🎯 REYA PRICE PROVIDER COMPLETED - MESSAGE:", message);

            return { message };
        } catch (error) {
            console.error("💥 ERROR in Reya Price provider:", error);
            elizaLogger.error("Error in Reya Price provider:", error);
            return {
                message: "Failed to fetch price data from Reya Network",
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },
};
