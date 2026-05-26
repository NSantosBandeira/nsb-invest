import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CaixinhaMovementType, TradeMovementType } from "@/generated/prisma/client";
import { toNumber } from "@/lib/decimal";
import { calculateCaixinhaBalance } from "@/lib/portfolio/caixinha";
import { calculatePositionFromMovements } from "@/lib/portfolio/position";

export type EvolutionPoint = {
  date: string;
  label: string;
  caixinhas: number;
  fiis: number;
  acoes: number;
  total: number;
};

type CaixinhaData = {
  id: string;
  movements: { type: CaixinhaMovementType; amount: unknown; date: Date }[];
};

type TradePositionData = {
  id: string;
  currentPrice: unknown;
  movements: {
    type: TradeMovementType;
    quantity: unknown;
    unitPrice: unknown;
    date: Date;
  }[];
};

function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return format(d, "MMM/yy", { locale: ptBR });
}

function lastPriceFromMovements(
  movements: TradePositionData["movements"],
  beforeOrOn: Date,
): number {
  const relevant = movements
    .filter((m) => m.type !== "DIVIDENDO" && m.date <= beforeOrOn)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  if (relevant.length === 0) return 0;
  return toNumber(relevant[0].unitPrice);
}

function tradeValueAtDate(
  position: TradePositionData,
  at: Date,
  useCurrentPrice: boolean,
): number {
  const movementsUntil = position.movements.filter((m) => m.date <= at);
  const { quantity } = calculatePositionFromMovements(movementsUntil);
  if (quantity <= 0) return 0;

  const price = useCurrentPrice
    ? toNumber(position.currentPrice)
    : lastPriceFromMovements(position.movements, at) ||
      toNumber(position.currentPrice);

  return quantity * price;
}

function caixinhaBalanceAtDate(
  caixinha: CaixinhaData,
  at: Date,
): number {
  const movementsUntil = caixinha.movements.filter((m) => m.date <= at);
  return calculateCaixinhaBalance(movementsUntil);
}

export function buildPortfolioEvolution(
  caixinhas: CaixinhaData[],
  fiiPositions: TradePositionData[],
  stockPositions: TradePositionData[],
  monthsBack = 12,
): EvolutionPoint[] {
  const allDates: Date[] = [];
  const now = new Date();

  for (const c of caixinhas) {
    for (const m of c.movements) allDates.push(m.date);
  }
  for (const p of [...fiiPositions, ...stockPositions]) {
    for (const m of p.movements) allDates.push(m.date);
  }

  const monthKeys = new Set<string>();
  monthKeys.add(monthKey(now));

  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.add(monthKey(d));
  }

  for (const d of allDates) {
    monthKeys.add(monthKey(d));
  }

  const sortedKeys = [...monthKeys].sort();
  const recentKeys = sortedKeys.slice(-Math.max(monthsBack, sortedKeys.length));

  return recentKeys.map((key) => {
    const [year, month] = key.split("-").map(Number);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    const at = endOfMonth > now ? now : endOfMonth;
    const isCurrentMonth = key === monthKey(now);

    const caixinhasTotal = caixinhas.reduce(
      (sum, c) => sum + caixinhaBalanceAtDate(c, at),
      0,
    );
    const fiisTotal = fiiPositions.reduce(
      (sum, p) => sum + tradeValueAtDate(p, at, isCurrentMonth),
      0,
    );
    const acoesTotal = stockPositions.reduce(
      (sum, p) => sum + tradeValueAtDate(p, at, isCurrentMonth),
      0,
    );

    return {
      date: key,
      label: monthLabel(key),
      caixinhas: caixinhasTotal,
      fiis: fiisTotal,
      acoes: acoesTotal,
      total: caixinhasTotal + fiisTotal + acoesTotal,
    };
  });
}
