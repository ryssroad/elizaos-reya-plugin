import { type IAgentRuntime } from "@elizaos/core";
import { REYA_API_BASE_URL } from "./constants/index.js";

export function getReyaConfig(runtime: IAgentRuntime) {
    return {
        REYA_API_BASE_URL: runtime.getSetting("REYA_API_BASE_URL") || REYA_API_BASE_URL,
    };
}

export async function validateReyaConfig(runtime: IAgentRuntime): Promise<void> {
    const config = getReyaConfig(runtime);
    
    if (!config.REYA_API_BASE_URL) {
        throw new Error("REYA_API_BASE_URL is required for Reya plugin");
    }

    // Validate URL format
    try {
        new URL(config.REYA_API_BASE_URL);
    } catch (error) {
        throw new Error("REYA_API_BASE_URL must be a valid URL");
    }
}