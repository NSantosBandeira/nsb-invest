import { fetchMarketQuotes as fetchBrapiQuotes } from "@/lib/market/brapi";
import { fetchInvestidor10Quotes } from "@/lib/market/investidor10";
import { isFiiTicker } from "@/lib/market/brapi";
import type {
  MarketDataProvider,
  MarketQuote,
  QuoteRequest,
} from "@/lib/market/types";

export type { MarketQuote } from "@/lib/market/types";

function getProvider(): MarketDataProvider {
  const raw = process.env.MARKET_DATA_PROVIDER?.toLowerCase();
  if (raw === "brapi" || raw === "investidor10" || raw === "auto") return raw;
  return "auto";
}

function hasBrapiToken(): boolean {
  return Boolean(process.env.BRAPI_TOKEN?.trim());
}

export async function fetchQuotes(requests: QuoteRequest[]): Promise<MarketQuote[]> {
  const provider = getProvider();
  const unique = new Map<string, QuoteRequest>();
  for (const r of requests) {
    const ticker = r.ticker.trim().toUpperCase();
    const assetType =
      r.assetType === "fii" || isFiiTicker(ticker) ? "fii" : "acao";
    unique.set(`${assetType}:${ticker}`, { ticker, assetType });
  }
  const items = [...unique.values()];

  if (items.length === 0) return [];

  if (provider === "investidor10") {
    return fetchInvestidor10Quotes(items);
  }

  if (provider === "brapi") {
    if (!hasBrapiToken()) {
      throw new Error(
        "MARKET_DATA_PROVIDER=brapi exige BRAPI_TOKEN no .env (https://brapi.dev)",
      );
    }
    return fetchBrapiQuotes(items.map((i) => i.ticker));
  }

  // auto: Brapi quando há token; Investidor10 preenche faltantes
  const results = new Map<string, MarketQuote>();

  if (hasBrapiToken()) {
    try {
      const brapi = await fetchBrapiQuotes(items.map((i) => i.ticker));
      for (const q of brapi) {
        results.set(q.ticker.toUpperCase(), q);
      }
    } catch (e) {
      console.error("Brapi falhou, usando Investidor10:", e);
    }
  }

  const missing = items.filter((i) => !results.has(i.ticker.toUpperCase()));
  if (missing.length > 0 || results.size === 0) {
    const i10 = await fetchInvestidor10Quotes(
      missing.length > 0 ? missing : items,
    );
    for (const q of i10) {
      results.set(q.ticker.toUpperCase(), q);
    }
  }

  return [...results.values()];
}

export function getMarketDataSourceLabel(): string {
  const provider = getProvider();
  if (provider === "investidor10") return "Investidor10";
  if (provider === "brapi") return "Brapi";
  return hasBrapiToken() ? "Brapi + Investidor10" : "Investidor10";
}
