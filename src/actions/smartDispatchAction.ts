import {
    type Action,
    type ActionResult,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
    type HandlerCallback,
} from "@elizaos/core";

import { IntentDispatcher } from "../services/intentDispatcher.js";

export const smartDispatchAction: Action = {
    name: "SMART_REYA_DISPATCH",
    similes: [
        "REYA_SMART_ROUTER", 
        "REYA_INTENT_DISPATCHER",
        "REYA_INTELLIGENT_HANDLER"
    ],
    description: "Intelligently routes Reya Network queries to appropriate data sources based on user intent analysis",
    
    validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const messageText = message.content.text?.toLowerCase() || "";
        elizaLogger.info(`🔍 Smart Dispatch Validate: Checking message: "${messageText}"`);
        
        // This action should validate for ANY Reya-related query
        const reyaKeywords = [
            // General Reya mentions
            "reya", "рейя",
            
            // Assets/tokens that might be on Reya
            "rusd", "srusd", "btc", "eth", "sol", "usdc", "usdt",
            
            // Trading/DeFi concepts
            "цена", "price", "стоимость", "market", "рынок", "торги",
            "актив", "asset", "токен", "token",
            
            // Knowledge queries about DeFi/trading
            "что такое", "what is", "как работает", "how does",
            "perpetual", "перпетуал", "margin", "маржа",
            "liquidation", "ликвидация", "funding", "фандинг",
            
            // Questions that might be Reya-related
            "деривативы", "derivatives", "futures", "фьючерсы",
            "dex", "децентрализованная", "decentralized"
        ];
        
        const isReyaRelated = reyaKeywords.some(keyword => 
            messageText.includes(keyword)
        );
        
        if (isReyaRelated) {
            elizaLogger.info(`🎯 Smart Dispatch Validate: ACCEPTING Reya-related query: "${messageText}"`);
            return true;
        }
        
        elizaLogger.debug(`🔍 Smart Dispatch Validate: REJECTING non-Reya query: "${messageText}"`);
        return false;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<ActionResult> => {
        try {
            elizaLogger.info("🚀 Smart Dispatch Action: Starting intelligent routing...");
            elizaLogger.info(`📝 Message text: "${message.content.text}"`);
            
            elizaLogger.info("🔧 Creating IntentDispatcher...");
            const dispatcher = new IntentDispatcher(runtime);
            elizaLogger.info("✅ IntentDispatcher created successfully");
            
            elizaLogger.info("🎯 Calling dispatcher.dispatch...");
            const result = await dispatcher.dispatch(message, state, callback);
            elizaLogger.info(`📋 Dispatch result:`, result);
            
            if (result.response) {
                // Dispatcher handled the request completely
                elizaLogger.info("✅ Smart Dispatch: Complete response from dispatcher, blocking other actions");
                return {
                    success: true,
                    text: result.response,
                    values: {
                        handledBy: "smart_dispatcher",
                        source: result.usedSource,
                        timestamp: Date.now()
                    },
                    data: {
                        actionName: "SMART_REYA_DISPATCH",
                        source: result.usedSource,
                        dispatchResult: result
                    }
                };
            } else if (!result.shouldProceed) {
                // Dispatcher decided this should be handled by knowledge base
                // Return success but let knowledge plugin handle it
                elizaLogger.info("📚 Smart Dispatch: Routing to knowledge base, blocking API actions");
                
                return {
                    success: true,
                    text: "", // Empty response, let knowledge plugin respond
                    values: {
                        handledBy: "smart_dispatcher",
                        source: result.usedSource,
                        blocked_apis: true,
                        timestamp: Date.now()
                    },
                    data: {
                        actionName: "SMART_REYA_DISPATCH",
                        source: result.usedSource,
                        blockOtherActions: true
                    }
                };
            } else {
                // Let specific Reya actions proceed but block others
                elizaLogger.info("🔄 Smart Dispatch: Allowing specific Reya handlers to process");
                
                return {
                    success: true, // Block other actions by succeeding
                    text: "", // Empty response to let Reya actions handle
                    values: {
                        handledBy: "smart_dispatcher",
                        source: result.usedSource,
                        allow_reya_actions: true,
                        timestamp: Date.now()
                    },
                    data: {
                        actionName: "SMART_REYA_DISPATCH",
                        source: result.usedSource,
                        allowReyaActions: true
                    }
                };
            }

        } catch (error) {
            elizaLogger.error("❌ Smart Dispatch Action Error:", error);
            
            // On error, let other handlers try
            return {
                success: false,
                text: "Smart dispatch encountered an error, falling back to other handlers",
                error: error instanceof Error ? error : new Error(String(error)),
                data: {
                    actionName: "SMART_REYA_DISPATCH",
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
                    text: "что такое rUSD?"
                }
            },
            {
                name: "Aira",
                content: {
                    text: "I'll analyze your question about rUSD and provide the most appropriate response from our knowledge base.",
                    actions: ["SMART_REYA_DISPATCH"]
                }
            }
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "цена BTC на Reya"
                }
            },
            {
                name: "Aira",
                content: {
                    text: "I'll get the current BTC price from Reya Network for you.",
                    actions: ["SMART_REYA_DISPATCH"]
                }
            }
        ],
        [
            {
                name: "{{user1}}",
                content: {
                    text: "какие рынки доступны?"
                }
            },
            {
                name: "Aira",
                content: {
                    text: "Let me show you the available markets on Reya Network.",
                    actions: ["SMART_REYA_DISPATCH"]
                }
            }
        ]
    ]
};

export default smartDispatchAction;