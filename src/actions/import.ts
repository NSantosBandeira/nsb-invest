"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { toDecimal } from "@/lib/decimal";
import { calculatePositionFromMovements } from "@/lib/portfolio/position";
import { requireUserId } from "@/lib/session";
import type { ActionState } from "@/actions/institutions";
import type { TradeMovementType } from "@/generated/prisma/client";
import type { CaixinhaMovementType } from "@/generated/prisma/client";
import {
  parseInvestmentsWorkbook,
  type SpreadsheetPosition,
} from "@/lib/import/investments-spreadsheet";

export type ImportResult = ActionState & {
  imported?: number;
  fiis?: number;
  acoes?: number;
  errors?: string[];
  summary?: string[];
};

async function upsertTradePosition(
  userId: string,
  assetType: "fii" | "acao",
  pos: SpreadsheetPosition,
) {
  const data = {
    quantity: toDecimal(pos.quantity),
    averagePrice: toDecimal(pos.averagePrice),
    currentPrice: toDecimal(pos.currentPrice),
    dividendYield:
      pos.dividendYieldPercent != null
        ? toDecimal(pos.dividendYieldPercent)
        : null,
  };

  if (assetType === "fii") {
    await db.fiiPosition.upsert({
      where: { userId_ticker: { userId, ticker: pos.ticker } },
      create: { userId, ticker: pos.ticker, ...data },
      update: data,
    });
  } else {
    await db.stockPosition.upsert({
      where: { userId_ticker: { userId, ticker: pos.ticker } },
      create: { userId, ticker: pos.ticker, ...data },
      update: data,
    });
  }
}

function revalidateAfterTradeImport() {
  revalidatePath("/fiis");
  revalidatePath("/acoes");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");
}

export async function importInvestmentsWorkbook(
  formData: FormData,
): Promise<ImportResult> {
  const userId = await requireUserId();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return { error: "Selecione o arquivo .xlsx da planilha" };
  }

  if (!file.name.match(/\.xlsx?$/i)) {
    return { error: "Formato inválido. Use o arquivo Excel (.xlsx)" };
  }

  const buffer = await file.arrayBuffer();
  let parsed;
  try {
    parsed = parseInvestmentsWorkbook(buffer);
  } catch {
    return { error: "Não foi possível ler a planilha. Verifique o formato." };
  }

  if (parsed.fiis.length === 0 && parsed.acoes.length === 0) {
    return {
      error:
        "Nenhuma posição com quantidade encontrada nas abas BOLSA e FIIS.",
    };
  }

  const summary: string[] = [];

  for (const pos of parsed.fiis) {
    await upsertTradePosition(userId, "fii", pos);
    summary.push(
      `FII ${pos.ticker}: ${pos.quantity} cotas @ ${pos.currentPrice.toFixed(2)}` +
        (pos.dividendYieldPercent != null
          ? ` (DY ${pos.dividendYieldPercent.toFixed(2)}%)`
          : ""),
    );
  }

  for (const pos of parsed.acoes) {
    await upsertTradePosition(userId, "acao", pos);
    summary.push(
      `Ação ${pos.ticker}: ${pos.quantity} cotas @ ${pos.currentPrice.toFixed(2)}` +
        (pos.dividendYieldPercent != null
          ? ` (DY ${pos.dividendYieldPercent.toFixed(2)}%)`
          : ""),
    );
  }

  revalidateAfterTradeImport();

  const imported = parsed.fiis.length + parsed.acoes.length;
  return {
    success: true,
    imported,
    fiis: parsed.fiis.length,
    acoes: parsed.acoes.length,
    summary,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if ((ch === "," || ch === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function parseBrNumber(value: string): number {
  const cleaned = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) throw new Error("número inválido");
  return n;
}

function parseBrDate(value: string): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return new Date(trimmed);
  }
  const br = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new Error("data inválida");
  return d;
}

function mapTradeType(raw: string): TradeMovementType | null {
  const t = raw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes("COMPRA") || t === "C") return "COMPRA";
  if (t.includes("VENDA") || t === "V") return "VENDA";
  if (t.includes("DIVIDENDO") || t.includes("PROVENTO") || t === "D") return "DIVIDENDO";
  return null;
}

