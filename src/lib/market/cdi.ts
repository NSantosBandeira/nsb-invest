import { cache } from "react";

const BCB_CDI_SERIES = 12;
const BUSINESS_DAYS_PER_YEAR = 252;
const DEFAULT_CDI_ANNUAL_PERCENT = 14.9;

type BcbPoint = { data: string; valor: string };

function parseEnvCdiAnnual(): number | null {
  const raw = process.env.CDI_ANNUAL_PERCENT?.trim();
  if (!raw) return null;
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Série 12 do BCB: taxa CDI **diária** em % (ex.: 0,0534). */
export function cdiDailyToAnnualPercent(dailyPercent: number): number {
  return ((1 + dailyPercent / 100) ** BUSINESS_DAYS_PER_YEAR - 1) * 100;
}

export function cdiAnnualToDailyPercent(annualPercent: number): number {
  return ((1 + annualPercent / 100) ** (1 / BUSINESS_DAYS_PER_YEAR) - 1) * 100;
}

/**
 * Série 12 costuma vir em % ao dia (< 1). Valores >= 5 tratamos como % a.a.
 */
export function normalizeBcbCdiToDailyPercent(raw: number): number {
  if (raw >= 5) return cdiAnnualToDailyPercent(raw);
  return raw;
}

async function fetchCdiDailyFromBcb(): Promise<number | null> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${BCB_CDI_SERIES}/dados/ultimos/1?formato=json`;

  try {
    const res = await fetch(url, { next: { revalidate: 6 * 60 * 60 } });
    if (!res.ok) return null;

    const data = (await res.json()) as BcbPoint[];
    const last = data[data.length - 1];
    if (!last) return null;

    const value = parseFloat(String(last.valor).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return null;

    return normalizeBcbCdiToDailyPercent(value);
  } catch {
    return null;
  }
}

/** CDI do dia (% ao dia útil) — BCB ou derivado do env/padrão anual. */
export const getCdiDailyRatePercent = cache(async (): Promise<number> => {
  const fromBcb = await fetchCdiDailyFromBcb();
  if (fromBcb != null) return fromBcb;

  const annual = parseEnvCdiAnnual() ?? DEFAULT_CDI_ANNUAL_PERCENT;
  return cdiAnnualToDailyPercent(annual);
});

/** CDI anualizado (% a.a.) — para exibição. */
export const getCdiAnnualRatePercent = cache(async (): Promise<number> => {
  const daily = await getCdiDailyRatePercent();
  return cdiDailyToAnnualPercent(daily);
});
