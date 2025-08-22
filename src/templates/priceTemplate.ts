export const priceTemplate = `<task>
Look at your LAST RESPONSE in the conversation where you confirmed which asset
price to fetch from Reya DEX.
Based on ONLY that last message, extract the asset symbol.
</task>

<context>
Recent conversation:
{{recentMessages}}
</context>

<examples>
- "I'll check the current price of SOL for you" -> SOL
- "Let me get the SOL price on Reya DEX" -> SOL
- "Проверю цену SOL на Reya Network" -> SOL
- "I'll fetch the BTC price from Reya" -> BTC
- "Checking ETH price on Reya DEX now" -> ETH
</examples>

<instructions>
1. Look for asset symbols in your last response (SOL, BTC, ETH, etc.)
2. Return only the symbol, no extra words
3. If no specific symbol mentioned, return "OVERVIEW" for general market data
</instructions>

<response>
    <pair>SOL</pair>
</response>`;