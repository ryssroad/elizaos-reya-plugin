import {
    type Action,
    type ActionResult,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
} from "@elizaos/core";

import { initMarketService } from "../providers/marketProvider.js";

export const getMarketsAction: Action = {
    name: "GET_REYA_MARKETS",
    description: "Get market data from Reya Network DEX including active markets, volumes, and trading pairs",
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();
        return text.includes("market") || 
               text.includes("trading") || 
               text.includes("pair") ||
               text.includes("volume") ||
               text.includes("reya");
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: Function
    ): Promise<ActionResult> => {
        try {
            elizaLogger.info("Executing GET_REYA_MARKETS action");
            
            const marketService = await initMarketService(runtime);
            const markets = await marketService.getMarkets();
            const marketsData = await marketService.getMarketsData();
            const topMarkets = await marketService.getTopMarketsByVolume(5);
            
            const activeMarkets = markets.filter(m => m.isActive);
            
            const response = `Reya Network currently has ${activeMarkets.length} active markets. 

Top markets by 24h volume:
${topMarkets.map((md, idx) => {
                const market = markets.find(m => m.id === md.marketId);
                return `${idx + 1}. ${market?.ticker || md.marketId} - $${md.last24hVolume?.toLocaleString() || 'N/A'}`;
            }).join('\n')}

Recent market activity shows strong trading across major pairs including BTC-rUSD, ETH-rUSD, and emerging altcoin perpetuals.`;

            await callback({
                text: response,
                action: "GET_REYA_MARKETS"
            });

            return {
                success: true,
                text: response,
                data: {
                    markets,
                    marketsData,
                    topMarkets,
                    activeMarketsCount: activeMarkets.length
                }
            };
        } catch (error) {
            elizaLogger.error("Error in GET_REYA_MARKETS action:", error);
            
            const errorMsg = "Sorry, I couldn't fetch the market data from Reya Network right now. Please try again in a moment.";
            await callback({
                text: errorMsg,
                error: true
            });

            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    },
};export default getMarketsAction;
