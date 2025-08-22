export * from "./priceTemplate.js";

export const reyaMarketTemplate = `# Reya Network Market Information

The agent has access to comprehensive market data from Reya Network including:

## Available Market Data:
- Active markets and their trading pairs
- Market statistics (volume, open interest, funding rates)
- Price information (mark price, oracle price, pool price)
- Market configuration and parameters

## Market Provider Context:
{{reyaMarketProvider}}

Use this information to provide insights about:
- Current market conditions on Reya Network
- Trading volumes and market activity
- Available trading pairs and their performance
- Market trends and funding rates

Be concise and focus on the most relevant market information for the user's query.`;

export const reyaPriceTemplate = `# Reya Network Price Information

The agent has access to real-time price data from Reya Network including:

## Available Price Data:
- Current prices for all trading pairs
- Oracle prices vs pool prices
- Price changes and trends
- Market pricing statistics

## Price Provider Context:
{{reyaPriceProvider}}

Use this information to provide insights about:
- Current asset prices on Reya Network
- Price differences between oracle and pool prices
- Recent price movements and trends
- Price comparison across different markets

Be concise and focus on the most relevant price information for the user's query.`;

export const reyaAssetTemplate = `# Reya Network Asset Information

The agent has access to comprehensive asset data from Reya Network including:

## Available Asset Data:
- All supported assets and tokens
- Asset contract addresses and decimals
- Asset names and symbols
- Asset configuration details

## Asset Provider Context:
{{reyaAssetProvider}}

Use this information to provide insights about:
- Available assets on Reya Network
- Asset specifications and details
- Asset search and discovery
- Asset contract information

Be concise and focus on the most relevant asset information for the user's query.`;