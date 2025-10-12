import {
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger,
} from "@elizaos/core";

import { IntentAnalyzer, IntentType, type IntentAnalysisResult } from "./intentAnalyzer.js";
import { initPriceService } from "../providers/priceProvider.js";
import { initMarketService } from "../providers/marketProvider.js";
import { initAssetService } from "../providers/assetProvider.js";

export class IntentDispatcher {
    private intentAnalyzer: IntentAnalyzer;

    constructor(private runtime: IAgentRuntime) {
        this.intentAnalyzer = new IntentAnalyzer(runtime);
    }

    async dispatch(
        message: Memory,
        state: State,
        callback?: HandlerCallback
    ): Promise<{
        shouldProceed: boolean;
        response?: string;
        usedSource: string;
    }> {
        try {
            elizaLogger.info("🚀 Intent Dispatcher: Starting analysis...");

            // Analyze user intent
            const analysis = await this.intentAnalyzer.analyzeIntent(message);
            
            elizaLogger.info(`📋 Dispatch Decision:`, {
                intent: analysis.intent,
                shouldUseAPI: analysis.shouldUseAPI,
                shouldUseKnowledge: analysis.shouldUseKnowledge,
                confidence: analysis.confidence
            });

            // Route based on analysis
            const result = await this.routeRequest(analysis, message, state, callback);
            
            elizaLogger.info(`✅ Dispatch Complete:`, {
                usedSource: result.usedSource,
                hasResponse: !!result.response
            });

            return result;

        } catch (error) {
            elizaLogger.error("❌ Intent Dispatcher Error:", error);
            
            return {
                shouldProceed: true, // Let other handlers try
                response: undefined,
                usedSource: "fallback"
            };
        }
    }

    private async routeRequest(
        analysis: IntentAnalysisResult,
        message: Memory,
        state: State,
        callback?: HandlerCallback
    ): Promise<{
        shouldProceed: boolean;
        response?: string;
        usedSource: string;
    }> {
        const { intent, shouldUseAPI, shouldUseKnowledge } = analysis;

        switch (intent) {
            case IntentType.KNOWLEDGE_QUERY:
                return await this.handleKnowledgeQuery(message, callback);

            case IntentType.PRICE_QUERY:
                return await this.handlePriceQuery(analysis, message, state, callback);

            case IntentType.MARKET_QUERY:
                return await this.handleMarketQuery(analysis, message, state, callback);

            case IntentType.ASSET_QUERY:
                return await this.handleAssetQuery(analysis, message, state, callback);

            case IntentType.COMPARISON_QUERY:
                return await this.handleComparisonQuery(analysis, message, state, callback);

            case IntentType.HISTORICAL_DATA_QUERY:
                return await this.handleHistoricalQuery(analysis, message, state, callback);

            case IntentType.GENERAL_CHAT:
            default:
                // Let other handlers (like general chat) handle this
                return {
                    shouldProceed: true,
                    usedSource: "general_chat"
                };
        }
    }

    private async handleKnowledgeQuery(
        message: Memory,
        callback?: HandlerCallback
    ): Promise<{ shouldProceed: boolean; response?: string; usedSource: string }> {
        elizaLogger.info("📚 Routing to Knowledge Base...");
        
        // Don't handle here - let knowledge plugin handle it
        // But block API calls by returning shouldProceed: false for API actions
        return {
            shouldProceed: false, // Block API plugins
            usedSource: "knowledge_base"
        };
    }

