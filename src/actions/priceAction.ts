import {
    type Action,
    type ActionResult,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
    parseKeyValueXml,
    type HandlerCallback,
    type Content,
    ModelType,
} from "@elizaos/core";
import { z } from "zod";

import { initPriceService } from "../providers/priceProvider.js";
import { initMarketService } from "../providers/marketProvider.js";

const priceTemplate = `
Extract the following parameters for Reya Network price data:
- **symbol** (string | null): The asset symbol to get price for (e.g., "SOL", "BTC", "ETH", "HYPE") or null for general overview  
- **type** (string): Either "specific_price" for individual assets or "general_overview" for market data

IMPORTANT: Look for cryptocurrency symbols in the user message. Common patterns:
- English: "price of BTC", "SOL price", "how much is ETH", "HYPE cost", "Bitcoin value"
- Russian: "цена BTC", "сколько стоит SOL", "цену ETH", "стоимость HYPE", "что стоит Bitcoin"

Provide the values in the following JSON format:

\`\`\`json
{
    "symbol": "SOL",
    "type": "specific_price"
}
\`\`\`

Example request: "What's the current price of SOL?"
Example response:
\`\`\`json
{
    "symbol": "SOL", 
    "type": "specific_price"
}
\`\`\`

Example request: "Show me market overview"
Example response:
\`\`\`json
{
    "symbol": null,
    "type": "general_overview"
}
\`\`\`

Example request: "цена HYPE на Reya"
Example response:
\`\`\`json
{
    "symbol": "HYPE",
    "type": "specific_price"
}
\`\`\`

Example request: "сколько стоит SOL"
Example response:
\`\`\`json
{
    "symbol": "SOL",
    "type": "specific_price"
}
\`\`\`

Example request: "Bitcoin price"
Example response:
\`\`\`json
{
    "symbol": "BTC",
    "type": "specific_price"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}

Based on the conversation above, if the request is for Reya Network price data, extract the appropriate parameters and respond with a JSON object.`;

export const GetReyaPriceSchema = z.object({
    symbol: z.string().nullable(),
    type: z.enum(["specific_price", "general_overview"]).default("general_overview")
});

export type GetReyaPriceContent = z.infer<typeof GetReyaPriceSchema> & Content;

