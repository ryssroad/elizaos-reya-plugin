#!/usr/bin/env node

import { REYA_API_BASE_URL } from "../constants/index.js";
import { ReyaMarketService } from "../providers/marketProvider.js";
import { ReyaPriceService } from "../providers/priceProvider.js";
import { ReyaAssetService } from "../providers/assetProvider.js";

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    duration: number;
    data?: any;
}

class ReyaPluginTester {
    private marketService: ReyaMarketService;
    private priceService: ReyaPriceService;
    private assetService: ReyaAssetService;
    private results: TestResult[] = [];

    constructor() {
        this.marketService = new ReyaMarketService(REYA_API_BASE_URL);
        this.priceService = new ReyaPriceService(REYA_API_BASE_URL);
        this.assetService = new ReyaAssetService(REYA_API_BASE_URL);
    }

    private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
        const startTime = Date.now();
        try {
            const data = await testFn();
            const duration = Date.now() - startTime;
            return {
                name,
                passed: true,
                duration,
                data
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            return {
                name,
                passed: false,
                error: error instanceof Error ? error.message : String(error),
                duration
            };
        }
    }

    async testMarketService(): Promise<void> {
        console.log("\n🏪 Testing Market Service...");

        // Test getMarkets
        const marketsResult = await this.runTest("Get Markets", async () => {
            const markets = await this.marketService.getMarkets();
            if (!Array.isArray(markets)) throw new Error("Markets should be an array");
            if (markets.length === 0) throw new Error("No markets returned");
            return { count: markets.length, firstMarket: markets[0] };
        });
        this.results.push(marketsResult);

        // Test getMarketsData
        const marketsDataResult = await this.runTest("Get Markets Data", async () => {
            const marketsData = await this.marketService.getMarketsData();
            if (!Array.isArray(marketsData)) throw new Error("Markets data should be an array");
            return { count: marketsData.length, firstMarketData: marketsData[0] };
        });
        this.results.push(marketsDataResult);

        // Test getTopMarketsByVolume
        const topMarketsResult = await this.runTest("Get Top Markets by Volume", async () => {
            const topMarkets = await this.marketService.getTopMarketsByVolume(3);
            if (!Array.isArray(topMarkets)) throw new Error("Top markets should be an array");
            if (topMarkets.length > 3) throw new Error("Should return max 3 markets");
            return { count: topMarkets.length, topMarkets };
        });
        this.results.push(topMarketsResult);
    }

    async testPriceService(): Promise<void> {
        console.log("\n💰 Testing Price Service...");

        // Test getPrices
        const pricesResult = await this.runTest("Get Prices", async () => {
            const prices = await this.priceService.getPrices();
            if (!Array.isArray(prices)) throw new Error("Prices should be an array");
            return { count: prices.length, firstPrice: prices[0] };
        });
        this.results.push(pricesResult);

        // Test getPricesSummary
        const summaryResult = await this.runTest("Get Prices Summary", async () => {
            const summary = await this.priceService.getPricesSummary();
            if (typeof summary.totalMarkets !== 'number') throw new Error("Invalid summary structure");
            return summary;
        });
        this.results.push(summaryResult);

        // Test formatPrice
        const formatResult = await this.runTest("Format Price", async () => {
            const formatted = this.priceService.formatPrice("1234567890");
            if (typeof formatted !== 'string') throw new Error("Formatted price should be a string");
            return { formatted };
        });
        this.results.push(formatResult);
    }

    async testAssetService(): Promise<void> {
        console.log("\n🪙 Testing Asset Service...");

        // Test getAssets
        const assetsResult = await this.runTest("Get Assets", async () => {
            const assets = await this.assetService.getAssets();
            if (!Array.isArray(assets)) throw new Error("Assets should be an array");
            return { count: assets.length, firstAsset: assets[0] };
        });
        this.results.push(assetsResult);

        // Test getAssetsSummary
        const assetSummaryResult = await this.runTest("Get Assets Summary", async () => {
            const summary = await this.assetService.getAssetsSummary();
            if (typeof summary.totalAssets !== 'number') throw new Error("Invalid summary structure");
            return summary;
        });
        this.results.push(assetSummaryResult);

        // Test searchAssets (if we have assets)
        if (assetsResult.passed && assetsResult.data?.firstAsset) {
            const searchResult = await this.runTest("Search Assets", async () => {
                const searchTerm = assetsResult.data.firstAsset.short.substring(0, 2);
                const searchResults = await this.assetService.searchAssets(searchTerm);
                if (!Array.isArray(searchResults)) throw new Error("Search results should be an array");
                return { searchTerm, count: searchResults.length };
            });
            this.results.push(searchResult);
        }
    }

    async testApiConnectivity(): Promise<void> {
        console.log("\n🌐 Testing API Connectivity...");

        const connectivityResult = await this.runTest("API Connectivity", async () => {
            const response = await fetch(`${REYA_API_BASE_URL}/api/trading/markets`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return { status: response.status, statusText: response.statusText };
        });
        this.results.push(connectivityResult);
    }

    private printResults(): void {
        console.log("\n" + "=".repeat(60));
        console.log("🧪 REYA PLUGIN TEST RESULTS");
        console.log("=".repeat(60));

        const passedTests = this.results.filter(r => r.passed);
        const failedTests = this.results.filter(r => !r.passed);

        console.log(`\n✅ Passed: ${passedTests.length}`);
        console.log(`❌ Failed: ${failedTests.length}`);
        console.log(`⏱️  Total Duration: ${this.results.reduce((sum, r) => sum + r.duration, 0)}ms`);

        if (failedTests.length > 0) {
            console.log("\n❌ FAILED TESTS:");
            failedTests.forEach(test => {
                console.log(`   • ${test.name}: ${test.error} (${test.duration}ms)`);
            });
        }

        if (passedTests.length > 0) {
            console.log("\n✅ PASSED TESTS:");
            passedTests.forEach(test => {
                console.log(`   • ${test.name} (${test.duration}ms)`);
            });
        }

        console.log("\n" + "=".repeat(60));

        if (failedTests.length === 0) {
            console.log("🎉 All tests passed! Plugin is ready for integration.");
        } else {
            console.log("⚠️  Some tests failed. Please check the Reya API connectivity and configuration.");
        }
    }

    async runAllTests(): Promise<void> {
        console.log("🚀 Starting Reya Plugin Tests...");
        console.log(`📡 Testing against: ${REYA_API_BASE_URL}`);

        try {
            await this.testApiConnectivity();
            await this.testMarketService();
            await this.testPriceService();
            await this.testAssetService();
        } catch (error) {
            console.error("💥 Unexpected error during testing:", error);
        }

        this.printResults();
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new ReyaPluginTester();
    await tester.runAllTests();
}