    private async handlePriceQuery(
        analysis: IntentAnalysisResult,
        message: Memory,
        state: State,
        callback?: HandlerCallback
    ): Promise<{ shouldProceed: boolean; response?: string; usedSource: string }> {
        elizaLogger.info("💰 Handling Price Query via API...");
        
        try {
            const priceService = await initPriceService(this.runtime);
            const prices = await priceService.getPrices();
            
            // Extract asset from message if possible
            const messageText = message.content.text?.toLowerCase() || "";
            const assets = analysis.extractedEntities?.assets || [];
            
            if (assets.length > 0) {
                // Handle specific asset price request
                const assetSymbol = assets[0].toUpperCase();
                const assetPrice = prices.find(p => 
                    String(p.marketId).includes(assetSymbol) || 
                    p.assetPairId?.includes(assetSymbol)
                );
                
                if (assetPrice) {
                    const response = `Current ${assetSymbol} price on Reya Network:
• Mark Price: $${priceService.formatPrice(assetPrice.price)}
• Oracle Price: $${priceService.formatPrice(assetPrice.oraclePrice)}
• Pool Price: $${priceService.formatPrice(assetPrice.poolPrice)}`;

                    if (callback) {
                        callback({ text: response });
                    }

                    return {
                        shouldProceed: false,
                        response,
                        usedSource: "reya_api_price"
                    };
                }
            }
            
            // General price overview
            const summary = await priceService.getPricesSummary();
            const validPrices = prices.filter(p => p.price && Number.isFinite(parseFloat(p.price)));
            const topPrices = validPrices.slice(0, 3);
            
            const response = `Reya Network Price Overview:
${topPrices.map((p, i) => `${i + 1}. Market ${p.marketId}: $${priceService.formatPrice(p.price)}`).join('\n')}

📊 ${summary.totalMarkets} active markets total`;

            if (callback) {
                callback({ text: response });
            }

            return {
                shouldProceed: false,
                response,
                usedSource: "reya_api_price"
            };

        } catch (error) {
            elizaLogger.error("Price query error:", error);
            return {
                shouldProceed: true, // Let other handlers try
                usedSource: "api_error"
            };
        }
    }

    private async handleMarketQuery(
        analysis: IntentAnalysisResult,
        message: Memory,
        state: State,
        callback?: HandlerCallback
    ): Promise<{ shouldProceed: boolean; response?: string; usedSource: string }> {
        elizaLogger.info("📊 Handling Market Query via API...");
        
        try {
            const marketService = await initMarketService(this.runtime);
            const markets = await marketService.getMarkets();
            const marketsData = await marketService.getMarketsData();
            
            const activeMarkets = markets.filter(m => m.isActive);
            const topMarkets = activeMarkets.slice(0, 5);
            
            const response = `Reya Network Markets:

**Top ${topMarkets.length} Active Markets:**
${topMarkets.map((m, i) => `${i + 1}. ${m.ticker} (ID: ${m.id})`).join('\n')}

📊 Total: ${markets.length} markets (${activeMarkets.length} active)
💰 Market data available for detailed analysis`;

            if (callback) {
                callback({ text: response });
            }

            return {
                shouldProceed: false,
                response,
                usedSource: "reya_api_market"
            };

        } catch (error) {
            elizaLogger.error("Market query error:", error);
            return {
                shouldProceed: true,
                usedSource: "api_error"
            };
        }
    }

    private async handleAssetQuery(
        analysis: IntentAnalysisResult,
        message: Memory,
        state: State,
        callback?: HandlerCallback
    ): Promise<{ shouldProceed: boolean; response?: string; usedSource: string }> {
        elizaLogger.info("🪙 Handling Asset Query via API...");
        
        try {
            const assetService = await initAssetService(this.runtime);
            const assets = await assetService.getAssets();
            
            const response = `Reya Network Supported Assets:

${assets.slice(0, 10).map((a, i) => `${i + 1}. ${a.name} (${a.symbol})`).join('\n')}

📊 Total: ${assets.length} assets supported
🔗 All assets available for cross-margining`;

            if (callback) {
                callback({ text: response });
            }

            return {
                shouldProceed: false,
                response,
                usedSource: "reya_api_asset"
            };

        } catch (error) {
            elizaLogger.error("Asset query error:", error);
            return {
                shouldProceed: true,
                usedSource: "api_error"
            };
        }
    }

    private async handleComparisonQuery(
        analysis: IntentAnalysisResult,
        message: Memory,
        state: State,
        callback?: HandlerCallback
    ): Promise<{ shouldProceed: boolean; response?: string; usedSource: string }> {
        elizaLogger.info("🔄 Handling Comparison Query (API + Knowledge)...");
        
        // For comparison queries, we might want to combine API data with knowledge
        // Let other handlers process this for now
        return {
            shouldProceed: true,
            usedSource: "comparison_hybrid"
        };
    }

    private async handleHistoricalQuery(
        analysis: IntentAnalysisResult,
        message: Memory,
        state: State,
        callback?: HandlerCallback
    ): Promise<{ shouldProceed: boolean; response?: string; usedSource: string }> {
        elizaLogger.info("📈 Handling Historical Query...");
        
        // For now, let chart/historical handlers deal with this
        return {
            shouldProceed: true,
            usedSource: "historical_data"
        };
    }
}