export type MarketQuote = {
  ticker: string;
  price: number;
  dividendYield: number | null;
  shortName: string | null;
  source?: "brapi" | "investidor10";
};

export type MarketAssetType = "fii" | "acao";

export type QuoteRequest = {
  ticker: string;
  assetType: MarketAssetType;
};

export type MarketDataProvider = "auto" | "brapi" | "investidor10";
