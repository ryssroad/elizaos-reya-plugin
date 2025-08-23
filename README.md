# elizaos-plugin-reya

[![npm version](https://badge.fury.io/js/elizaos-plugin-reya.svg)](https://badge.fury.io/js/elizaos-plugin-reya)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive ElizaOS plugin for integrating with **Reya Network DEX**, providing AI-powered market analysis, real-time price data, and intelligent trading insights.

## 🚀 Key Features

### 🤖 **AI-Powered Symbol Recognition**
- **Universal Token Detection**: Extracts any cryptocurrency symbol from natural language queries
- **Multi-Language Support**: Handles English and Russian queries seamlessly
- **Fuzzy Matching**: Finds tokens even with partial or inexact names
- **Smart Context Understanding**: Differentiates between price, volume, and market data requests

### 📊 **Comprehensive Market Data**
- **Real-time Prices**: Mark, oracle, and pool prices with 24h change indicators
- **Trading Volumes**: 24-hour volume data with detailed market statistics
- **Advanced Analytics**: Funding rates, open interest, and long/short bias analysis
- **Market Intelligence**: Automatic market condition assessment (balanced/biased)

### 💡 **Intelligent Features**
- **Natural Language Processing**: Handles queries like "what's BTC price?" or "объем торгов SOL"
- **Dynamic Price Formatting**: Correctly displays both large prices ($50,000) and small tokens ($0.0001)
- **Contextual Responses**: Provides different levels of detail based on user intent
- **Error Recovery**: Graceful fallbacks with helpful suggestions when tokens aren't found

## 📦 Installation

```bash
npm install elizaos-plugin-reya
```

Or with yarn:

```bash
yarn add elizaos-plugin-reya
```

## Configuration

The plugin can be configured using environment variables:

```bash
export REYA_API_BASE_URL="https://api.reya.xyz"  # Optional, defaults to official API
```

## Usage

### In ElizaOS Agent

```typescript
import { reyaPlugin } from "elizaos-plugin-reya";

// Add to your character configuration
export const character: Character = {
    name: "YourAgent",
    plugins: [
        "@elizaos/plugin-bootstrap",
        "@elizaos/plugin-sql", 
        // Add Reya Network plugin
        reyaPlugin,
        // ... other plugins
    ],
    // ... rest of character config
};
```

### Direct Import

```typescript
import { reyaPlugin, ReyaMarketService, ReyaPriceService } from "elizaos-plugin-reya";

// Use services directly
const marketService = new ReyaMarketService("https://api.reya.xyz");
const markets = await marketService.getMarkets();
```

## 🎯 **Example Interactions**

### 💰 Price Queries
```
User: "What's the current BTC price?"
Agent: Current BTC price on Reya Network:
        **BTC-rUSD**
        • Mark Price: $43,250.00
        • Oracle Price: $43,251.12
        • Pool Price: $43,249.87
        📈 **24h Change**: +2.15%
        • Last Update: 3:45:22 PM
```

### 📊 Volume & Market Data
```
User: "ETH volume today"
Agent: **ETH-rUSD - 24h Trading Volume:**
        💰 **Volume**: $12,345,678
        📈 **24h Change**: +1.87%
        📊 **Open Interest**: 1,234.56
        🔵 **Funding Rate**: 0.0125%
```

### 🔍 Advanced Market Analysis  
```
User: "SOL market data"
Agent: **SOL-rUSD - Detailed Market Data:**
        💰 **24h Volume**: $8,765,432
        📈 **24h Price Change**: +3.42%
        📊 **Open Interest**: 987.65 (Long: 60%, Short: 40%)
        🔵 **Funding Rate**: 0.0087% (paying longs)
        🎯 **Max Leverage**: 25x
        
        **Market Activity Analysis:**
        • Long-biased market
        • Low funding rate shows balanced market
```

### 🌐 Multi-Language Support
```
User: "цена HYPE на рейе"
Agent: Current HYPE price on Reya Network: [detailed price data]

User: "объем торгов за сутки BNB"  
Agent: **BNB-rUSD - 24h Trading Volume:** [volume statistics]
```

## 🛠️ Available Actions

### 1. **GET_REYA_PRICES** - Universal Price Lookup
- **Triggers**: "price", "cost", "worth", "цена", "стоимость"
- **Capabilities**: 
  - AI-powered symbol extraction from any query
  - Real-time price data with 24h changes
  - Oracle, mark, and pool price comparison
  - Support for any cryptocurrency on Reya DEX

### 2. **GET_REYA_MARKETS** - Volume & Market Intelligence
- **Triggers**: "volume", "trading", "market", "объем", "торги"  
- **Capabilities**:
  - 24-hour trading volume analysis
  - Funding rate monitoring
  - Open interest and long/short bias tracking
  - Market condition assessment
  - Top volume markets overview

### 3. **GET_REYA_ASSETS** - Asset Information
- **Triggers**: "asset", "token", "contract"
- **Capabilities**:
  - Complete asset specifications
  - Contract address lookup
  - Asset search functionality

### Available Providers

1. **Market Provider** (`reyaMarketProvider`)
   - Real-time market data and statistics
   - Detailed market analysis with funding rates
   - Advanced open interest tracking

2. **Price Provider** (`reyaPriceProvider`)
   - Multi-source price data (mark, oracle, pool)
   - Smart price formatting for any token size
   - 24-hour price change tracking

3. **Asset Provider** (`reyaAssetProvider`)
   - Comprehensive asset information
   - Contract address resolution
   - Asset search capabilities

## Testing

Run the comprehensive test suite to verify plugin functionality:

```bash
npm test
```

The test suite includes:
- API connectivity verification
- Market data retrieval tests
- Price service functionality tests
- Asset service tests
- Caching mechanism tests

## 🔗 API Endpoints Used

- `GET /api/trading/markets` - Market listings and basic information
- `GET /api/trading/markets/data` - Aggregated market data and statistics  
- `GET /api/trading/market/:id/data` - Detailed individual market data
- `GET /api/trading/prices` - Real-time price information
- `GET /api/trading/assets` - Asset information and specifications

## ⚡ Optimized Caching Strategy

- **Markets**: 30 seconds TTL (fast new token detection)
- **Market Data**: 30 seconds TTL (real-time trading data)
- **Assets**: 30 seconds TTL (dynamic asset discovery)
- **Prices**: 10 seconds TTL (near real-time pricing)
- **Fee Parameters**: 1 hour TTL (stable configuration data)

**Smart Caching Benefits:**
- Reduced API calls while maintaining data freshness
- Fast response times for frequently requested data
- Automatic cache invalidation for optimal performance

## Error Handling

The plugin includes comprehensive error handling:
- Network connectivity issues
- API response validation
- Cache fallback mechanisms
- Detailed error logging

## Development

### Build

```bash
npm run build
```

### Project Structure

```
src/
├── constants/       # API endpoints and cache configuration
├── types/          # TypeScript interfaces
├── providers/      # Data providers (market, price, asset)
├── templates/      # Response templates
├── tests/         # Test suite
├── environment.ts # Configuration management
└── index.ts       # Main plugin export
```

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

Feel free to check [issues page](https://github.com/elizaos/eliza/issues).

## 📄 License

This project is [MIT](LICENSE) licensed.

## 🙏 Acknowledgments

- Built for the [ElizaOS](https://github.com/elizaos/eliza) ecosystem
- Powered by [Reya Network](https://reya.xyz) API
- Created with ❤️ by the ElizaOS community

---

**Made with ❤️ for the ElizaOS community**