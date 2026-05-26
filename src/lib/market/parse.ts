/** Converte "105,77" ou "1.234,56" para número. */
export function parseBrNumberString(value: string): number {
  const cleaned = value
    .trim()
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Brapi/i10 podem retornar fração (0,12) ou percentual (12). */
export function normalizeDividendYieldPercent(dy: number): number {
  if (!Number.isFinite(dy) || dy <= 0) return dy;
  return dy <= 1 ? dy * 100 : dy;
}
