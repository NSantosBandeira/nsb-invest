"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseCalendarDateInput } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { toDecimal, toNumber } from "@/lib/decimal";
import { calculateTradeGains } from "@/lib/portfolio/gains";
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

async function syncStockPosition(positionId: string, userId: string) {
  const movements = await db.stockMovement.findMany({
    where: { positionId, userId },
    orderBy: { date: "asc" },
  });
  const { quantity, averagePrice } = calculatePositionFromMovements(movements);
  await db.stockPosition.update({
    where: { id: positionId },
    data: {
      quantity: toDecimal(quantity),
      averagePrice: toDecimal(averagePrice),
    },
  });
}

export async function createStockPosition(
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
  const existing = await db.stockPosition.findUnique({
    where: { userId_ticker: { userId, ticker } },
  });
  if (existing) return { error: "Esta ação já está cadastrada" };

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

  await db.stockPosition.create({
    data: {
      userId,
      ticker,
      institutionId,
      currentPrice: toDecimal(currentPrice),
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/acoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateStockPriceFromForm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const positionId = String(formData.get("positionId") ?? "");
  const currentPrice = String(formData.get("currentPrice") ?? "");
  return updateStockCurrentPrice(positionId, currentPrice);
}

export async function updateStockCurrentPrice(
  positionId: string,
  currentPrice: string,
): Promise<ActionState> {
  const userId = await requireUserId();
  const position = await db.stockPosition.findFirst({ where: { id: positionId, userId } });
  if (!position) return { error: "Posição não encontrada" };

  let price: number;
  try {
    price = parseMoneyInput(currentPrice);
  } catch {
    return { error: "Preço inválido" };
  }

  await db.stockPosition.update({
    where: { id: positionId },
    data: { currentPrice: toDecimal(price) },
  });

  revalidatePath(`/acoes/${positionId}`);
  revalidatePath("/acoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addStockMovement(
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

  const position = await db.stockPosition.findFirst({
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

  await db.stockMovement.create({
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
    await syncStockPosition(parsed.data.positionId, userId);
  }

  revalidatePath(`/acoes/${parsed.data.positionId}`);
  revalidatePath("/acoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteStockMovement(movementId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const movement = await db.stockMovement.findFirst({
    where: { id: movementId, userId },
  });
  if (!movement) return { error: "Movimentação não encontrada" };

  await db.stockMovement.delete({ where: { id: movementId } });

  await syncStockPosition(movement.positionId, userId);

  revalidatePath(`/acoes/${movement.positionId}`);
  revalidatePath("/acoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteStockPosition(id: string): Promise<ActionState> {
  const userId = await requireUserId();
  const position = await db.stockPosition.findFirst({ where: { id, userId } });
  if (!position) return { error: "Posição não encontrada" };

  await db.stockPosition.delete({ where: { id } });
  revalidatePath("/acoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getStockPositions() {
  const userId = await requireUserId();
  const positions = await db.stockPosition.findMany({
    where: { userId },
    include: { institution: true, movements: { orderBy: { date: "asc" } } },
    orderBy: { ticker: "asc" },
  });

  return positions.map((p) => {
    const quantity = toNumber(p.quantity);
    const averagePrice = toNumber(p.averagePrice);
    const currentPrice = toNumber(p.currentPrice);
    return {
      ...p,
      marketValue: calculateMarketValue(quantity, currentPrice),
      gains: calculateTradeGains(
        p.movements,
        quantity,
        averagePrice,
        currentPrice,
      ),
      dividendYield: p.dividendYield ? toNumber(p.dividendYield) : null,
    };
  });
}

export async function getStockPosition(id: string) {
  const userId = await requireUserId();
  const position = await db.stockPosition.findFirst({
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

  return {
    ...position,
    marketValue: calculateMarketValue(quantity, currentPrice),
    dividendYield: position.dividendYield ? toNumber(position.dividendYield) : null,
    gains: calculateTradeGains(
      position.movements,
      quantity,
      averagePrice,
      currentPrice,
    ),
  };
}