export const getPricesAction: Action = {
    name: "GET_REYA_PRICES",
    similes: [
        "REYA_PRICE_CHECK",
        "REYA_SPECIFIC_PRICE", 
        "REYA_PRICE_LOOKUP",
        "REYA_PRICE_DATA",
        "CHECK_REYA_PRICE"
    ],
    description: "Get current prices from Reya Network DEX for specific assets or general price overview",
    
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        // Check for price-related keywords in Russian and English
        const messageText = message.content.text?.toLowerCase() || "";
        const priceKeywords = [
            // English keywords
            "price", "cost", "worth", "value", "trading", "market", "quote",
            "how much", "what's the price", "current price", "price of",
            
            // Russian keywords  
            "цена", "стоимость", "сколько стоит", "цену", "цены", "прайс",
            "что стоит", "стоит", "сколько", "торги", "котировки"
        ];
        
        const cryptoSymbols = [
            "btc", "bitcoin", "eth", "ethereum", "sol", "solana", "usdc", "usdt",
            "hype", "doge", "ada", "matic", "avax", "link", "uni", "aave"
        ];
        
        // Check if message contains price keywords
        const hasPriceKeyword = priceKeywords.some(keyword => 
            messageText.includes(keyword)
        );
        
        // Check if message mentions crypto symbols or "reya"
        const hasCryptoSymbol = cryptoSymbols.some(symbol => 
            messageText.includes(symbol)
        ) || messageText.includes("reya");
        
        // Validate if it's a price-related query
        return hasPriceKeyword || hasCryptoSymbol;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<ActionResult> => {
        try {
            elizaLogger.info("Starting Reya GET_PRICE handler...");

            // Initialize state
            let currentState = state;
            if (!currentState) {
                currentState = (await runtime.composeState(message)) as State;
            }

            // Extract price query using AI
            elizaLogger.info("Using AI to extract cryptocurrency from message...");
            
            const extractionPrompt = `
You are a cryptocurrency symbol extraction expert. Your task is to identify ANY cryptocurrency symbol or token mentioned in user messages.

EXTRACTION RULES:
1. Look for ANY 2-5 character uppercase combinations (BTC, ETH, UNI, SOL, AAVE, etc.)
2. Look for common cryptocurrency names (Bitcoin, Ethereum, Uniswap, etc.)
3. Look for mixed case tokens (Uni, Btc, Eth, etc.) - normalize to uppercase
4. If MULTIPLE symbols found, extract the FIRST ONE mentioned
5. If NO specific symbol found, use type="general"

EXAMPLES:
- "check UNI price" → symbol: UNI, type: specific
- "BTC price please" → symbol: BTC, type: specific  
- "what is Bitcoin worth" → symbol: BTC, type: specific
- "Ethereum price on Reya" → symbol: ETH, type: specific
- "цена HYPE" → symbol: HYPE, type: specific
- "show me prices" → symbol: "", type: general
- "market overview" → symbol: "", type: general

COMMON MAPPINGS:
Bitcoin/BTC → BTC | Ethereum/ETH → ETH | Solana/SOL → SOL
Uniswap/UNI → UNI | Aave/AAVE → AAVE | Chainlink/LINK → LINK
HYPE → HYPE | USDC → USDC | USDT → USDT

FORMAT: Return ONLY this XML structure:
<response>
  <symbol>EXTRACTED_SYMBOL_OR_EMPTY</symbol>
  <type>specific_or_general</type>
</response>

USER MESSAGE: "${message.content.text}"

EXTRACT NOW:`;

            const llmResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
                prompt: extractionPrompt,
            });

            elizaLogger.info("LLM response:", llmResponse);
            
            // Parse the XML response
            const extractedData = parseKeyValueXml(llmResponse);
            elizaLogger.info("Extracted data:", extractedData);
            
            const symbol = extractedData.symbol || "";
            const queryType = extractedData.type || "general";
            
            elizaLogger.info("Extracted symbol:", symbol, "Type:", queryType);
            
            const priceService = await initPriceService(runtime);
            const marketService = await initMarketService(runtime);
            
            const prices = await priceService.getPrices();
            const markets = await marketService.getMarkets();
            
            let responseText = "";
            
            if (symbol && queryType === "specific") {
                // Find specific asset price using fuzzy matching
                const assetSymbol = symbol.toUpperCase();
                elizaLogger.info("🔍 Searching for market with symbol:", assetSymbol);
                
                // Log available markets for debugging
                elizaLogger.info("📋 Available markets tickers:", markets.map(m => m.ticker).join(', '));
                
                // Try multiple matching strategies
                let assetMarket = null;
                
                // 1. Exact ticker match (e.g., "UNI-rUSD")
                assetMarket = markets.find(m => m.ticker.toUpperCase() === assetSymbol);
                elizaLogger.info(`1️⃣ Exact ticker match for "${assetSymbol}":`, assetMarket?.ticker || "❌ Not found");
                
                // 2. Ticker starts with symbol (e.g., "UNI" matches "UNI-rUSD")
                if (!assetMarket) {
                    assetMarket = markets.find(m => 
                        m.ticker.toUpperCase().startsWith(assetSymbol + '-') || 
                        m.ticker.toUpperCase() === assetSymbol
                    );
                    elizaLogger.info(`2️⃣ Ticker starts with "${assetSymbol}":`, assetMarket?.ticker || "❌ Not found");
                }
                
                // 3. Ticker contains symbol (fuzzy match)
                if (!assetMarket) {
                    assetMarket = markets.find(m => 
                        m.ticker.toUpperCase().includes(assetSymbol)
                    );
                    elizaLogger.info(`3️⃣ Ticker contains "${assetSymbol}":`, assetMarket?.ticker || "❌ Not found");
                }
                
                // 4. Base asset match 
                if (!assetMarket) {
                    assetMarket = markets.find(m => 
                        m.baseAsset && m.baseAsset.toUpperCase() === assetSymbol
                    );
                    elizaLogger.info(`4️⃣ Base asset match for "${assetSymbol}":`, assetMarket?.ticker || "❌ Not found");
                }
                
                // 5. Try partial matches on ticker components
                if (!assetMarket) {
                    assetMarket = markets.find(m => {
                        const tickerParts = m.ticker.toUpperCase().split('-');
                        return tickerParts.some(part => part === assetSymbol || part.includes(assetSymbol));
                    });
                    elizaLogger.info(`5️⃣ Ticker component match for "${assetSymbol}":`, assetMarket?.ticker || "❌ Not found");
                }
                
                elizaLogger.info("🎯 Final selected market:", assetMarket ? assetMarket.ticker : "❌ No matches found");
                
                if (assetMarket) {
                    const assetPrice = await priceService.getPriceByMarketId(parseInt(assetMarket.id));
                    if (assetPrice) {
                        try {
                            // Also get market data for 24h changes
                            const marketData = await marketService.getMarketData(assetMarket.id);
                            const priceChange24h = marketData.priceChange24HPercentage || 0;
                            const priceChangeFormatted = priceChange24h.toFixed(2);
                            const priceChangeEmoji = priceChange24h >= 0 ? "📈" : "📉";
                            const priceChangeText = priceChange24h >= 0 ? "+" : "";
                            
                            responseText = `Current ${assetSymbol} price on Reya Network:

**${assetMarket.ticker}**
• Mark Price: $${priceService.formatPrice(assetPrice.price)}
• Oracle Price: $${priceService.formatPrice(assetPrice.oraclePrice)}
• Pool Price: $${priceService.formatPrice(assetPrice.poolPrice)}
${priceChangeEmoji} **24h Change**: ${priceChangeText}${priceChangeFormatted}%
• Last Update: ${new Date(assetPrice.updatedAt).toLocaleTimeString()}

The mark price is what you'll trade at, while oracle and pool prices show market dynamics.`;
                        } catch (marketDataError) {
                            elizaLogger.warn("Could not fetch 24h change data:", marketDataError);
                            // Fallback without 24h change
                            responseText = `Current ${assetSymbol} price on Reya Network:

**${assetMarket.ticker}**
• Mark Price: $${priceService.formatPrice(assetPrice.price)}
• Oracle Price: $${priceService.formatPrice(assetPrice.oraclePrice)}
• Pool Price: $${priceService.formatPrice(assetPrice.poolPrice)}
• Last Update: ${new Date(assetPrice.updatedAt).toLocaleTimeString()}

The mark price is what you'll trade at, while oracle and pool prices show market dynamics.`;
                        }
                    } else {
                        responseText = `I found the ${assetMarket.ticker} market but couldn't get the current price. Please try again.`;
                    }
                } else {
                    elizaLogger.info(`❌ ${assetSymbol} not found. Analyzing available markets...`);
                    
                    // Show available similar markets with detailed analysis
                    const activeMarkets = markets.filter(m => m.isActive);
                    const similarMarkets = activeMarkets.filter(m => {
                        const ticker = m.ticker.toUpperCase();
                        const symbol = assetSymbol.toUpperCase();
                        
                        // Check for partial matches
                        return ticker.includes(symbol.substring(0, 2)) || 
                               ticker.includes(symbol.substring(0, 3)) ||
                               symbol.includes(ticker.split('-')[0].substring(0, 2));
                    });
                    
                    elizaLogger.info(`🔍 Found ${similarMarkets.length} similar markets:`, 
                        similarMarkets.map(m => m.ticker).join(', '));
                    
                    const availableMarkets = activeMarkets
                        .slice(0, 15)
                        .map(m => m.ticker)
                        .join(', ');
                    
                    let suggestionText = "";
                    if (similarMarkets.length > 0) {
                        suggestionText = `\n\n🤔 **Did you mean one of these?**\n${similarMarkets.map(m => m.ticker).join(', ')}\n`;
                    }
                    
                    responseText = `I couldn't find a **${assetSymbol}** market on Reya Network. ${suggestionText}

📋 **Available markets** (first 15): ${availableMarkets}

💡 **Tips**: 
- Try asking for "market overview" to see all markets
- Check if the token was just added (cache updates every 30 seconds)
- Use exact ticker format like "BTC-rUSD"`;
                }
            } else {
                // General price overview
                const summary = await priceService.getPricesSummary();
                const validPrices = prices.filter(p => p.price && Number.isFinite(parseFloat(p.price)));
                const topPrices = validPrices.slice(0, 5);
                
                responseText = `Reya Network Market Overview:

**${summary.totalMarkets} Active Markets**
${topPrices.map((p, i) => {
    const market = markets.find(m => parseInt(m.id) === p.marketId);
    return `${i + 1}. ${market?.ticker || `Market ${p.marketId}`}: $${priceService.formatPrice(p.price)}`;
}).join('\n')}

**Market Statistics:**
• Average Price: $${priceService.formatPrice(summary.averagePrice)}
• Price Range: $${priceService.formatPrice(summary.priceRange.min)} - $${priceService.formatPrice(summary.priceRange.max)}
• Last Update: ${summary.lastUpdate ? new Date(summary.lastUpdate).toLocaleTimeString() : 'N/A'}

All prices are real-time and sourced from Reya Network's oracle system.`;
            }

            if (callback) {
                callback({
                    text: responseText,
                    content: {
                        symbol: symbol,
                        type: symbol ? "specific_price" : "general_overview",
                        prices: symbol ? prices.filter(p => {
                            const market = markets.find(m => parseInt(m.id) === p.marketId);
                            return market?.ticker.toUpperCase().includes(symbol.toUpperCase());
                        }) : prices.slice(0, 10)
                    }
                });
            }

            return {
                success: true,
                text: responseText,
                values: {
                    symbol: symbol,
                    type: symbol ? "specific_price" : "general_overview",
                    pricesFetched: true,
                    timestamp: Date.now()
                },
                data: {
                    actionName: "GET_REYA_PRICES",
                    symbol: symbol,
                    prices: symbol ? prices.filter(p => {
                        const market = markets.find(m => parseInt(m.id) === p.marketId);
                        return market?.ticker.toUpperCase().includes(symbol.toUpperCase());
                    }) : prices.slice(0, 10),
                    markets: markets.length
                }
            };
        } catch (error) {
            elizaLogger.error("Error in GET_REYA_PRICES handler:", error);

            const errorMessage = "Sorry, I couldn't fetch the price data from Reya Network right now. Please try again in a moment.";
            
            if (callback) {
                callback({
                    text: errorMessage,
                    content: {
                        error: error instanceof Error ? error.message : "Unknown error"
                    }
                });
            }
            
            return {
                success: false,
                text: errorMessage,
                error: error instanceof Error ? error : new Error(String(error)),
                data: {
                    actionName: "GET_REYA_PRICES",
                    errorDetails: error instanceof Error ? error.message : String(error),
                    timestamp: Date.now()
                }
            };
        }
    },

    examples: [
        [
            {
                name: "{{user1}}",
                content: {
                    text: "What's the current price of SOL on Reya?"
                }
            },
            {
                name: "Aira",
                content: {
                    text: "I'll check the current SOL price on Reya Network for you.",
                    actions: ["GET_REYA_PRICES"]
                }
            }
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "сколько стоит HYPE"
                }
            },
            {
                name: "Aira", 
                content: {
                    text: "Проверю текущую цену HYPE на Reya Network.",
                    actions: ["GET_REYA_PRICES"]
                }
            }
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "Bitcoin price on Reya"
                }
            },
            {
                name: "Aira",
                content: {
                    text: "Let me get the current BTC price from Reya Network.",
                    actions: ["GET_REYA_PRICES"]
                }
            }
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "цена ETH на рейе"
                }
            },
            {
                name: "Aira",
                content: {
                    text: "Получаю актуальную цену ETH на Reya Network.",
                    actions: ["GET_REYA_PRICES"]
                }
            }
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "show me market overview"
                }
            },
            {
                name: "Aira",
                content: {
                    text: "I'll provide you with a market overview from Reya Network.",
                    actions: ["GET_REYA_PRICES"]
                }
            }
        ]
    ]
};

export default getPricesAction;