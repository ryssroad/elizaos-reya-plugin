export interface Market {
    id: string;
    assetPairId: string;
    ticker: string;
    markPrice: number;
    isActive: boolean;
    maxLeverage: number;
    description: string;
    name: string;
    tickSizeDecimals: number;
    priority: number;
}

export interface MarketData {
    marketId: string;
    updatedAt: number;
    longOI: number;
    shortOI: number;
    longSkewPercentage: number;
    shortSkewPercentage: number;
    openInterest: number;
    fundingRate: number;
    fundingRateVelocity: number;
    last24hVolume: number;
    maxAmountBaseLong: number;
    maxAmountBaseShort: number;
    maxAmountSizeLong: number;
    maxAmountSizeShort: number;
    priceChange24H: number;
    priceChange24HPercentage: number;
    poolPrice: number;
    oraclePrice: number;
    pricesUpdatedAt: number;
}

export interface Asset {
    address: string;
    name: string;
    short: string;
    createdAt: string;
    updatedAt: string;
    asset_price_contract_id: string;
    asset_price_usdc_contract_id: string;
    decimals: number;
}

export interface Price {
    marketId: number;
    oraclePrice: string;
    poolPrice: string;
    price: string;
    updatedAt: number;
    assetPairId?: string;
}

export interface PricesResponse {
    [assetPairId: string]: Price;
}

// CandleData interface removed - endpoint returns 404

export interface FeeTierParameter {
    tier_id: string;
    taker_fee: string;
    maker_fee: string;
    volume: string;
}

export interface GlobalFeeParameters {
    og_discount: string;
    referee_discount: string;
    referrer_rebate: string;
    affiliate_referrer_rebate: string;
}

export interface ReyaApiResponse<T = any> {
    success?: boolean;
    data?: T;
    error?: string;
}

export interface ReyaProviderResponse {
    message: string;
    data?: any;
    error?: string;
}