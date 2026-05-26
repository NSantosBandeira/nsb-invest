import type { CaixinhaMovementType } from "@/generated/prisma/client";
import { calculateCaixinhaInvestedBalance } from "@/lib/portfolio/caixinha";
import {
  toBrazilDayKey,
  toBrazilMonthKey,
} from "@/lib/portfolio/caixinha-period";

const BUSINESS_DAYS_PER_YEAR = 252;
const TZ = "America/Sao_Paulo";

export function effectiveAnnualRatePercent(
  cdiAnnualPercent: number,
  cdiPercentOfIndexer: number,
): number {
  return cdiAnnualPercent * (cdiPercentOfIndexer / 100);
}

/** Rendimento diário estimado a partir do CDI **diário** (% ao dia × % da caixinha). */
export function estimateCaixinhaDailyGainFromDailyCdi(
  balance: number,
  cdiDailyPercent: number,
  cdiPercentOfIndexer: number,
): number {
  if (balance <= 0 || cdiPercentOfIndexer <= 0 || cdiDailyPercent <= 0) return 0;
  return balance * (cdiDailyPercent / 100) * (cdiPercentOfIndexer / 100);
}

/** Rendimento diário estimado (dias úteis, juros compostos a partir do CDI anual). */
export function estimateCaixinhaDailyGain(
  balance: number,
  cdiAnnualPercent: number,
  cdiPercentOfIndexer: number,
): number {
  if (balance <= 0 || cdiPercentOfIndexer <= 0 || cdiAnnualPercent <= 0) return 0;

  const effective = effectiveAnnualRatePercent(cdiAnnualPercent, cdiPercentOfIndexer);
  const dailyFactor = (1 + effective / 100) ** (1 / BUSINESS_DAYS_PER_YEAR) - 1;
  return balance * dailyFactor;
}

function isBrazilBusinessDay(date: Date): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(date);
  return weekday !== "Sat" && weekday !== "Sun";
}

/** Dias úteis já decorridos no mês (inclui hoje se for dia útil). */
export function businessDaysElapsedInMonth(referenceDate: Date = new Date()): number {
  const monthKey = toBrazilMonthKey(referenceDate);
  const todayKey = toBrazilDayKey(referenceDate);
  const [year, month] = monthKey.split("-").map(Number);

  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const probe = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00-03:00`);
    if (toBrazilMonthKey(probe) !== monthKey) break;

    const key = toBrazilDayKey(probe);
    if (key > todayKey) break;
    if (isBrazilBusinessDay(probe)) count++;
  }

  return count;
}

type DatedMovement = {
  type: CaixinhaMovementType;
  amount: unknown;
  date: Date;
};

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function iterateBusinessDays(
  from: Date,
  to: Date,
  visit: (dayKey: string, date: Date) => void,
): void {
  const endKey = toBrazilDayKey(to);
  let current = new Date(from);
  current.setUTCHours(12, 0, 0, 0);

  while (toBrazilDayKey(current) <= endKey) {
    if (isBrazilBusinessDay(current)) {
      visit(toBrazilDayKey(current), current);
    }
    current = addCalendarDays(current, 1);
  }
}

function investedBalanceAtEndOfDay(
  movements: DatedMovement[],
  dayKey: string,
): number {
  const upToDay = movements.filter((m) => toBrazilDayKey(m.date) <= dayKey);
  return calculateCaixinhaInvestedBalance(upToDay);
}

export type CaixinhaAccumulatedEstimate = {
  total: number;
  businessDays: number;
  firstMovementDate: Date | null;
};

/**
 * Soma o rendimento estimado dia a dia desde o primeiro lançamento até hoje.
 * Usa o saldo investido ao fim de cada dia útil (aportes/resgates/ajustes).
 */
export function estimateCaixinhaAccumulatedGainSinceStart(
  movements: DatedMovement[],
  cdiDailyPercent: number,
  cdiPercentOfIndexer: number,
  referenceDate: Date = new Date(),
): CaixinhaAccumulatedEstimate {
  if (movements.length === 0 || cdiPercentOfIndexer <= 0 || cdiDailyPercent <= 0) {
    return { total: 0, businessDays: 0, firstMovementDate: null };
  }

  const sorted = [...movements].sort((a, b) => a.date.getTime() - b.date.getTime());
  const firstMovementDate = sorted[0].date;

  let total = 0;
  let businessDays = 0;

  iterateBusinessDays(firstMovementDate, referenceDate, (dayKey) => {
    const balance = investedBalanceAtEndOfDay(sorted, dayKey);
    if (balance <= 0) return;

    total += estimateCaixinhaDailyGainFromDailyCdi(
      balance,
      cdiDailyPercent,
      cdiPercentOfIndexer,
    );
    businessDays++;
  });

  return { total, businessDays, firstMovementDate };
}

/** Ganho no mês estimado (dias úteis decorridos × rendimento diário). */
export function estimateCaixinhaMonthToDateGain(
  balance: number,
  cdiAnnualPercent: number,
  cdiPercentOfIndexer: number,
  referenceDate: Date = new Date(),
): number {
  const daily = estimateCaixinhaDailyGain(
    balance,
    cdiAnnualPercent,
    cdiPercentOfIndexer,
  );
  const days = businessDaysElapsedInMonth(referenceDate);
  return daily * days;
}
