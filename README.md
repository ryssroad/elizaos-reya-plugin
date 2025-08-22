# elizaos-plugin-reya

[![npm version](https://badge.fury.io/js/elizaos-plugin-reya.svg)](https://badge.fury.io/js/elizaos-plugin-reya)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive ElizaOS plugin for integrating with **Reya Network DEX**, providing real-time market data, price information, and asset details.

## ✨ Features

- **Market Data**: Access to all markets, trading pairs, and market statistics
- **Price Information**: Real-time pricing data with oracle and pool prices
- **Asset Management**: Complete asset information and search capabilities
- **Caching**: Intelligent caching system for optimal performance
- **Error Handling**: Robust error handling and logging

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

### Available Providers

1. **Market Provider** (`reyaMarketProvider`)
   - Market listings and data
   - Trading volume information
   - Market statistics and trends

2. **Price Provider** (`reyaPriceProvider`)
   - Current asset prices
   - Oracle vs pool price comparisons
   - Price formatting and analysis

3. **Asset Provider** (`reyaAssetProvider`)
   - Asset information and specifications
   - Asset search functionality
   - Contract address details

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

## API Endpoints Used

- `GET /api/trading/markets` - Market listings
- `GET /api/trading/markets/data` - Market data
- `GET /api/trading/prices` - Price information
- `GET /api/trading/assets` - Asset information

## Caching Strategy

- **Markets**: 5 minutes TTL
- **Market Data**: 30 seconds TTL
- **Assets**: 30 minutes TTL
- **Prices**: 10 seconds TTL

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