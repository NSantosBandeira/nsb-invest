"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/format";
import type { EvolutionPoint } from "@/lib/portfolio/evolution";

type EvolutionChartProps = {
  data: EvolutionPoint[];
};

export function EvolutionChart({ data }: EvolutionChartProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Registre movimentações para ver a evolução
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) =>
            new Intl.NumberFormat("pt-BR", {
              notation: "compact",
              compactDisplay: "short",
            }).format(Number(v))
          }
        />
        <Tooltip formatter={(value) => formatBRL(Number(value))} />
        <Legend />
        <Area
          type="monotone"
          dataKey="caixinhas"
          name="Caixinhas"
          stackId="1"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="fiis"
          name="FIIs"
          stackId="1"
          stroke="var(--chart-2)"
          fill="var(--chart-2)"
          fillOpacity={0.6}
        />
        <Area
          type="monotone"
          dataKey="acoes"
          name="Ações"
          stackId="1"
          stroke="var(--chart-3)"
          fill="var(--chart-3)"
          fillOpacity={0.6}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
