"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseCalendarDateInput } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { toDecimal, toNumber } from "@/lib/decimal";
import { calculateTradeGains } from "@/lib/portfolio/gains";
import { calculateFiiIncomeEstimate } from "@/lib/portfolio/fii-income";
import {
  calculateMarketValue,
  calculatePositionFromMovements,
} from "@/lib/portfolio/position";
import type { ActionState } from "@/actions/institutions";
import { parseMoneyInput } from "@/lib/money";
import { parseQuantityInput } from "@/lib/format";

const positionSchema = z.object({
  ticker: z.string().min(4).max(12),
  institutionId: z.string().optional(),
  currentPrice: z.string().min(1),
  notes: z.string().optional(),
});

const tradeSchema = z.object({
  positionId: z.string(),
  type: z.enum(["COMPRA", "VENDA", "DIVIDENDO"]),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().optional(),
});

function parseQuantity(value: string): number {
  const n = parseQuantityInput(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Quantidade inválida");
  return n;
}

function parseDividendYieldPercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) throw new Error("DY inválido");
  if (n === 0) return null;
  return n <= 1 ? n * 100 : n;
}

async function getPositionQuantityExcludingMovement(
  positionId: string,
  userId: string,
  excludeMovementId: string,
): Promise<number> {
  const movements = await db.fiiMovement.findMany({
    where: { positionId, userId, NOT: { id: excludeMovementId } },
    orderBy: { date: "asc" },
  });
  return calculatePositionFromMovements(movements).quantity;
}

function revalidateFiiPaths(positionId: string) {
  revalidatePath(`/fiis/${positionId}`);
  revalidatePath("/fiis");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");
}

async function syncFiiPosition(positionId: string, userId: string) {
  const movements = await db.fiiMovement.findMany({
    where: { positionId, userId },
    orderBy: { date: "asc" },
  });
  const { quantity, averagePrice } = calculatePositionFromMovements(movements);
  await db.fiiPosition.update({
    where: { id: positionId },
    data: {
      quantity: toDecimal(quantity),
      averagePrice: toDecimal(averagePrice),
    },
  });
}

