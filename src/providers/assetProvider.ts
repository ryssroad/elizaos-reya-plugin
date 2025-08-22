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
import type { Asset, ReyaProviderResponse } from "../types/index.js";

export class ReyaAssetService {
    private cache: NodeCache;
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.cache = new NodeCache({ stdTTL: CACHE_TTL.ASSETS });
    }

    async getAssets(): Promise<Asset[]> {
        try {
            const cacheKey = 'reya-assets';
            const cachedValue = this.cache.get<Asset[]>(cacheKey);
            if (cachedValue) {
                elizaLogger.info("Cache hit for getAssets");
                return cachedValue;
            }
            elizaLogger.info("Cache miss for getAssets");

            const fetchUrl = `${this.baseUrl}${API_ENDPOINTS.ASSETS}`;
            const response = await fetch(fetchUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const assets: Asset[] = await response.json();
            this.cache.set(cacheKey, assets, CACHE_TTL.ASSETS);
            return assets;
        } catch (error) {
            elizaLogger.error("Error fetching assets:", error);
            throw error;
        }
    }

    async getAssetBySymbol(symbol: string): Promise<Asset | null> {
        const assets = await this.getAssets();
        return assets.find(a => a.short.toLowerCase() === symbol.toLowerCase()) || null;
    }

    async getAssetByAddress(address: string): Promise<Asset | null> {
        const assets = await this.getAssets();
        return assets.find(a => a.address.toLowerCase() === address.toLowerCase()) || null;
    }

    async searchAssets(query: string): Promise<Asset[]> {
        const assets = await this.getAssets();
        const lowerQuery = query.toLowerCase();
        
        return assets.filter(asset => 
            asset.name.toLowerCase().includes(lowerQuery) ||
            asset.short.toLowerCase().includes(lowerQuery) ||
            asset.address.toLowerCase().includes(lowerQuery)
        );
    }

    async getAssetsSummary(): Promise<{
        totalAssets: number;
        uniqueDecimals: number[];
        assetsByDecimals: Record<number, number>;
        newestAsset: Asset | null;
        oldestAsset: Asset | null;
    }> {
        const assets = await this.getAssets();
        const decimalsSet = new Set(assets.map(a => a.decimals));
        const assetsByDecimals: Record<number, number> = {};
        
        assets.forEach(asset => {
            assetsByDecimals[asset.decimals] = (assetsByDecimals[asset.decimals] || 0) + 1;
        });

        const sortedByDate = assets
            .filter(a => a.createdAt)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        return {
            totalAssets: assets.length,
            uniqueDecimals: Array.from(decimalsSet).sort((a, b) => a - b),
            assetsByDecimals,
            newestAsset: sortedByDate[sortedByDate.length - 1] || null,
            oldestAsset: sortedByDate[0] || null
        };
    }

    formatAssetInfo(asset: Asset): string {
        return `${asset.name} (${asset.short}) - ${asset.decimals} decimals, Address: ${asset.address.slice(0, 10)}...`;
    }
}

export const initAssetService = async (runtime: IAgentRuntime): Promise<ReyaAssetService> => {
    const config = getReyaConfig(runtime);
    return new ReyaAssetService(config.REYA_API_BASE_URL);
};

export const reyaAssetProvider: Provider = {
    name: "reyaAssetProvider",
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<ReyaProviderResponse> => {
        try {
            const assetService = await initAssetService(runtime);
            const assets = await assetService.getAssets();
            const summary = await assetService.getAssetsSummary();

            const topAssets = assets
                .slice(0, 3)
                .map(a => `${a.short} (${a.name})`)
                .join(', ');

            return {
                message: `Reya Network supports ${summary.totalAssets} assets for trading and collateral. Major assets include: ${topAssets}. All assets support cross-collateralization and unified margin. Decimal precision: ${summary.uniqueDecimals.join(', ')}.`
            };
        } catch (error) {
            elizaLogger.error("Error in Reya Asset provider:", error);
            return {
                message: "Failed to fetch asset data from Reya Network",
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }
    },
};