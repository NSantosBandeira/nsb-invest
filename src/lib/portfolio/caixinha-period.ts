import type { CaixinhaMovementType } from "@/generated/prisma/client";
import { toNumber } from "@/lib/decimal";
import { calculateCaixinhaBalance } from "@/lib/portfolio/caixinha";

type Movement = {
  type: CaixinhaMovementType;
  amount: unknown;
  date: Date;
};

const TZ = "America/Sao_Paulo";

export function toBrazilDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function toBrazilMonthKey(date: Date): string {
  return toBrazilDayKey(date).slice(0, 7);
}

function netDepositsInMovements(movements: Movement[]): number {
  return movements.reduce((sum, m) => {
    const amount = toNumber(m.amount);
    if (m.type === "APORTE") return sum + amount;
    if (m.type === "RESGATE") return sum - amount;
    return sum;
  }, 0);
}

function gainBetween(
  movementsBefore: Movement[],
  movementsInPeriod: Movement[],
): number {
  const balanceStart = calculateCaixinhaBalance(movementsBefore);
  const balanceEnd = calculateCaixinhaBalance([
    ...movementsBefore,
    ...movementsInPeriod,
  ]);
  const netDeposits = netDepositsInMovements(movementsInPeriod);
  return balanceEnd - balanceStart - netDeposits;
}

export function calculateCaixinhaDailyGain(
  movements: Movement[],
  referenceDate: Date = new Date(),
): number {
  const todayKey = toBrazilDayKey(referenceDate);
  const beforeToday = movements.filter((m) => toBrazilDayKey(m.date) < todayKey);
  const todayMovements = movements.filter(
    (m) => toBrazilDayKey(m.date) === todayKey,
  );
  return gainBetween(beforeToday, todayMovements);
}

export type CaixinhaTodaySummary = {
  rendimentos: number;
  aportes: number;
  resgates: number;
};

export function summarizeCaixinhaToday(
  movements: Movement[],
  referenceDate: Date = new Date(),
): CaixinhaTodaySummary {
  const todayKey = toBrazilDayKey(referenceDate);
  const summary: CaixinhaTodaySummary = { rendimentos: 0, aportes: 0, resgates: 0 };

  for (const m of movements) {
    if (toBrazilDayKey(m.date) !== todayKey) continue;
    const amount = toNumber(m.amount);
    if (m.type === "RENDIMENTO") summary.rendimentos += amount;
    else if (m.type === "APORTE") summary.aportes += amount;
    else if (m.type === "RESGATE") summary.resgates += amount;
  }

  return summary;
}

export function calculateCaixinhaMonthlyGain(
  movements: Movement[],
  referenceDate: Date = new Date(),
): number {
  const monthKey = toBrazilMonthKey(referenceDate);
  const beforeMonth = movements.filter(
    (m) => toBrazilMonthKey(m.date) < monthKey,
  );
  const monthMovements = movements.filter(
    (m) => toBrazilMonthKey(m.date) === monthKey,
  );
  return gainBetween(beforeMonth, monthMovements);
}
