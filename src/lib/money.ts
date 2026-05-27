/**
 * Parsing e formatação de valores monetários no padrão brasileiro (R$).
 */

/** Converte string/number para centavos (apenas dígitos). */
export function moneyToDigits(value: string | number): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value === 0) return "";
    return Math.round(Math.abs(value) * 100).toString();
  }
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = parseBRLInput(trimmed);
  if (!Number.isFinite(parsed) || parsed === 0) return "";
  return Math.round(Math.abs(parsed) * 100).toString();
}

/** Formata dígitos (centavos) para exibição: 150000 → "1.500,00". */
export function formatMoneyDigits(digits: string): string {
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents)) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseMoneyDigitsToNumber(digits: string): number {
  return parseInt(digits || "0", 10) / 100;
}

/**
 * Interpreta valor monetário em pt-BR ou formato normalizado (1234.56).
 * Ex.: "35,20", "1.234,56", "R$ 1.500,00", "35.20" (decimal com ponto).
 */
export function parseBRLInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return NaN;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : NaN;
  }

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
    const parts = s.split(",");
    if (parts.length > 2) {
      s = parts.join("");
    } else {
      const frac = parts[1] ?? "";
      if (frac.length === 3 && parts[0].length > 0) {
        s = parts[0] + frac;
      } else {
        s = `${parts[0]}.${frac}`;
      }
    }
  } else if (lastDot !== -1) {
    const parts = s.split(".");
    if (parts.length > 2) {
      s = parts.join("");
    } else {
      const frac = parts[1] ?? "";
      if (frac.length <= 2) {
        s = `${parts[0]}.${frac}`;
      } else {
        s = parts.join("");
      }
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseMoneyInput(value: string, allowZero = false): number {
  const n = parseBRLInput(value);
  if (!Number.isFinite(n) || (!allowZero && n <= 0)) {
    throw new Error("Valor inválido");
  }
  return n;
}

/** Extrai centavos de texto colado (ex.: "1.234,56" ou "35,20"). */
export function pastedTextToMoneyDigits(text: string): string {
  const parsed = parseBRLInput(text);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.round(parsed * 100).toString();
  }
  return text.replace(/\D/g, "");
}
