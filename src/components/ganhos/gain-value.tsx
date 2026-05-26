import { cn } from "@/lib/utils";
import { formatBRL, formatPercent } from "@/lib/format";

type GainValueProps = {
  value: number;
  percent?: number;
  showPercent?: boolean;
  className?: string;
};

export function GainValue({
  value,
  percent,
  showPercent = false,
  className,
}: GainValueProps) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "font-medium",
        positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {positive && value > 0 ? "+" : ""}
      {formatBRL(value)}
      {showPercent && percent != null && (
        <span className="ml-1 text-sm">({formatPercent(percent)})</span>
      )}
    </span>
  );
}
