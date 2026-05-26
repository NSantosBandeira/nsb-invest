import { Prisma } from "@/generated/prisma/client";
import { toNumber as toNumberSafe } from "@/lib/number";

export function toNumber(value: unknown): number {
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return toNumberSafe(value);
}

export function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}
