import {
    type IAgentRuntime,
    type Memory,
    elizaLogger,
    ModelType,
} from "@elizaos/core";

export enum IntentType {
    KNOWLEDGE_QUERY = "KNOWLEDGE_QUERY",
    LIVE_DATA_QUERY = "LIVE_DATA_QUERY", 
    HISTORICAL_DATA_QUERY = "HISTORICAL_DATA_QUERY",
    COMPARISON_QUERY = "COMPARISON_QUERY",
    GENERAL_CHAT = "GENERAL_CHAT",
    PRICE_QUERY = "PRICE_QUERY",
    MARKET_QUERY = "MARKET_QUERY",
    ASSET_QUERY = "ASSET_QUERY"
}

export interface IntentAnalysisResult {
    intent: IntentType;
    confidence: number;
    reasoning: string;
    shouldUseAPI: boolean;
    shouldUseKnowledge: boolean;
    extractedEntities?: {
        assets?: string[];
        timeframe?: string;
        queryType?: string;
    };
}

export class IntentAnalyzer {
    constructor(private runtime: IAgentRuntime) {}

    async analyzeIntent(message: Memory): Promise<IntentAnalysisResult> {
        const userMessage = message.content.text || "";
        
        elizaLogger.info(`🧠 Analyzing intent for message: "${userMessage}"`);
        
        const analysisPrompt = `
You are an expert intent analyzer for a Reya Network DEX assistant. Analyze the user's message and determine their intent.

USER MESSAGE: "${userMessage}"

AVAILABLE INTENT TYPES:

1. KNOWLEDGE_QUERY - User wants explanations, definitions, concepts, how things work
   Examples: "что такое rUSD?", "как работает cross-margining?", "explain perpetual futures"
   
2. PRICE_QUERY - User wants current/live price data for specific assets
   Examples: "цена BTC", "current ETH price", "сколько стоит SOL"
   
3. MARKET_QUERY - User wants market information, trading data, volumes, etc.
   Examples: "какие рынки доступны?", "show me markets", "trading volume"
   
4. ASSET_QUERY - User wants information about supported assets/tokens
   Examples: "какие активы поддерживаются?", "list all assets", "supported tokens"
   
5. HISTORICAL_DATA_QUERY - User wants past data, charts, trends
   Examples: "график за неделю", "price history", "24h change"
   
6. COMPARISON_QUERY - User wants to compare multiple assets/markets
   Examples: "сравни BTC и ETH", "compare markets", "which is better"
   
7. GENERAL_CHAT - General conversation, greetings, unrelated topics
   Examples: "hello", "привет", "how are you", "thanks"

ANALYSIS RULES:
- If user asks "что такое", "what is", "explain", "как работает" → KNOWLEDGE_QUERY
- If user asks for "цена", "price", "стоимость", "сколько стоит" → PRICE_QUERY  
- If user asks about "рынки", "markets", "торги" → MARKET_QUERY
- If user asks about "активы", "assets", "токены" → ASSET_QUERY
- If user asks for "график", "chart", "история" → HISTORICAL_DATA_QUERY
- If user asks to "сравни", "compare", "vs" → COMPARISON_QUERY
- Otherwise → GENERAL_CHAT

Respond with this JSON format:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this intent was chosen",
  "shouldUseAPI": true/false,
  "shouldUseKnowledge": true/false,
  "extractedEntities": {
    "assets": ["BTC", "ETH"],
    "timeframe": "24h",
    "queryType": "price"
  }
}

IMPORTANT GUIDELINES:
- KNOWLEDGE_QUERY → shouldUseAPI: false, shouldUseKnowledge: true
- PRICE_QUERY → shouldUseAPI: true, shouldUseKnowledge: false  
- MARKET_QUERY → shouldUseAPI: true, shouldUseKnowledge: false
- ASSET_QUERY → shouldUseAPI: true, shouldUseKnowledge: false
- COMPARISON_QUERY → shouldUseAPI: true, shouldUseKnowledge: true
- GENERAL_CHAT → shouldUseAPI: false, shouldUseKnowledge: false

Analyze the message and respond with JSON only:`;

        try {
            const response = await this.runtime.useModel(ModelType.TEXT_SMALL, {
                prompt: analysisPrompt,
            });

            elizaLogger.info(`🤖 LLM Response: ${response}`);

            // Parse JSON response
            const analysisResult = this.parseAnalysisResponse(response);
            
            elizaLogger.info(`🎯 Intent Analysis Result:`, {
                intent: analysisResult.intent,
                confidence: analysisResult.confidence,
                shouldUseAPI: analysisResult.shouldUseAPI,
                shouldUseKnowledge: analysisResult.shouldUseKnowledge,
                reasoning: analysisResult.reasoning
            });

            return analysisResult;

        } catch (error) {
            elizaLogger.error("Error in intent analysis:", error);
            
            // Fallback to simple keyword-based analysis
            return this.fallbackAnalysis(userMessage);
        }
    }

    private parseAnalysisResponse(response: string): IntentAnalysisResult {
        try {
            // Clean the response - remove markdown formatting if present
            const cleanResponse = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();

            const parsed = JSON.parse(cleanResponse);

            return {
                intent: parsed.intent as IntentType,
                confidence: parsed.confidence || 0.8,
                reasoning: parsed.reasoning || "LLM analysis",
                shouldUseAPI: parsed.shouldUseAPI || false,
                shouldUseKnowledge: parsed.shouldUseKnowledge || false,
                extractedEntities: parsed.extractedEntities || {}
            };

        } catch (parseError) {
            elizaLogger.warn("Failed to parse LLM response, using fallback:", parseError);
            throw parseError;
        }
    }

    private fallbackAnalysis(userMessage: string): IntentAnalysisResult {
        const text = userMessage.toLowerCase();
        
        // Simple fallback logic
        if (text.includes("что такое") || text.includes("what is") || text.includes("explain")) {
            return {
                intent: IntentType.KNOWLEDGE_QUERY,
                confidence: 0.7,
                reasoning: "Fallback: detected explanation request",
                shouldUseAPI: false,
                shouldUseKnowledge: true
            };
        }
        
        if (text.includes("цена") || text.includes("price") || text.includes("стоимость")) {
            return {
                intent: IntentType.PRICE_QUERY,
                confidence: 0.7,
                reasoning: "Fallback: detected price request",
                shouldUseAPI: true,
                shouldUseKnowledge: false
            };
        }
        
        return {
            intent: IntentType.GENERAL_CHAT,
            confidence: 0.5,
            reasoning: "Fallback: no clear intent detected",
            shouldUseAPI: false,
            shouldUseKnowledge: false
        };
    }
}