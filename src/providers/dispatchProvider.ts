import {
  type IAgentRuntime,
  type Memory,
  type State,
  type Provider,
  elizaLogger,
} from "@elizaos/core";

import { IntentAnalyzer, IntentType } from "../services/intentAnalyzer.js";

/**
 * Smart Dispatch Provider
 * Runs before action selection to analyze intent and populate state flags
 * so API actions can validate deterministically without requiring the
 * SMART_REYA_DISPATCH action handler to run first.
 */
export const smartDispatchProvider: Provider = {
  name: "SMART_REYA_DISPATCH_PROVIDER",
  description: "Analyzes user intent and sets smart dispatch gating flags",
  // Run early so flags are available to validators
  position: -50,
  private: true,

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State
  ) => {
    const text = message.content.text || "";
    const analyzer = new IntentAnalyzer(runtime);
    elizaLogger.info(`🔎 Smart Dispatch Provider: analyzing message: "${text}"`);

    try {
      const analysis = await analyzer.analyzeIntent(message);

      // Default flags
      let allowReyaActions = false;
      let blockOtherActions = false;
      let usedSource = "general";

      switch (analysis.intent) {
        case IntentType.KNOWLEDGE_QUERY:
          allowReyaActions = false;
          blockOtherActions = true; // block API actions, let knowledge answer
          usedSource = "knowledge_base";
          break;
        case IntentType.PRICE_QUERY:
        case IntentType.MARKET_QUERY:
        case IntentType.ASSET_QUERY:
          allowReyaActions = true;  // let Reya API actions validate
          blockOtherActions = false;
          usedSource = "reya_api";
          break;
        case IntentType.COMPARISON_QUERY:
        case IntentType.HISTORICAL_DATA_QUERY:
        case IntentType.GENERAL_CHAT:
        default:
          // Leave defaults; actions can make own decisions
          usedSource = analysis.intent.toLowerCase();
          break;
      }

      elizaLogger.info(
        "✅ Smart Dispatch Provider: intent=", analysis.intent,
        " allowReyaActions=", allowReyaActions,
        " blockOtherActions=", blockOtherActions
      );

      return {
        values: {
          smartDispatch: {
            intent: analysis.intent,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            shouldUseAPI: analysis.shouldUseAPI,
            shouldUseKnowledge: analysis.shouldUseKnowledge,
            allowReyaActions,
            blockOtherActions,
            usedSource,
            extractedEntities: analysis.extractedEntities || {},
            // Timestamp for debugging
            timestamp: Date.now(),
          },
        },
        data: {
          smartDispatchRaw: analysis,
        },
        text: undefined,
      };
    } catch (error) {
      elizaLogger.error("❌ Smart Dispatch Provider error:", error);
      // On error, do not gate; return no-op
      return { values: {}, data: { smartDispatchError: String(error) } };
    }
  },
};

export default smartDispatchProvider;

