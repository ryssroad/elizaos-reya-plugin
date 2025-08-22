import {
    type Action,
    type ActionResult,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
    composePrompt,
    ModelType,
    type HandlerCallback,
    type Content,
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

            // Extract price query from message 
            elizaLogger.info("Processing price query from message...");
            const text = message.content.text.toLowerCase();
            let symbol = "";
            
            // Simple symbol extraction
            if (text.includes("hype")) symbol = "HYPE";
            else if (text.includes("btc") || text.includes("bitcoin")) symbol = "BTC";
            else if (text.includes("eth") || text.includes("ethereum")) symbol = "ETH";
            else if (text.includes("sol") || text.includes("solana")) symbol = "SOL";
            else if (text.includes("usdc")) symbol = "USDC";
            else if (text.includes("usdt")) symbol = "USDT";
            else if (text.includes("avax") || text.includes("avalanche")) symbol = "AVAX";
            else if (text.includes("doge") || text.includes("dogecoin")) symbol = "DOGE";
            else if (text.includes("ada") || text.includes("cardano")) symbol = "ADA";
            else if (text.includes("dot") || text.includes("polkadot")) symbol = "DOT";
            else if (text.includes("link") || text.includes("chainlink")) symbol = "LINK";
            else if (text.includes("matic") || text.includes("polygon")) symbol = "MATIC";
            else if (text.includes("atom") || text.includes("cosmos")) symbol = "ATOM";
            else if (text.includes("rusd") || text.includes("reya")) symbol = "rUSD";
            
            elizaLogger.info("Extracted symbol:", symbol);
            
            const priceService = await initPriceService(runtime);
            const marketService = await initMarketService(runtime);
            
            const prices = await priceService.getPrices();
            const markets = await marketService.getMarkets();
            
            let responseText = "";
            
            if (symbol) {
                // Find specific asset price
                const assetSymbol = symbol.toUpperCase();
                const assetMarket = markets.find(m => 
                    m.ticker.toUpperCase().includes(assetSymbol)
                );
                
                if (assetMarket) {
                    const assetPrice = await priceService.getPriceByMarketId(parseInt(assetMarket.id));
                    if (assetPrice) {
                        responseText = `Current ${assetSymbol} price on Reya Network:

**${assetMarket.ticker}**
• Mark Price: $${priceService.formatPrice(assetPrice.price)}
• Oracle Price: $${priceService.formatPrice(assetPrice.oraclePrice)}
• Pool Price: $${priceService.formatPrice(assetPrice.poolPrice)}
• Last Update: ${new Date(assetPrice.updatedAt).toLocaleTimeString()}

The mark price is what you'll trade at, while oracle and pool prices show market dynamics.`;
                    } else {
                        responseText = `I found the ${assetMarket.ticker} market but couldn't get the current price. Please try again.`;
                    }
                } else {
                    responseText = `I couldn't find a ${assetSymbol} market on Reya Network. Available major pairs include BTC-rUSD, ETH-rUSD, and other perpetuals.`;
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