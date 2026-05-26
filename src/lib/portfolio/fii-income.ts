import type { TradeMovementType } from "@/generated/prisma/client";
import { toNumber } from "@/lib/decimal";
import { toBrazilMonthKey } from "@/lib/portfolio/caixinha-period";

type DividendMovement = {
  type: TradeMovementType;
  quantity: unknown;
  unitPrice: unknown;
  date: Date;
};

export type FiiIncomeEstimate = {
  /** Patrimônio × DY ÷ 12 (estimativa pelo yield cadastrado). */
  estimatedMonthlyFromDy: number | null;
  /** Soma dos dividendos lançados nos últimos 12 meses. */
  dividendsLast12Months: number;
  /** Média mensal = soma 12m ÷ 12 (só se houver lançamentos no período). */
  averageMonthlyFromHistory: number | null;
  /** Quantidade de pagamentos registrados em 12m. */
  dividendCountLast12Months: number;
  /** Último dividendo registrado (valor total do lançamento). */
  lastDividendAmount: number | null;
  lastDividendDate: Date | null;
};

function twelveMonthsAgoStart(referenceDate: Date): Date {
  const key = toBrazilMonthKey(referenceDate);
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1 - 11, 1);
}

export function calculateFiiIncomeEstimate(
  marketValue: number,
  dividendYieldPercent: number | null,
  movements: DividendMovement[],
  referenceDate: Date = new Date(),
): FiiIncomeEstimate {
  const estimatedMonthlyFromDy =
    marketValue > 0 && dividendYieldPercent != null && dividendYieldPercent > 0
      ? (marketValue * (dividendYieldPercent / 100)) / 12
      : null;

  const cutoff = twelveMonthsAgoStart(referenceDate);

  const dividends = movements
    .filter((m) => m.type === "DIVIDENDO" && m.date >= cutoff)
    .map((m) => ({
      date: m.date,
      amount: toNumber(m.quantity) * toNumber(m.unitPrice),
    }))
    .filter((m) => m.amount > 0)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const dividendsLast12Months = dividends.reduce((s, m) => s + m.amount, 0);
  const dividendCountLast12Months = dividends.length;

  const averageMonthlyFromHistory =
    dividendCountLast12Months > 0 ? dividendsLast12Months / 12 : null;

  const last = dividends[0];

  return {
    estimatedMonthlyFromDy,
    dividendsLast12Months,
    averageMonthlyFromHistory,
    dividendCountLast12Months,
    lastDividendAmount: last?.amount ?? null,
    lastDividendDate: last?.date ?? null,
  };
}

export function sumEstimatedMonthlyFromDy(
  items: { estimatedMonthlyFromDy: number | null }[],
): number {
  return items.reduce((s, i) => s + (i.estimatedMonthlyFromDy ?? 0), 0);
}
