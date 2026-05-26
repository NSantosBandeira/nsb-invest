import { notFound } from "next/navigation";
import Link from "next/link";
import { getCaixinha } from "@/actions/caixinhas";
import { deleteCaixinha } from "@/actions/caixinhas";
import { getInstitutions } from "@/actions/institutions";
import { formatBRL, formatDate } from "@/lib/format";
import { CaixinhaGainValue } from "@/components/caixinhas/caixinha-gain-value";
import { GainValue } from "@/components/ganhos/gain-value";
import { formatPercent } from "@/lib/format";
import { toNumber } from "@/lib/decimal";
import {
  CaixinhaMovementForm,
  EditCaixinhaDialog,
} from "@/components/caixinhas/caixinha-forms";
import { DeleteMovementButton } from "@/components/caixinhas/delete-movement-button";
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
  APORTE: "Aporte",
  RESGATE: "Resgate",
  RENDIMENTO: "Rendimento",
  AJUSTE: "Ajuste",
};

export default async function CaixinhaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [caixinha, institutions] = await Promise.all([
    getCaixinha(id),
    getInstitutions(),
  ]);
  if (!caixinha) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/caixinhas"
            className="mb-2 -ml-2 inline-flex h-7 items-center gap-1 rounded-lg px-2 text-sm hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{caixinha.name}</h1>
          <p className="text-muted-foreground">
            {caixinha.institution?.name ?? "Sem instituição"}
            {caixinha.cdiPercent ? ` · ${toNumber(caixinha.cdiPercent)}% do CDI` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EditCaixinhaDialog
            caixinha={{
              id: caixinha.id,
              name: caixinha.name,
              institutionId: caixinha.institutionId,
              cdiPercent: caixinha.cdiPercent ? toNumber(caixinha.cdiPercent) : null,
              notes: caixinha.notes,
            }}
            institutions={institutions}
          />
          <DeleteButton action={deleteCaixinha} entityId={id} redirectTo="/caixinhas" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo atual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBRL(caixinha.balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ganho hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CaixinhaGainValue
                value={caixinha.gains.dailyGain}
                isEstimated={caixinha.gains.dailyGainIsEstimated}
              />
            </div>
            {caixinha.gains.dailyGainIsEstimated && caixinha.gains.estimate ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Estimado: {formatBRL(caixinha.balance)} ×{" "}
                {caixinha.gains.estimate.effectiveDailyPercent.toFixed(4)}% ao dia (
                {caixinha.cdiPercent ? `${toNumber(caixinha.cdiPercent)}% do CDI` : "% do CDI"})
                <span className="block">
                  CDI ref. {formatPercent(caixinha.gains.estimate.cdiAnnualPercent)} a.a. ·{" "}
                  {caixinha.gains.estimate.cdiDailyPercent.toFixed(4)}% ao dia (BCB)
                </span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Lançamentos de rendimento/ajuste de hoje. Sem % CDI, use tipo Rendimento.
              </p>
            )}
            {(caixinha.gains.today.rendimentos > 0 ||
              caixinha.gains.today.aportes > 0 ||
              caixinha.gains.today.resgates > 0) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Hoje: rendimentos {formatBRL(caixinha.gains.today.rendimentos)}
                {caixinha.gains.today.aportes > 0 &&
                  ` · aportes ${formatBRL(caixinha.gains.today.aportes)}`}
                {caixinha.gains.today.resgates > 0 &&
                  ` · resgates ${formatBRL(caixinha.gains.today.resgates)}`}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ganho no mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CaixinhaGainValue
                value={caixinha.gains.monthlyGain}
                isEstimated={caixinha.gains.monthlyGainIsEstimated}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {caixinha.gains.monthlyGainIsEstimated
                ? "Estimado: rendimento diário × dias úteis já passados no mês"
                : "Soma dos rendimentos/ajustes lançados no mês"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ganho total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CaixinhaGainValue
                value={caixinha.gains.gain}
                isEstimated={caixinha.gains.gainIsEstimated}
              />
            </div>
            {caixinha.gains.gainIsEstimated && caixinha.gains.estimate ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Estimado desde{" "}
                {caixinha.gains.estimate.firstMovementDate
                  ? formatDate(caixinha.gains.estimate.firstMovementDate)
                  : "—"}
                : {caixinha.gains.estimate.businessDaysSimulated} dia(s) útil(eis) ×
                rendimento diário no saldo investido.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Saldo − aportes líquidos · rendimentos lançados:{" "}
                {formatBRL(caixinha.gains.rendimentos)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CaixinhaMovementForm caixinhaId={caixinha.id} />

        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            {caixinha.movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caixinha.movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.date)}</TableCell>
                      <TableCell>{typeLabels[m.type] ?? m.type}</TableCell>
                      <TableCell className="text-right">
                        {formatBRL(toNumber(m.amount))}
                      </TableCell>
                      <TableCell>
                        <DeleteMovementButton movementId={m.id} />
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
