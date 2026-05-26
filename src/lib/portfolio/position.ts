import type { TradeMovementType } from "@/generated/prisma/client";
import { toNumber } from "@/lib/decimal";

type Movement = {
  type: TradeMovementType;
  quantity: unknown;
  unitPrice: unknown;
};

export function calculatePositionFromMovements(movements: Movement[]): {
  quantity: number;
  averagePrice: number;
} {
  let quantity = 0;
  let totalCost = 0;

  for (const m of movements) {
    const qty = toNumber(m.quantity);
    const price = toNumber(m.unitPrice);

    if (m.type === "COMPRA") {
      totalCost += qty * price;
      quantity += qty;
    } else if (m.type === "VENDA") {
      const avg = quantity > 0 ? totalCost / quantity : 0;
      quantity -= qty;
      totalCost -= avg * qty;
      if (quantity < 0.0001) {
        quantity = 0;
        totalCost = 0;
      }
    }
  }

  const averagePrice = quantity > 0 ? totalCost / quantity : 0;
  return { quantity, averagePrice };
}

export function calculateMarketValue(quantity: number, currentPrice: number): number {
  return quantity * currentPrice;
}
