import type { CaixinhaMovementType } from "@/generated/prisma/client";
import { toNumber } from "@/lib/decimal";

type Movement = {
  type: CaixinhaMovementType;
  amount: unknown;
};

export function calculateCaixinhaBalance(movements: Movement[]): number {
  return movements.reduce((balance, m) => {
    const amount = toNumber(m.amount);
    switch (m.type) {
      case "APORTE":
      case "RENDIMENTO":
        return balance + amount;
      case "RESGATE":
        return balance - amount;
      case "AJUSTE":
        return amount;
      default:
        return balance;
    }
  }, 0);
}

/** Saldo investido (sem rendimentos lançados) — base para simulação CDI. */
export function calculateCaixinhaInvestedBalance(movements: Movement[]): number {
  return movements.reduce((balance, m) => {
    const amount = toNumber(m.amount);
    switch (m.type) {
      case "APORTE":
        return balance + amount;
      case "RESGATE":
        return balance - amount;
      case "AJUSTE":
        return amount;
      case "RENDIMENTO":
      default:
        return balance;
    }
  }, 0);
}
