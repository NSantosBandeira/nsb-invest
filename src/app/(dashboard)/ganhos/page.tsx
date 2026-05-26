import { getSessionUser } from "@/lib/session";
import { getGainsReport } from "@/lib/portfolio/gains-report";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { CaixinhaGainValue } from "@/components/caixinhas/caixinha-gain-value";
import { GainValue } from "@/components/ganhos/gain-value";
import { EvolutionChart } from "@/components/ganhos/evolution-chart";
import { SyncQuotesButton } from "@/components/ganhos/sync-quotes-button";
import { ImportCsvDialog } from "@/components/ganhos/import-csv-dialog";
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
function TradePositionsTable({
  positions,
  assetLabel,
  showMonthlyIncome = false,
}: {
  positions: Awaited<ReturnType<typeof getGainsReport>>["fiis"]["positions"];
  assetLabel: string;
  showMonthlyIncome?: boolean;
}) {
  if (positions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma posição de {assetLabel.toLowerCase()} cadastrada.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticker</TableHead>
          <TableHead className="text-right">Investido</TableHead>
          <TableHead className="text-right">Mercado</TableHead>
          {showMonthlyIncome && (
            <TableHead className="text-right">~Renda/mês</TableHead>
          )}
          <TableHead className="text-right">Ganho capital</TableHead>
          <TableHead className="text-right" title="Só dividendos/rendimentos lançados no histórico">
            Proventos (recebidos)
          </TableHead>
          <TableHead className="text-right">Ganho total</TableHead>
          <TableHead className="text-right">DY (12m)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.map((p) => {
          const capitalGain = p.gains.unrealizedGain + p.gains.realizedGain;
          return (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.ticker}</TableCell>
              <TableCell className="text-right">
                {formatBRL(p.gains.totalInvested)}
              </TableCell>
              <TableCell className="text-right">
                {formatBRL(p.gains.marketValue)}
              </TableCell>
              {showMonthlyIncome && (
                <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                  {p.income?.estimatedMonthlyFromDy != null
                    ? formatBRL(p.income.estimatedMonthlyFromDy)
                    : p.income?.averageMonthlyFromHistory != null
                      ? formatBRL(p.income.averageMonthlyFromHistory)
                      : "—"}
                </TableCell>
              )}
              <TableCell className="text-right">
                <GainValue value={capitalGain} />
              </TableCell>
              <TableCell className="text-right">
                <GainValue value={p.gains.dividends} />
              </TableCell>
              <TableCell className="text-right">
                <GainValue
                  value={p.gains.totalGain}
                  percent={p.gains.totalGainPercent}
                  showPercent
                />
              </TableCell>
              <TableCell className="text-right">
                {p.dividendYield != null ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <span>{formatPercent(p.dividendYield)}</span>
                    {p.lastQuoteAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(p.lastQuoteAt)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function GanhosPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const report = await getGainsReport(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ganhos e evolução</h1>
          <p className="text-muted-foreground">
            Acompanhe rentabilidade, proventos e patrimônio ao longo do tempo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportCsvDialog />
          <SyncQuotesButton />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Patrimônio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBRL(report.patrimonio)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total investido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBRL(report.totalInvestido)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ganho (capital)</CardTitle>
          </CardHeader>
          <CardContent>
            <GainValue value={report.ganhoCapital} className="text-2xl font-bold" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Proventos recebidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatBRL(report.proventos)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Só entra o que você lançou (dividendo em FII/ação, rendimento em
              caixinha). A coluna ~Renda/mês é estimativa pelo DY/CDI.
            </p>
            {report.proventosEstimadosMensal > 0 && (
              <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                ~{formatBRL(report.proventosEstimadosMensal)}/mês estimados
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução do patrimônio</CardTitle>
        </CardHeader>
        <CardContent>
          <EvolutionChart data={report.evolution} />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Fundos imobiliários</CardTitle>
              <Badge variant="secondary">{formatBRL(report.fiis.total)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Ganho capital: <GainValue value={report.fiis.ganho} /> · Recebidos:{" "}
              {formatBRL(report.fiis.proventos)}
              {report.fiis.rendaMensalEstimadaDy > 0 && (
                <>
                  {" "}
                  · ~{formatBRL(report.fiis.rendaMensalEstimadaDy)}/mês estimado (DY)
                </>
              )}
              {report.fiis.rendaMensalMediaHistorico > 0 && (
                <>
                  {" "}
                  · ~{formatBRL(report.fiis.rendaMensalMediaHistorico)}/mês (histórico)
                </>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <TradePositionsTable
              positions={report.fiis.positions}
              assetLabel="FII"
              showMonthlyIncome
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Ações</CardTitle>
              <Badge variant="secondary">{formatBRL(report.acoes.total)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Ganho capital: <GainValue value={report.acoes.ganho} /> · Proventos:{" "}
              {formatBRL(report.acoes.proventos)}
            </p>
          </CardHeader>
          <CardContent>
            <TradePositionsTable
              positions={report.acoes.positions}
              assetLabel="Ação"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Caixinhas</CardTitle>
              <Badge variant="secondary">{formatBRL(report.caixinhas.total)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Ganho sobre aportes líquidos:{" "}
              <GainValue value={report.caixinhas.ganho} /> · Rendimentos:{" "}
              {formatBRL(report.caixinhas.rendimentos)}
            </p>
          </CardHeader>
          <CardContent>
            {report.caixinhas.positions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma caixinha cadastrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Aportes líquidos</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Hoje</TableHead>
                    <TableHead className="text-right">No mês</TableHead>
                    <TableHead className="text-right">Ganho total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.caixinhas.positions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right">
                        {formatBRL(c.gains.netDeposits)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatBRL(c.gains.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <CaixinhaGainValue
                          value={c.gains.dailyGain}
                          isEstimated={c.gains.dailyGainIsEstimated}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <CaixinhaGainValue
                          value={c.gains.monthlyGain}
                          isEstimated={c.gains.monthlyGainIsEstimated}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <CaixinhaGainValue
                          value={c.gains.gain}
                          isEstimated={c.gains.gainIsEstimated}
                        />
                        {c.gains.gainPercent !== 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({c.gains.gainPercent.toFixed(2)}%)
                          </span>
                        )}
                      </TableCell>
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
