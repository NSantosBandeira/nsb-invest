"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { toDecimal } from "@/lib/decimal";
import { isFiiTicker } from "@/lib/market/brapi";
import { fetchQuotes, getMarketDataSourceLabel } from "@/lib/market/fetch-quotes";
import { requireUserId } from "@/lib/session";
import type { ActionState } from "@/actions/institutions";

export async function syncMarketQuotes(): Promise<ActionState & { updated?: number }> {
  const userId = await requireUserId();

  const [fiiPositions, stockPositions] = await Promise.all([
    db.fiiPosition.findMany({ where: { userId }, select: { id: true, ticker: true } }),
    db.stockPosition.findMany({ where: { userId }, select: { id: true, ticker: true } }),
  ]);

  const requests = [
    ...fiiPositions.map((p) => ({ ticker: p.ticker, assetType: "fii" as const })),
    ...stockPositions.map((p) => ({ ticker: p.ticker, assetType: "acao" as const })),
  ];

  if (requests.length === 0) {
    return { error: "Nenhum FII ou ação cadastrado para atualizar" };
  }

  let quotes;
  try {
    quotes = await fetchQuotes(requests);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Não foi possível buscar cotações. Tente novamente mais tarde.",
    };
  }

  if (quotes.length === 0) {
    return {
      error:
        "Nenhuma cotação retornada. Verifique os tickers (ex: HGLG11, PETR4).",
    };
  }

  const quoteMap = new Map(quotes.map((q) => [q.ticker, q]));
  const now = new Date();
  let updated = 0;

  for (const pos of fiiPositions) {
    const quote = quoteMap.get(pos.ticker.toUpperCase());
    if (!quote) continue;

    await db.fiiPosition.update({
      where: { id: pos.id },
      data: {
        currentPrice: toDecimal(quote.price),
        dividendYield:
          quote.dividendYield != null ? toDecimal(quote.dividendYield) : null,
        lastQuoteAt: now,
      },
    });
    updated++;
  }

  for (const pos of stockPositions) {
    const quote = quoteMap.get(pos.ticker.toUpperCase());
    if (!quote) continue;

    await db.stockPosition.update({
      where: { id: pos.id },
      data: {
        currentPrice: toDecimal(quote.price),
        dividendYield:
          quote.dividendYield != null ? toDecimal(quote.dividendYield) : null,
        lastQuoteAt: now,
      },
    });
    updated++;
  }

  revalidatePath("/ganhos");
  revalidatePath("/fiis");
  revalidatePath("/acoes");
  revalidatePath("/dashboard");

  if (updated === 0) {
    return { error: "Nenhum ticker encontrado. Confira os códigos (ex: PETR4, HGLG11)" };
  }

  return {
    success: true,
    updated,
    message: `Atualizado via ${getMarketDataSourceLabel()}`,
  };
}

export async function syncSingleTickerQuote(
  ticker: string,
  assetType: "fii" | "acao",
): Promise<ActionState> {
  const userId = await requireUserId();
  const normalized = ticker.trim().toUpperCase();

  if (assetType === "fii" && !isFiiTicker(normalized)) {
    return { error: "Ticker de FII geralmente termina em 11" };
  }

  let quotes;
  try {
    quotes = await fetchQuotes([{ ticker: normalized, assetType }]);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao buscar cotação",
    };
  }

  const quote = quotes[0];
  if (!quote) {
    return {
      error: `Cotação não encontrada para ${normalized} no Investidor10/Brapi`,
    };
  }

  const source = quote.source === "investidor10" ? "Investidor10" : "Brapi";
  const dyLabel =
    quote.dividendYield != null
      ? ` · DY ${quote.dividendYield.toFixed(2)}%`
      : "";

  const now = new Date();
  const data = {
    currentPrice: toDecimal(quote.price),
    dividendYield:
      quote.dividendYield != null ? toDecimal(quote.dividendYield) : null,
    lastQuoteAt: now,
  };

  if (assetType === "fii") {
    const pos = await db.fiiPosition.findFirst({
      where: { userId, ticker: normalized },
    });
    if (!pos) return { error: "Posição não encontrada" };
    await db.fiiPosition.update({ where: { id: pos.id }, data });
    revalidatePath(`/fiis/${pos.id}`);
    revalidatePath("/fiis");
  } else {
    const pos = await db.stockPosition.findFirst({
      where: { userId, ticker: normalized },
    });
    if (!pos) return { error: "Posição não encontrada" };
    await db.stockPosition.update({ where: { id: pos.id }, data });
    revalidatePath(`/acoes/${pos.id}`);
    revalidatePath("/acoes");
  }

  revalidatePath("/ganhos");
  revalidatePath("/dashboard");
  return {
    success: true,
    message: `${normalized} (${source}): R$ ${quote.price.toFixed(2)}${dyLabel}`,
  };
}
