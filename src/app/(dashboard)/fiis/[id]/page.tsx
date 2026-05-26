import { notFound } from "next/navigation";
import Link from "next/link";
import { getFiiPosition, deleteFiiPosition } from "@/actions/fiis";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { SyncTickerQuoteButton } from "@/components/market/sync-ticker-quote-button";
import { toNumber } from "@/lib/decimal";
import {
  DeleteFiiMovementButton,
  EditFiiMovementDialog,
  FiiMovementForm,
  UpdateFiiDividendYieldForm,
  UpdateFiiPriceForm,
} from "@/components/fiis/fii-forms";
import { DeleteButton } from "@/components/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

const typeLabels: Record<string, string> = {
  COMPRA: "Compra",
  VENDA: "Venda",
  DIVIDENDO: "Dividendo",
};

export default async function FiiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const position = await getFiiPosition(id);
  if (!position) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/fiis"
            className="mb-2 -ml-2 inline-flex h-7 items-center gap-1 rounded-lg px-2 text-sm hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{position.ticker}</h1>
          <p className="text-muted-foreground">
            {position.institution?.name ?? "Sem instituição"}
          </p>
        </div>
        <DeleteButton action={deleteFiiPosition} entityId={id} redirectTo="/fiis" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Valor de mercado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBRL(position.marketValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Preço atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBRL(toNumber(position.currentPrice))}</p>
            {position.lastQuoteAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Atualizado em {formatDate(position.lastQuoteAt)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Dividend yield (12m)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {position.dividendYield != null
                ? formatPercent(position.dividendYield)
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {position.lastQuoteAt ? "Última busca online" : "Manual ou importado"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Quantidade / PM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{toNumber(position.quantity)}</p>
            <p className="text-sm text-muted-foreground">
              PM {formatBRL(toNumber(position.averagePrice))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Previsão de renda mensal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Estimativas — não são garantia de pagamento futuro.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Pelo DY (12 meses)</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {position.income.estimatedMonthlyFromDy != null
                  ? formatBRL(position.income.estimatedMonthlyFromDy)
                  : "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {position.dividendYield != null
                  ? `${formatBRL(position.marketValue)} × ${formatPercent(position.dividendYield)} ÷ 12`
                  : "Informe o DY (internet ou manual) para estimar"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Média pelo histórico (12m)</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {position.income.averageMonthlyFromHistory != null
                  ? formatBRL(position.income.averageMonthlyFromHistory)
                  : "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {position.income.dividendCountLast12Months > 0
                  ? `${formatBRL(position.income.dividendsLast12Months)} em ${position.income.dividendCountLast12Months} pagamento(s) registrado(s) ÷ 12`
                  : "Registre dividendos no histórico para calcular a média"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Último dividendo lançado</p>
              <p className="mt-1 text-2xl font-bold">
                {position.income.lastDividendAmount != null
                  ? formatBRL(position.income.lastDividendAmount)
                  : "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {position.income.lastDividendDate
                  ? formatDate(position.income.lastDividendDate)
                  : "Nenhum lançamento tipo Dividendo"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Cotação e DY pela internet</CardTitle>
          <SyncTickerQuoteButton ticker={position.ticker} assetType="fii" />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Busca preço e dividend yield de <strong>{position.ticker}</strong> no{" "}
            <a
              href={`https://investidor10.com.br/fiis/${position.ticker.toLowerCase()}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Investidor10
            </a>{" "}
            (padrão). Opcional: configure <code className="text-xs">BRAPI_TOKEN</code> no .env
            para usar a Brapi também.
          </p>
          <UpdateFiiPriceForm
            positionId={position.id}
            currentPrice={String(toNumber(position.currentPrice))}
          />
          <UpdateFiiDividendYieldForm
            positionId={position.id}
            dividendYield={position.dividendYield}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <FiiMovementForm positionId={position.id} />

        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            {position.movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="w-20 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {position.movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.date)}</TableCell>
                      <TableCell>{typeLabels[m.type] ?? m.type}</TableCell>
                      <TableCell>{toNumber(m.quantity)}</TableCell>
                      <TableCell className="text-right">
                        {formatBRL(toNumber(m.unitPrice))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-0.5">
                          <EditFiiMovementDialog movement={m} positionId={position.id} />
                          <DeleteFiiMovementButton movementId={m.id} />
                        </div>
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
