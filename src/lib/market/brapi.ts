import type { MarketQuote } from "@/lib/market/types";
import { normalizeDividendYieldPercent } from "@/lib/market/parse";

export type { MarketQuote };

type BrapiQuoteResult = {
  symbol: string;
  shortName?: string;
  regularMarketPrice?: number;
  dividendYield?: number;
};

type BrapiResponse = {
  results?: BrapiQuoteResult[];
  error?: boolean;
  message?: string;
};

const BRAPI_BASE = "https://brapi.dev/api";

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export async function fetchMarketQuotes(tickers: string[]): Promise<MarketQuote[]> {
  const unique = [...new Set(tickers.map(normalizeTicker))].filter(Boolean);
  if (unique.length === 0) return [];

  const token = process.env.BRAPI_TOKEN;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) {
    chunks.push(unique.slice(i, i + 10));
  }

  const results: MarketQuote[] = [];

  for (const chunk of chunks) {
    const params = new URLSearchParams();
    if (token) params.set("token", token);

    const url = `${BRAPI_BASE}/quote/${chunk.join(",")}?${params.toString()}`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    const data = (await res.json()) as BrapiResponse;

    if (!res.ok || data.error) {
      const msg = data.message ?? `HTTP ${res.status}`;
      if (!token && msg.toLowerCase().includes("token")) {
        throw new Error(
          "Configure BRAPI_TOKEN no .env (grátis em https://brapi.dev) para buscar cotações e DY.",
        );
      }
      console.error(`Brapi error for ${chunk.join(",")}:`, msg);
      continue;
    }

    for (const item of data.results ?? []) {
      const price = item.regularMarketPrice ?? 0;
      if (price <= 0) continue;

      results.push({
        ticker: normalizeTicker(item.symbol),
        price,
        dividendYield:
          item.dividendYield != null && Number.isFinite(item.dividendYield)
            ? normalizeDividendYieldPercent(item.dividendYield)
            : null,
        shortName: item.shortName ?? null,
        source: "brapi",
      });
    }
  }

  return results;
}

export function isFiiTicker(ticker: string): boolean {
  const t = normalizeTicker(ticker);
  return t.endsWith("11");
}
