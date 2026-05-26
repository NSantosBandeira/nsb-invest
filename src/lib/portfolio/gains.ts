import type { CaixinhaMovementType, TradeMovementType } from "@/generated/prisma/client";
import { toNumber } from "@/lib/decimal";
import { calculateMarketValue } from "@/lib/portfolio/position";

type TradeMovement = {
  type: TradeMovementType;
  quantity: unknown;
  unitPrice: unknown;
  date?: Date;
};

export type TradeGains = {
  costBasis: number;
  marketValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  realizedGain: number;
  dividends: number;
  totalGain: number;
  totalGainPercent: number;
  totalInvested: number;
};

export function calculateTradeGains(
  movements: TradeMovement[],
  quantity: number,
  averagePrice: number,
  currentPrice: number,
): TradeGains {
  const sorted = [...movements].sort(
    (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
  );

  let qty = 0;
  let totalCost = 0;
  let realizedGain = 0;
  let dividends = 0;
  let totalInvested = 0;

  for (const m of sorted) {
    const q = toNumber(m.quantity);
    const price = toNumber(m.unitPrice);

    if (m.type === "COMPRA") {
      totalInvested += q * price;
      totalCost += q * price;
      qty += q;
    } else if (m.type === "VENDA") {
      const avg = qty > 0 ? totalCost / qty : 0;
      realizedGain += (price - avg) * q;
      totalCost -= avg * q;
      qty -= q;
      if (qty < 0.0001) {
        qty = 0;
        totalCost = 0;
      }
    } else if (m.type === "DIVIDENDO") {
      dividends += q * price;
    }
  }

  const costBasis = quantity * averagePrice;
  const marketValue = calculateMarketValue(quantity, currentPrice);
  const unrealizedGain = marketValue - costBasis;
  const unrealizedGainPercent =
    costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

  const capitalGain = unrealizedGain + realizedGain;
  const totalGain = capitalGain + dividends;
  const totalGainPercent =
    totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  return {
    costBasis,
    marketValue,
    unrealizedGain,
    unrealizedGainPercent,
    realizedGain,
    dividends,
    totalGain,
    totalGainPercent,
    totalInvested,
  };
}

import {
  estimateCaixinhaAccumulatedGainSinceStart,
  estimateCaixinhaDailyGainFromDailyCdi,
  estimateCaixinhaMonthToDateGain,
} from "@/lib/portfolio/caixinha-estimate";
import {
  calculateCaixinhaDailyGain,
  calculateCaixinhaMonthlyGain,
  summarizeCaixinhaToday,
  type CaixinhaTodaySummary,
} from "@/lib/portfolio/caixinha-period";

export type CaixinhaGainsOptions = {
  cdiPercent?: number | null;
  cdiAnnualRate?: number | null;
  cdiDailyRate?: number | null;
};

type CaixinhaMovement = {
  type: CaixinhaMovementType;
  amount: unknown;
  date?: Date;
};

export type CaixinhaGains = {
  balance: number;
  netDeposits: number;
  rendimentos: number;
  gain: number;
  gainActual: number;
  gainIsEstimated: boolean;
  gainPercent: number;
  dailyGain: number;
  monthlyGain: number;
  dailyGainIsEstimated: boolean;
  monthlyGainIsEstimated: boolean;
  today: CaixinhaTodaySummary;
  estimate?: {
    cdiDailyPercent: number;
    cdiAnnualPercent: number;
    effectiveDailyPercent: number;
    effectiveAnnualPercent: number;
    accumulatedSinceStart: number;
    businessDaysSimulated: number;
    firstMovementDate: Date | null;
  };
};

export function calculateCaixinhaGains(
  movements: CaixinhaMovement[],
  balance: number,
  options?: CaixinhaGainsOptions,
): CaixinhaGains {
  let aportes = 0;
  let resgates = 0;
  let rendimentos = 0;

  for (const m of movements) {
    const amount = toNumber(m.amount);
    switch (m.type) {
      case "APORTE":
        aportes += amount;
        break;
      case "RESGATE":
        resgates += amount;
        break;
      case "RENDIMENTO":
        rendimentos += amount;
        break;
      default:
        break;
    }
  }

  const netDeposits = aportes - resgates;
  const gainActual = balance - netDeposits;
  let gain = gainActual;
  let gainIsEstimated = false;
  let gainPercent = netDeposits > 0 ? (gainActual / netDeposits) * 100 : 0;

  const withDates = movements.filter(
    (m): m is CaixinhaMovement & { date: Date } => m.date instanceof Date,
  );

  const dailyActual =
    withDates.length > 0 ? calculateCaixinhaDailyGain(withDates) : 0;
  const monthlyActual =
    withDates.length > 0 ? calculateCaixinhaMonthlyGain(withDates) : 0;
  const today =
    withDates.length > 0
      ? summarizeCaixinhaToday(withDates)
      : { rendimentos: 0, aportes: 0, resgates: 0 };

  const cdiPercent = options?.cdiPercent ?? null;
  const cdiAnnual = options?.cdiAnnualRate ?? null;
  const cdiDaily = options?.cdiDailyRate ?? null;
  const canEstimate =
    balance > 0 &&
    cdiPercent != null &&
    cdiPercent > 0 &&
    cdiDaily != null &&
    cdiDaily > 0 &&
    cdiAnnual != null &&
    cdiAnnual > 0;

  let dailyGain = dailyActual;
  let monthlyGain = monthlyActual;
  let dailyGainIsEstimated = false;
  let monthlyGainIsEstimated = false;
  let estimate: CaixinhaGains["estimate"];

  if (canEstimate) {
    const dailyEstimated = estimateCaixinhaDailyGainFromDailyCdi(
      balance,
      cdiDaily,
      cdiPercent,
    );
    const monthlyEstimated = estimateCaixinhaMonthToDateGain(
      balance,
      cdiAnnual,
      cdiPercent,
    );

    if (today.rendimentos <= 0 && dailyActual === 0) {
      dailyGain = dailyEstimated;
      dailyGainIsEstimated = true;
    }

    if (monthlyActual === 0) {
      monthlyGain = monthlyEstimated;
      monthlyGainIsEstimated = true;
    }

    const effectiveDailyPercent = cdiDaily * (cdiPercent / 100);
    const accumulated =
      withDates.length > 0
        ? estimateCaixinhaAccumulatedGainSinceStart(
            withDates,
            cdiDaily,
            cdiPercent,
          )
        : { total: 0, businessDays: 0, firstMovementDate: null };

    if (rendimentos === 0 && accumulated.total > 0) {
      gain = accumulated.total;
      gainIsEstimated = true;
      gainPercent =
        netDeposits > 0 ? (gain / netDeposits) * 100 : 0;
    }

    estimate = {
      cdiDailyPercent: cdiDaily,
      cdiAnnualPercent: cdiAnnual,
      effectiveDailyPercent,
      effectiveAnnualPercent: cdiAnnual * (cdiPercent / 100),
      accumulatedSinceStart: accumulated.total,
      businessDaysSimulated: accumulated.businessDays,
      firstMovementDate: accumulated.firstMovementDate,
    };
  }

  return {
    balance,
    netDeposits,
    rendimentos,
    gain,
    gainActual,
    gainIsEstimated,
    gainPercent,
    dailyGain,
    monthlyGain,
    dailyGainIsEstimated,
    monthlyGainIsEstimated,
    today,
    estimate,
  };
}