function mapCaixinhaType(raw: string): CaixinhaMovementType | null {
  const t = raw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.includes("APORTE")) return "APORTE";
  if (t.includes("RESGATE")) return "RESGATE";
  if (t.includes("RENDIMENTO")) return "RENDIMENTO";
  if (t.includes("AJUSTE")) return "AJUSTE";
  return null;
}

export async function importTradeCsv(
  assetType: "fii" | "acao",
  csvContent: string,
): Promise<ImportResult> {
  const userId = await requireUserId();
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { error: "Planilha vazia ou sem dados (precisa de cabeçalho + linhas)" };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const idx = (names: string[]) =>
    headers.findIndex((h) => names.some((n) => h.includes(n)));

  const tickerIdx = idx(["ticker", "codigo", "ativo", "papel"]);
  const typeIdx = idx(["tipo", "operacao", "movimento"]);
  const qtyIdx = idx(["quantidade", "qtd", "qty"]);
  const priceIdx = idx(["preco", "valor", "unitario", "pu"]);
  const dateIdx = idx(["data", "date"]);

  if (tickerIdx < 0 || typeIdx < 0 || qtyIdx < 0 || priceIdx < 0) {
    return {
      error:
        "Colunas obrigatórias: ticker, tipo, quantidade, preço. Opcional: data. Use ; ou , como separador.",
    };
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    try {
      const ticker = cols[tickerIdx]?.trim().toUpperCase();
      const type = mapTradeType(cols[typeIdx] ?? "");
      if (!ticker || !type) throw new Error("ticker ou tipo inválido");

      const quantity = parseBrNumber(cols[qtyIdx] ?? "0");
      const unitPrice = parseBrNumber(cols[priceIdx] ?? "0");
      const date =
        dateIdx >= 0 && cols[dateIdx]
          ? parseBrDate(cols[dateIdx])
          : new Date();

      if (assetType === "fii") {
        let position = await db.fiiPosition.findUnique({
          where: { userId_ticker: { userId, ticker } },
        });
        if (!position) {
          position = await db.fiiPosition.create({
            data: {
              userId,
              ticker,
              currentPrice: toDecimal(unitPrice),
            },
          });
        }

        await db.fiiMovement.create({
          data: {
            positionId: position.id,
            userId,
            type,
            quantity: toDecimal(quantity),
            unitPrice: toDecimal(unitPrice),
            date,
          },
        });

        if (type !== "DIVIDENDO") {
          const movements = await db.fiiMovement.findMany({
            where: { positionId: position.id, userId },
            orderBy: { date: "asc" },
          });
          const { quantity: q, averagePrice } =
            calculatePositionFromMovements(movements);
          await db.fiiPosition.update({
            where: { id: position.id },
            data: {
              quantity: toDecimal(q),
              averagePrice: toDecimal(averagePrice),
            },
          });
        }
      } else {
        let position = await db.stockPosition.findUnique({
          where: { userId_ticker: { userId, ticker } },
        });
        if (!position) {
          position = await db.stockPosition.create({
            data: {
              userId,
              ticker,
              currentPrice: toDecimal(unitPrice),
            },
          });
        }

        await db.stockMovement.create({
          data: {
            positionId: position.id,
            userId,
            type,
            quantity: toDecimal(quantity),
            unitPrice: toDecimal(unitPrice),
            date,
          },
        });

        if (type !== "DIVIDENDO") {
          const movements = await db.stockMovement.findMany({
            where: { positionId: position.id, userId },
            orderBy: { date: "asc" },
          });
          const { quantity: q, averagePrice } =
            calculatePositionFromMovements(movements);
          await db.stockPosition.update({
            where: { id: position.id },
            data: {
              quantity: toDecimal(q),
              averagePrice: toDecimal(averagePrice),
            },
          });
        }
      }

      imported++;
    } catch (e) {
      errors.push(`Linha ${i + 1}: ${e instanceof Error ? e.message : "erro"}`);
    }
  }

  revalidatePath(assetType === "fii" ? "/fiis" : "/acoes");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");

  if (imported === 0) {
    return { error: "Nenhuma linha importada", errors };
  }

  return { success: true, imported, errors: errors.length ? errors : undefined };
}

