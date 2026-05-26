import * as XLSX from "xlsx";
import { isFiiTicker } from "@/lib/market/brapi";

export type SpreadsheetPosition = {
  ticker: string;
  quantity: number;
  currentPrice: number;
  averagePrice: number;
  dividendYieldPercent: number | null;
  source: string;
};

export type ParsedInvestmentsWorkbook = {
  fiis: SpreadsheetPosition[];
  acoes: SpreadsheetPosition[];
};

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeTicker(raw: unknown): string {
  return String(raw ?? "")
    .replace(/^\*+/, "")
    .trim()
    .toUpperCase();
}

function toNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function dyToPercent(dy: number): number | null {
  if (!Number.isFinite(dy) || dy <= 0) return null;
  return dy <= 1 ? dy * 100 : dy;
}

function findColumns(header: string[]) {
  const colTicker = header.findIndex((h) => h.includes("investimento"));
  const colQty = header.findIndex(
    (h) => h === "cotas" || (h.includes("cotas") && !h.includes("valor")),
  );
  const colPrice = header.findIndex(
    (h) =>
      h.includes("valor da cota") ||
      (h.includes("valor") && h.includes("cota") && !h.includes("investido")),
  );
  const colDy = header.findIndex((h) => h.includes("dy"));
  const colInvested = header.findIndex((h) => h.includes("valor investido"));

  return { colTicker, colQty, colPrice, colDy, colInvested };
}

function parseSheetRows(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  forceAssetType?: "fii" | "acao",
): SpreadsheetPosition[] {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];

  if (rows.length < 2) return [];

  const header = (rows[0] as unknown[]).map(normalizeHeader);
  const { colTicker, colQty, colPrice, colDy, colInvested } = findColumns(header);

  if (colTicker < 0 || colQty < 0) return [];

  const positions: SpreadsheetPosition[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const ticker = normalizeTicker(row[colTicker]);
    if (!ticker || ticker.startsWith("#")) continue;

    const quantity = toNumber(row[colQty]);
    const currentPrice = colPrice >= 0 ? toNumber(row[colPrice]) : 0;
    const invested = colInvested >= 0 ? toNumber(row[colInvested]) : 0;
    const dyRaw = colDy >= 0 ? toNumber(row[colDy]) : 0;

    if (quantity <= 0 && invested <= 0) continue;

    const qty = quantity > 0 ? quantity : invested > 0 && currentPrice > 0 ? invested / currentPrice : 0;
    if (qty <= 0) continue;

    const price =
      currentPrice > 0
        ? currentPrice
        : invested > 0
          ? invested / qty
          : 0;
    if (price <= 0) continue;

    const averagePrice = invested > 0 ? invested / qty : price;

    if (forceAssetType === "fii" && !isFiiTicker(ticker)) continue;
    if (forceAssetType === "acao" && isFiiTicker(ticker)) continue;

    positions.push({
      ticker,
      quantity: qty,
      currentPrice: price,
      averagePrice,
      dividendYieldPercent: dyToPercent(dyRaw),
      source: sheetName,
    });
  }

  return positions;
}

function mergePositions(
  items: SpreadsheetPosition[],
): SpreadsheetPosition[] {
  const map = new Map<string, SpreadsheetPosition>();

  for (const item of items) {
    const existing = map.get(item.ticker);
    if (!existing) {
      map.set(item.ticker, { ...item });
      continue;
    }

    const totalQty = existing.quantity + item.quantity;
    const totalInvested =
      existing.averagePrice * existing.quantity +
      item.averagePrice * item.quantity;

    existing.quantity = totalQty;
    existing.averagePrice = totalQty > 0 ? totalInvested / totalQty : existing.averagePrice;
    existing.currentPrice = item.currentPrice;
    existing.dividendYieldPercent =
      item.dividendYieldPercent ?? existing.dividendYieldPercent;
    existing.source = `${existing.source}, ${item.source}`;
  }

  return [...map.values()];
}

export function parseInvestmentsWorkbook(
  buffer: ArrayBuffer,
): ParsedInvestmentsWorkbook {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const bolsaSheet = workbook.Sheets["BOLSA"];
  const fiisSheet = workbook.Sheets["FIIS"];

  const bolsaRows = bolsaSheet
    ? parseSheetRows(bolsaSheet, "BOLSA")
    : [];

  const fiisSheetRows = fiisSheet
    ? parseSheetRows(fiisSheet, "FIIS", "fii")
    : [];

  const bolsaFiis = bolsaRows.filter((r) => isFiiTicker(r.ticker));
  const bolsaAcoes = bolsaRows.filter((r) => !isFiiTicker(r.ticker));

  return {
    fiis: mergePositions([...fiisSheetRows, ...bolsaFiis]),
    acoes: mergePositions(bolsaAcoes),
  };
}
