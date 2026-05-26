import { notFound } from "next/navigation";
import Link from "next/link";
import { getStockPosition, deleteStockPosition } from "@/actions/acoes";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { SyncTickerQuoteButton } from "@/components/market/sync-ticker-quote-button";
import { toNumber } from "@/lib/decimal";
import { StockMovementForm, UpdateStockPriceForm } from "@/components/acoes/stock-forms";
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

export default async function AcaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const position = await getStockPosition(id);
  if (!position) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/acoes"
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
        <DeleteButton action={deleteStockPosition} entityId={id} redirectTo="/acoes" />
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Cotação e DY pela internet</CardTitle>
          <SyncTickerQuoteButton ticker={position.ticker} assetType="acao" />
        </CardHeader>
        <CardContent>
          <UpdateStockPriceForm
            positionId={position.id}
            currentPrice={String(toNumber(position.currentPrice))}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <StockMovementForm positionId={position.id} />

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