export async function importCaixinhaCsv(csvContent: string): Promise<ImportResult> {
  const userId = await requireUserId();
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { error: "Planilha vazia ou sem dados" };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const idx = (names: string[]) =>
    headers.findIndex((h) => names.some((n) => h.includes(n)));

  const nameIdx = idx(["nome", "caixinha", "descricao"]);
  const typeIdx = idx(["tipo", "operacao", "movimento"]);
  const amountIdx = idx(["valor", "amount", "montante"]);
  const dateIdx = idx(["data", "date"]);

  if (nameIdx < 0 || typeIdx < 0 || amountIdx < 0) {
    return {
      error: "Colunas obrigatórias: nome (caixinha), tipo, valor. Opcional: data.",
    };
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    try {
      const name = cols[nameIdx]?.trim();
      const type = mapCaixinhaType(cols[typeIdx] ?? "");
      if (!name || !type) throw new Error("nome ou tipo inválido");

      const amount = parseBrNumber(cols[amountIdx] ?? "0");
      const date =
        dateIdx >= 0 && cols[dateIdx]
          ? parseBrDate(cols[dateIdx])
          : new Date();

      let caixinha = await db.caixinha.findFirst({
        where: { userId, name },
      });
      if (!caixinha) {
        caixinha = await db.caixinha.create({
          data: { userId, name },
        });
      }

      await db.caixinhaMovement.create({
        data: {
          caixinhaId: caixinha.id,
          userId,
          type,
          amount: toDecimal(amount),
          date,
        },
      });

      imported++;
    } catch (e) {
      errors.push(`Linha ${i + 1}: ${e instanceof Error ? e.message : "erro"}`);
    }
  }

  revalidatePath("/caixinhas");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");

  if (imported === 0) {
    return { error: "Nenhuma linha importada", errors };
  }

  return { success: true, imported, errors: errors.length ? errors : undefined };
}

export async function importPositionsSnapshotCsv(
  assetType: "fii" | "acao",
  csvContent: string,
): Promise<ImportResult> {
  const userId = await requireUserId();
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { error: "Planilha vazia ou sem dados" };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const idx = (names: string[]) =>
    headers.findIndex((h) => names.some((n) => h.includes(n)));

  const tickerIdx = idx(["ticker", "codigo", "ativo"]);
  const qtyIdx = idx(["quantidade", "qtd"]);
  const avgIdx = idx(["preco_medio", "medi", "pm"]);
  const currentIdx = idx(["preco_atual", "atual", "cotacao", "mercado"]);

  if (tickerIdx < 0 || qtyIdx < 0) {
    return {
      error:
        "Colunas obrigatórias: ticker, quantidade. Opcional: preço médio, preço atual.",
    };
  }

  let imported = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    try {
      const ticker = cols[tickerIdx]?.trim().toUpperCase();
      if (!ticker) throw new Error("ticker vazio");

      const quantity = parseBrNumber(cols[qtyIdx] ?? "0");
      const averagePrice =
        avgIdx >= 0 && cols[avgIdx] ? parseBrNumber(cols[avgIdx]) : 0;
      const currentPrice =
        currentIdx >= 0 && cols[currentIdx]
          ? parseBrNumber(cols[currentIdx])
          : averagePrice;

      if (assetType === "fii") {
        await db.fiiPosition.upsert({
          where: { userId_ticker: { userId, ticker } },
          create: {
            userId,
            ticker,
            quantity: toDecimal(quantity),
            averagePrice: toDecimal(averagePrice),
            currentPrice: toDecimal(currentPrice),
          },
          update: {
            quantity: toDecimal(quantity),
            averagePrice: toDecimal(averagePrice),
            currentPrice: toDecimal(currentPrice),
          },
        });
      } else {
        await db.stockPosition.upsert({
          where: { userId_ticker: { userId, ticker } },
          create: {
            userId,
            ticker,
            quantity: toDecimal(quantity),
            averagePrice: toDecimal(averagePrice),
            currentPrice: toDecimal(currentPrice),
          },
          update: {
            quantity: toDecimal(quantity),
            averagePrice: toDecimal(averagePrice),
            currentPrice: toDecimal(currentPrice),
          },
        });
      }

      imported++;
    } catch (e) {
      errors.push(`Linha ${i + 1}: ${e instanceof Error ? e.message : "erro"}`);
    }
  }

  revalidatePath(assetType === "fii" ? "/fiis" : "/acoes");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");

  if (imported === 0) {
    return { error: "Nenhuma linha importada", errors };
  }

  return { success: true, imported, errors: errors.length ? errors : undefined };
}
