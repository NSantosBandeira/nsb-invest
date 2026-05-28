import Link from "next/link";
import { getCaixinhas } from "@/actions/caixinhas";
import { getInstitutions } from "@/actions/institutions";
import { formatBRL } from "@/lib/format";
import { CaixinhaGainValue } from "@/components/caixinhas/caixinha-gain-value";
import { GainValue } from "@/components/ganhos/gain-value";
import { toNumber } from "@/lib/decimal";
import {
  NewCaixinhaDialog,
  NewInstitutionDialog,
} from "@/components/caixinhas/caixinha-forms";
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

export default async function CaixinhasPage() {
  const [caixinhas, institutions] = await Promise.all([
    getCaixinhas(),
    getInstitutions(),
  ]);

  const total = caixinhas.reduce((sum, c) => sum + c.balance, 0);
  const totalDaily = caixinhas.reduce((sum, c) => sum + c.gains.dailyGain, 0);
  const totalMonthly = caixinhas.reduce((sum, c) => sum + c.gains.monthlyGain, 0);

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Caixinhas</h1>
          <p className="text-muted-foreground">
            Total: {formatBRL(total)}
            <span className="mx-2">·</span>
            Hoje: <GainValue value={totalDaily} className="inline" />
            <span className="mx-2">·</span>
            Mês: <GainValue value={totalMonthly} className="inline" />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ganho hoje/mês com <span className="font-medium">est.</span> usa saldo × % CDI × taxa
            CDI (BCB). Cadastre o % CDI em cada caixinha.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewInstitutionDialog
            institutionNames={institutions.map((i) => i.name)}
          />
          <NewCaixinhaDialog institutions={institutions} />
        </div>
      </div>

      {caixinhas.length === 0 ? (
        <EmptyState
          title="Nenhuma caixinha cadastrada"
          description="Cadastre suas caixinhas de banco para acompanhar aportes, resgates e rendimentos. Use o botão acima para começar."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Suas caixinhas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead>% CDI</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">~Hoje</TableHead>
                  <TableHead className="text-right">~Mês</TableHead>
                  <TableHead className="text-right">Ganho total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caixinhas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/caixinhas/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>{c.institution?.name ?? "—"}</TableCell>
                    <TableCell>
                      {c.cdiPercent ? `${toNumber(c.cdiPercent)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(c.balance)}
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
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/caixinhas/${c.id}`}
                        className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                      >
                        Valores
                      </Link>
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
