import {
    type Action,
    type ActionResult,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
} from "@elizaos/core";

import { initAssetService } from "../providers/assetProvider.js";

export const getAssetsAction: Action = {
    name: "GET_REYA_ASSETS",
    description: "Get asset information from Reya Network including supported tokens, contracts, and asset details",
    
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = message.content.text.toLowerCase();
        return text.includes("asset") || 
               text.includes("token") || 
               text.includes("contract") ||
               text.includes("supported") ||
               text.includes("collateral") ||
               text.includes("usdc") ||
               text.includes("usdt") ||
               (text.includes("what") && text.includes("available"));
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: Function
    ): Promise<ActionResult> => {
        try {
            elizaLogger.info("Executing GET_REYA_ASSETS action");
            
            const assetService = await initAssetService(runtime);
            const assets = await assetService.getAssets();
            const summary = await assetService.getAssetsSummary();
            
            // Check if user asked for specific asset
            const text = message.content.text.toLowerCase();
            let specificAsset = null;
            
            if (text.includes("usdc")) {
                specificAsset = "USDC";
            } else if (text.includes("usdt")) {
                specificAsset = "USDT";
            } else if (text.includes("eth") || text.includes("ethereum")) {
                specificAsset = "ETH";
            }
            
            let response = "";
            
            if (specificAsset) {
                // Find specific asset
                const asset = await assetService.getAssetBySymbol(specificAsset);
                if (asset) {
                    response = `**${asset.name} (${asset.short})** Details:

• **Contract:** \`${asset.address}\`
• **Decimals:** ${asset.decimals}
• **Created:** ${new Date(asset.createdAt).toLocaleDateString()}
• **Last Updated:** ${new Date(asset.updatedAt).toLocaleDateString()}

This asset is supported for trading and collateral on Reya Network.`;
                } else {
                    response = `I couldn't find ${specificAsset} in the supported assets. Let me show you what's available.`;
                }
            } else {
                // General asset overview
                const majorAssets = assets.filter(a => 
                    ['USDC', 'USDT', 'ETH', 'BTC', 'WETH', 'WBTC'].includes(a.short.toUpperCase())
                ).slice(0, 10);
                
                response = `Reya Network Asset Overview:

**Summary**
• Total Supported Assets: ${summary.totalAssets}
• Decimal Configurations: ${summary.uniqueDecimals.join(', ')}
• Most Common: ${summary.uniqueDecimals.includes(18) ? '18 decimals (ERC-20 standard)' : 'Various'}

**Major Assets Available:**
${majorAssets.map(a => 
                    `• **${a.short}** (${a.name}) - ${a.decimals} decimals`
                ).join('\n')}

${majorAssets.length < assets.length ? `\n...and ${assets.length - majorAssets.length} more assets for trading and collateral.` : ''}

All assets support cross-collateralization and unified margin on Reya Network.`;
            }

            await callback({
                text: response,
                action: "GET_REYA_ASSETS"
            });

            return {
                success: true,
                text: response,
                data: {
                    assets,
                    summary,
                    specificAsset
                }
            };
        } catch (error) {
            elizaLogger.error("Error in GET_REYA_ASSETS action:", error);
            
            const errorMsg = "Sorry, I couldn't fetch the asset data from Reya Network right now. Please try again in a moment.";
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
};export default getAssetsAction;
