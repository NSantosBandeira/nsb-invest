import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getPortfolioSummary } from "@/lib/portfolio/summary";
import { getGainsReport } from "@/lib/portfolio/gains-report";
import { GainValue } from "@/components/ganhos/gain-value";
import { formatBRL, formatDate } from "@/lib/format";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const typeLabels: Record<string, string> = {
  APORTE: "Aporte",
  RESGATE: "Resgate",
  RENDIMENTO: "Rendimento",
  AJUSTE: "Ajuste",
  COMPRA: "Compra",
  VENDA: "Venda",
  DIVIDENDO: "Dividendo",
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [summary, gains] = await Promise.all([
    getPortfolioSummary(user.id),
    getGainsReport(user.id),
  ]);

  return (
    <div className="page-shell">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Visão consolidada do seu patrimônio</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Patrimônio total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="stat-value-lg">{formatBRL(summary.total)}</p>
          <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <span className="text-muted-foreground">
              Ganho capital: <GainValue value={gains.ganhoCapital} />
            </span>
            <span className="text-muted-foreground">
              Proventos: {formatBRL(gains.proventos)}
            </span>
            <Link href="/ganhos" className="text-primary hover:underline">
              Ver evolução e detalhes →
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Caixinhas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-value">{formatBRL(summary.caixinhas)}</p>
            <Link href="/caixinhas" className="mt-2 text-sm text-primary hover:underline">
              Ver detalhes
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">FIIs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-value">{formatBRL(summary.fiis)}</p>
            <Link href="/fiis" className="mt-2 text-sm text-primary hover:underline">
              Ver detalhes
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="stat-value">{formatBRL(summary.acoes)}</p>
            <Link href="/acoes" className="mt-2 text-sm text-primary hover:underline">
              Ver detalhes
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alocação por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationChart data={summary.allocation} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma movimentação registrada ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {m.label}
                          <Badge variant="outline" className="text-xs">
                            {m.assetType === "caixinha"
                              ? "Caixinha"
                              : m.assetType === "fii"
                                ? "FII"
                                : "Ação"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{typeLabels[m.type] ?? m.type}</TableCell>
                      <TableCell className="text-right">{formatBRL(m.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