export async function createFiiPosition(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = positionSchema.safeParse({
    ticker: formData.get("ticker"),
    institutionId: formData.get("institutionId") || undefined,
    currentPrice: formData.get("currentPrice"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const ticker = parsed.data.ticker.trim().toUpperCase();
  const existing = await db.fiiPosition.findUnique({
    where: { userId_ticker: { userId, ticker } },
  });
  if (existing) return { error: "Este FII já está cadastrado" };

  let currentPrice: number;
  try {
    currentPrice = parseMoneyInput(parsed.data.currentPrice);
  } catch {
    return { error: "Preço atual inválido" };
  }

  const institutionId =
    parsed.data.institutionId && parsed.data.institutionId !== "none"
      ? parsed.data.institutionId
      : null;

  await db.fiiPosition.create({
    data: {
      userId,
      ticker,
      institutionId,
      currentPrice: toDecimal(currentPrice),
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/fiis");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateFiiPriceFromForm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const positionId = String(formData.get("positionId") ?? "");
  const currentPrice = String(formData.get("currentPrice") ?? "");
  return updateFiiCurrentPrice(positionId, currentPrice);
}

export async function updateFiiCurrentPrice(
  positionId: string,
  currentPrice: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  const position = await db.fiiPosition.findFirst({ where: { id: positionId, userId } });
  if (!position) return { error: "Posição não encontrada" };

  let price: number;
  try {
    price = parseMoneyInput(currentPrice);
  } catch {
    return { error: "Preço inválido" };
  }

  await db.fiiPosition.update({
    where: { id: positionId },
    data: { currentPrice: toDecimal(price) },
  });

  revalidateFiiPaths(positionId);
  return { success: true };
}

export async function updateFiiDividendYieldFromForm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const positionId = String(formData.get("positionId") ?? "");
  const dividendYield = String(formData.get("dividendYield") ?? "");
  return updateFiiDividendYield(positionId, dividendYield);
}

export async function updateFiiDividendYield(
  positionId: string,
  dividendYield: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  const position = await db.fiiPosition.findFirst({ where: { id: positionId, userId } });
  if (!position) return { error: "Posição não encontrada" };

  let dy: number | null;
  try {
    dy = parseDividendYieldPercent(dividendYield);
  } catch {
    return { error: "Dividend yield inválido. Use percentual, ex: 11,91" };
  }

  await db.fiiPosition.update({
    where: { id: positionId },
    data: { dividendYield: dy != null ? toDecimal(dy) : null },
  });

  revalidateFiiPaths(positionId);
  return { success: true };
}

export async function addFiiMovement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = tradeSchema.safeParse({
    positionId: formData.get("positionId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const position = await db.fiiPosition.findFirst({
    where: { id: parsed.data.positionId, userId },
  });
  if (!position) return { error: "Posição não encontrada" };

  let quantity: number;
  let unitPrice: number;
  try {
    quantity = parseQuantity(parsed.data.quantity);
    unitPrice = parseMoneyInput(parsed.data.unitPrice);
  } catch {
    return { error: "Quantidade ou preço inválido" };
  }

  if (parsed.data.type === "VENDA" && quantity > toNumber(position.quantity)) {
    return { error: "Quantidade maior que a posição atual" };
  }

  await db.fiiMovement.create({
    data: {
      positionId: parsed.data.positionId,
      userId,
      type: parsed.data.type,
      quantity: toDecimal(quantity),
      unitPrice: toDecimal(unitPrice),
      date: parseCalendarDateInput(parsed.data.date),
      notes: parsed.data.notes || null,
    },
  });

  if (parsed.data.type !== "DIVIDENDO") {
    await syncFiiPosition(parsed.data.positionId, userId);
  }

  revalidateFiiPaths(parsed.data.positionId);
  return { success: true };
}

const tradeUpdateSchema = tradeSchema.extend({
  movementId: z.string().min(1),
});

export async function updateFiiMovement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = tradeUpdateSchema.safeParse({
    movementId: formData.get("movementId"),
    positionId: formData.get("positionId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const movement = await db.fiiMovement.findFirst({
    where: { id: parsed.data.movementId, userId },
  });
  if (!movement) return { error: "Movimentação não encontrada" };
  if (movement.positionId !== parsed.data.positionId) {
    return { error: "Movimentação não pertence a esta posição" };
  }

  let quantity: number;
  let unitPrice: number;
  try {
    quantity = parseQuantity(parsed.data.quantity);
    unitPrice = parseMoneyInput(parsed.data.unitPrice);
  } catch {
    return { error: "Quantidade ou preço inválido" };
  }

  if (parsed.data.type === "VENDA") {
    const available = await getPositionQuantityExcludingMovement(
      parsed.data.positionId,
      userId,
      parsed.data.movementId,
    );
    if (quantity > available) {
      return { error: "Quantidade maior que a posição disponível para venda" };
    }
  }

  await db.fiiMovement.update({
    where: { id: parsed.data.movementId },
    data: {
      type: parsed.data.type,
      quantity: toDecimal(quantity),
      unitPrice: toDecimal(unitPrice),
      date: parseCalendarDateInput(parsed.data.date),
      notes: parsed.data.notes || null,
    },
  });

  await syncFiiPosition(parsed.data.positionId, userId);

  revalidateFiiPaths(parsed.data.positionId);
  return { success: true };
}

export async function deleteFiiMovement(movementId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const movement = await db.fiiMovement.findFirst({
    where: { id: movementId, userId },
  });
  if (!movement) return { error: "Movimentação não encontrada" };

  await db.fiiMovement.delete({ where: { id: movementId } });

  await syncFiiPosition(movement.positionId, userId);

  revalidateFiiPaths(movement.positionId);
  return { success: true };
}

export async function deleteFiiPosition(id: string): Promise<ActionState> {
  const userId = await requireUserId();
  const position = await db.fiiPosition.findFirst({ where: { id, userId } });
  if (!position) return { error: "Posição não encontrada" };

  await db.fiiPosition.delete({ where: { id } });
  revalidatePath("/fiis");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getFiiPositions() {
  const userId = await requireUserId();
  const positions = await db.fiiPosition.findMany({
    where: { userId },
    include: { institution: true, movements: { orderBy: { date: "asc" } } },
    orderBy: { ticker: "asc" },
  });

  return positions.map((p) => {
    const quantity = toNumber(p.quantity);
    const averagePrice = toNumber(p.averagePrice);
    const currentPrice = toNumber(p.currentPrice);
    const marketValue = calculateMarketValue(quantity, currentPrice);
    const dividendYield = p.dividendYield ? toNumber(p.dividendYield) : null;
    return {
      ...p,
      marketValue,
      gains: calculateTradeGains(
        p.movements,
        quantity,
        averagePrice,
        currentPrice,
      ),
      dividendYield,
      income: calculateFiiIncomeEstimate(
        marketValue,
        dividendYield,
        p.movements,
      ),
    };
  });
}

export async function getFiiPosition(id: string) {
  const userId = await requireUserId();
  const position = await db.fiiPosition.findFirst({
    where: { id, userId },
    include: {
      institution: true,
      movements: { orderBy: { date: "desc" } },
    },
  });
  if (!position) return null;

  const quantity = toNumber(position.quantity);
  const averagePrice = toNumber(position.averagePrice);
  const currentPrice = toNumber(position.currentPrice);

  const marketValue = calculateMarketValue(quantity, currentPrice);
  const dividendYield = position.dividendYield
    ? toNumber(position.dividendYield)
    : null;

  return {
    ...position,
    marketValue,
    dividendYield,
    gains: calculateTradeGains(
      position.movements,
      quantity,
      averagePrice,
      currentPrice,
    ),
    income: calculateFiiIncomeEstimate(
      marketValue,
      dividendYield,
      position.movements,
    ),
  };
}
