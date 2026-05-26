import Link from "next/link";
import { getFiiPositions } from "@/actions/fiis";
import { getInstitutions } from "@/actions/institutions";
import { formatBRL, formatPercent } from "@/lib/format";
import { sumEstimatedMonthlyFromDy } from "@/lib/portfolio/fii-income";
import { GainValue } from "@/components/ganhos/gain-value";
import { toNumber } from "@/lib/decimal";
import { NewFiiDialog } from "@/components/fiis/fii-forms";
import { NewInstitutionDialog } from "@/components/caixinhas/caixinha-forms";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FiisPage() {
  const [positions, institutions] = await Promise.all([
    getFiiPositions(),
    getInstitutions(),
  ]);

  const total = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalMonthlyDy = sumEstimatedMonthlyFromDy(positions.map((p) => p.income));
  const totalMonthlyHistory = positions.reduce(
    (sum, p) => sum + (p.income.averageMonthlyFromHistory ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fundos imobiliários</h1>
          <p className="text-muted-foreground">
            Total: {formatBRL(total)}
            {totalMonthlyDy > 0 && (
              <>
                <span className="mx-2">·</span>
                ~{formatBRL(totalMonthlyDy)}/mês (DY)
              </>
            )}
            {totalMonthlyHistory > 0 && (
              <>
                <span className="mx-2">·</span>
                ~{formatBRL(totalMonthlyHistory)}/mês (histórico)
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewInstitutionDialog
            institutionNames={institutions.map((i) => i.name)}
          />
          <NewFiiDialog institutions={institutions} />
        </div>
      </div>

      {positions.length === 0 ? (
        <EmptyState
          title="Nenhum FII cadastrado"
          description="Cadastre seus fundos imobiliários e registre compras, vendas e dividendos."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Suas posições</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Preço médio</TableHead>
                  <TableHead>Preço atual</TableHead>
                  <TableHead className="text-right">Valor mercado</TableHead>
                  <TableHead className="text-right">~Renda/mês</TableHead>
                  <TableHead className="text-right">Ganho</TableHead>
                  <TableHead className="text-right">DY</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/fiis/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.ticker}
                      </Link>
                    </TableCell>
                    <TableCell>{toNumber(p.quantity)}</TableCell>
                    <TableCell>{formatBRL(toNumber(p.averagePrice))}</TableCell>
                    <TableCell>{formatBRL(toNumber(p.currentPrice))}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(p.marketValue)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {p.income.estimatedMonthlyFromDy != null
                        ? formatBRL(p.income.estimatedMonthlyFromDy)
                        : p.income.averageMonthlyFromHistory != null
                          ? formatBRL(p.income.averageMonthlyFromHistory)
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <GainValue value={p.gains.totalGain} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.dividendYield != null ? formatPercent(p.dividendYield) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
