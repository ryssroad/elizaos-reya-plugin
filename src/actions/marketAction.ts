import {
    type Action,
    type ActionResult,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
    parseKeyValueXml,
    ModelType,
} from "@elizaos/core";

import { initMarketService } from "../providers/marketProvider.js";

export const getMarketsAction: Action = {
    name: "GET_REYA_MARKETS",
    description: "Get market data from Reya Network DEX including active markets, volumes, and trading pairs",
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();
        
        // Check for market/volume related keywords
        const marketKeywords = [
            // English keywords
            "market", "trading", "pair", "volume", "trade", "activity",
            "24h", "daily", "liquidity", "turnover", "traded",
            
            // Russian keywords  
            "рынок", "торги", "объем", "торговля", "активность", 
            "оборот", "ликвидность", "сутки", "суточный"
        ];
        
        const hasMarketKeyword = marketKeywords.some(keyword => text.includes(keyword));
        const hasReyaKeyword = text.includes("reya");
        
        // Additional check for crypto symbols that might indicate volume queries
        const cryptoSymbols = [
            "btc", "bitcoin", "eth", "ethereum", "sol", "solana", "usdc", "usdt",
            "hype", "doge", "ada", "matic", "avax", "link", "uni", "aave"
        ];
        
        const hasCryptoSymbol = cryptoSymbols.some(symbol => text.includes(symbol));
        
        // Validate if it's a market/volume-related query
        return hasMarketKeyword || (hasReyaKeyword && hasCryptoSymbol);
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
            
            // First check if user is asking for specific token volume/market data
            const extractionPrompt = `
You are an expert at extracting cryptocurrency trading and market information from user messages.

EXTRACTION RULES:
1. Look for cryptocurrency symbols (BTC, ETH, SOL, UNI, etc.)
2. Look for market/volume queries about specific tokens
3. Look for general market overview requests
4. If MULTIPLE symbols found, extract the FIRST ONE mentioned
5. If NO specific symbol found, treat as general market query

QUERY TYPES:
- "volume" = user asking about trading volume
- "market" = user asking about market data/activity  
- "general" = general market overview

EXAMPLES:
- "BTC volume on Reya" → symbol: BTC, type: volume
- "SOL trading activity" → symbol: SOL, type: volume
- "объем торгов ETH за сутки" → symbol: ETH, type: volume
- "market overview" → symbol: "", type: general
- "show me markets" → symbol: "", type: general

FORMAT: Return ONLY this XML structure:
<response>
  <symbol>EXTRACTED_SYMBOL_OR_EMPTY</symbol>
  <type>volume_or_market_or_general</type>
</response>

USER MESSAGE: "${message.content.text}"

EXTRACT NOW:`;

            const llmResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
                prompt: extractionPrompt,
            });

            elizaLogger.info("Market LLM response:", llmResponse);
            const extractedData = parseKeyValueXml(llmResponse);
            const symbol = extractedData.symbol || "";
            const queryType = extractedData.type || "general";
            
            elizaLogger.info("Market extracted symbol:", symbol, "Type:", queryType);
            
            const marketService = await initMarketService(runtime);
            const markets = await marketService.getMarkets();
            const marketsData = await marketService.getMarketsData();
            
            let response = "";
            
            if (symbol && (queryType === "volume" || queryType === "market")) {
                // Find specific market for the token
                const assetSymbol = symbol.toUpperCase();
                elizaLogger.info("🔍 Searching for market volume for symbol:", assetSymbol);
                
                let targetMarket = null;
                
                // Find market using the same fuzzy matching as in price action
                targetMarket = markets.find(m => 
                    m.ticker.toUpperCase().startsWith(assetSymbol + '-') || 
                    m.ticker.toUpperCase() === assetSymbol
                );
                
                if (!targetMarket) {
                    targetMarket = markets.find(m => 
                        m.ticker.toUpperCase().includes(assetSymbol)
                    );
                }
                
                elizaLogger.info("🎯 Found market for volume query:", targetMarket ? targetMarket.ticker : "Not found");
                
                if (targetMarket) {
                    try {
                        // Get detailed market data using specific endpoint
                        const detailedMarketData = await marketService.getMarketData(targetMarket.id);
                        
                        const volume24h = detailedMarketData.last24hVolume || 0;
                        const volumeFormatted = volume24h.toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        });
                        
                        const priceChange24h = detailedMarketData.priceChange24HPercentage || 0;
                        const priceChangeFormatted = priceChange24h.toFixed(2);
                        const priceChangeEmoji = priceChange24h >= 0 ? "📈" : "📉";
                        
                        const fundingRateFormatted = (detailedMarketData.fundingRate * 100).toFixed(4);
                        const fundingEmoji = detailedMarketData.fundingRate >= 0 ? "🔵" : "🔴";
                        
                        const openInterestFormatted = detailedMarketData.openInterest.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        });
                        
                        const longSkew = detailedMarketData.longSkewPercentage || 50;
                        const shortSkew = detailedMarketData.shortSkewPercentage || 50;
                        
                        if (queryType === "volume") {
                            response = `**${targetMarket.ticker} - 24h Trading Volume:**

💰 **Volume**: $${volumeFormatted}
${priceChangeEmoji} **24h Change**: ${priceChangeFormatted}%
📊 **Open Interest**: ${openInterestFormatted}
${fundingEmoji} **Funding Rate**: ${fundingRateFormatted}%

This represents the total dollar value of ${assetSymbol} traded in the last 24 hours on Reya DEX.`;
                        } else {
                            response = `**${targetMarket.ticker} - Detailed Market Data:**

💰 **24h Volume**: $${volumeFormatted}
${priceChangeEmoji} **24h Price Change**: ${priceChangeFormatted}%
📊 **Open Interest**: ${openInterestFormatted} (Long: ${longSkew}%, Short: ${shortSkew}%)
${fundingEmoji} **Funding Rate**: ${fundingRateFormatted}% (${detailedMarketData.fundingRate >= 0 ? 'paying longs' : 'paying shorts'})
🏛️ **Oracle Price**: $${detailedMarketData.oraclePrice?.toFixed(2)}
🏊 **Pool Price**: $${detailedMarketData.poolPrice?.toFixed(2)}
🎯 **Max Leverage**: ${targetMarket.maxLeverage}x
🔄 **Status**: ${targetMarket.isActive ? 'Active' : 'Inactive'}

**Market Activity Analysis:**
• ${longSkew > 55 ? 'Long-biased market' : shortSkew > 55 ? 'Short-biased market' : 'Balanced market'}
• ${Math.abs(detailedMarketData.fundingRate) > 0.01 ? 'High funding rate indicates strong directional bias' : 'Low funding rate shows balanced market'}
• Last updated: ${new Date(detailedMarketData.updatedAt).toLocaleTimeString()}`;
                        }
                        
                    } catch (error) {
                        elizaLogger.error("Error fetching detailed market data:", error);
                        // Fallback to basic data from marketsData
                        const marketData = marketsData.find(md => md.marketId === targetMarket.id);
                        const volume24h = marketData?.last24hVolume || 0;
                        const volumeFormatted = volume24h.toLocaleString('en-US', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        });
                        
                        response = `**${targetMarket.ticker} Trading Data:**

💰 **24h Volume**: $${volumeFormatted}
📊 **Market ID**: ${targetMarket.id}
🔄 **Status**: ${targetMarket.isActive ? 'Active' : 'Inactive'}

(Detailed market data temporarily unavailable)`;
                    }
                } else {
                    // Show available markets with similar names
                    const similarMarkets = markets.filter(m => {
                        const ticker = m.ticker.toUpperCase();
                        return ticker.includes(assetSymbol.substring(0, 2)) || 
                               ticker.includes(assetSymbol.substring(0, 3));
                    });
                    
                    const topMarkets = await marketService.getTopMarketsByVolume(5);
                    
                    response = `I couldn't find **${assetSymbol}** market on Reya Network.

${similarMarkets.length > 0 ? `**Similar markets**: ${similarMarkets.map(m => m.ticker).join(', ')}\n\n` : ''}**Top markets by volume**:
${topMarkets.map((md, idx) => {
                        const market = markets.find(m => m.id === md.marketId);
                        const volume = md.last24hVolume?.toLocaleString() || 'N/A';
                        return `${idx + 1}. ${market?.ticker || md.marketId}: $${volume}`;
                    }).join('\n')}`;
                }
            } else {
                // General market overview
                const topMarkets = await marketService.getTopMarketsByVolume(8);
                const activeMarkets = markets.filter(m => m.isActive);
                
                const totalVolume = marketsData.reduce((sum, md) => sum + (md.last24hVolume || 0), 0);
                const totalVolumeFormatted = totalVolume.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                });
                
                response = `**Reya Network Market Overview:**

📊 **Total Markets**: ${activeMarkets.length} active
💰 **Total 24h Volume**: $${totalVolumeFormatted}

**Top Markets by Volume:**
${topMarkets.map((md, idx) => {
                    const market = markets.find(m => m.id === md.marketId);
                    const volume = md.last24hVolume?.toLocaleString() || 'N/A';
                    return `${idx + 1}. **${market?.ticker || md.marketId}**: $${volume}`;
                }).join('\n')}

Reya DEX features cross-margining, unified liquidity pools, and 100ms block times for optimal trading experience.`;
            }

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
                    symbol,
                    queryType,
                    activeMarketsCount: markets.filter(m => m.isActive).length
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
