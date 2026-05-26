import type { MarketAssetType, MarketQuote } from "@/lib/market/types";
import { normalizeDividendYieldPercent, parseBrNumberString } from "@/lib/market/parse";

const BASE = "https://investidor10.com.br";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

function buildUrl(ticker: string, assetType: MarketAssetType): string {
  const slug = ticker.toLowerCase();
  const segment = assetType === "fii" ? "fiis" : "acoes";
  return `${BASE}/${segment}/${slug}/`;
}

function parseQuoteFromHtml(html: string, ticker: string): MarketQuote | null {
  const priceMatch = html.match(
    /<div class="_card cotacao">[\s\S]*?<span class="value">\s*R\$\s*([\d.,]+)/i,
  );
  const price = priceMatch ? parseBrNumberString(priceMatch[1]) : 0;

  const dyMatch =
    html.match(/DY\s*\(12M\)[\s\S]{0,200}?([\d]+[,.][\d]+)\s*%/i) ??
    html.match(/DY atual:\s*<span>([\d]+[,.][\d]+)%/i) ??
    html.match(/DIVIDEND YIELD[\s\S]{0,400}?([\d]+[,.][\d]+)\s*%/i);

  const dyRaw = dyMatch ? parseBrNumberString(dyMatch[1]) : null;
  const dividendYield =
    dyRaw != null && dyRaw > 0 ? normalizeDividendYieldPercent(dyRaw) : null;

  if (price <= 0) return null;

  const nameMatch = html.match(/<h1[^>]*>([^<]+)</i);
  const shortName = nameMatch?.[1]?.trim() ?? null;

  return {
    ticker: normalizeTicker(ticker),
    price,
    dividendYield,
    shortName,
    source: "investidor10",
  };
}

export async function fetchInvestidor10Quote(
  ticker: string,
  assetType: MarketAssetType,
): Promise<MarketQuote | null> {
  const url = buildUrl(ticker, assetType);

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    console.error(`Investidor10 ${res.status} for ${ticker}`);
    return null;
  }

  const html = await res.text();
  return parseQuoteFromHtml(html, ticker);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Busca em série com intervalo para não sobrecarregar o site. */
export async function fetchInvestidor10Quotes(
  items: { ticker: string; assetType: MarketAssetType }[],
  delayMs = 400,
): Promise<MarketQuote[]> {
  const results: MarketQuote[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${item.assetType}:${normalizeTicker(item.ticker)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const quote = await fetchInvestidor10Quote(item.ticker, item.assetType);
    if (quote) results.push(quote);

    if (delayMs > 0) await delay(delayMs);
  }

  return results;
}
