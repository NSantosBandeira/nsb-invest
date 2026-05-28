"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatBRL, formatPercent } from "@/lib/format";

function slicePercentLabel(percent: number | undefined): string {
  const p = percent ?? 0;
  const asHundred = p <= 1 ? p * 100 : p;
  return formatPercent(asHundred);
}

type AllocationChartProps = {
  data: { name: string; value: number; percent: number }[];
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
];

export function AllocationChart({ data }: AllocationChartProps) {
  const isCompact = useMediaQuery("(max-width: 640px)");
  const filtered = data.filter((d) => d.value > 0);

  if (filtered.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sem dados para exibir
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={isCompact ? 240 : 280}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={isCompact ? 64 : 90}
          label={isCompact ? false : ({ name, percent }) => `${name} ${slicePercentLabel(percent)}`}
        >
          {filtered.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatBRL(Number(value))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
