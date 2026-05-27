export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export { parseBRLInput, parseMoneyInput } from "@/lib/money";

export function parseQuantityInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return NaN;

  let s = trimmed.replace(/[^\d,.-]/g, "");
  if (!s) return NaN;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot !== -1) {
    const parts = s.split(".");
    if (parts.length > 2) {
      s = parts.join("");
    } else if ((parts[1] ?? "").length > 4) {
      s = parts.join("");
    }
  }

  const parsed = parseFloat(s);
  return Number.isFinite(parsed) ? parsed : NaN;
}
