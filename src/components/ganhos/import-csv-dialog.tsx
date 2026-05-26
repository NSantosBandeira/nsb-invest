"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import {
  importCaixinhaCsv,
  importInvestmentsWorkbook,
  importPositionsSnapshotCsv,
  importTradeCsv,
} from "@/actions/import";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type ImportMode =
  | "planilha_xlsx"
  | "fii_movimentos"
  | "fii_posicoes"
  | "acao_movimentos"
  | "acao_posicoes"
  | "caixinha";

const modeLabels: Record<ImportMode, string> = {
  planilha_xlsx: "Planilha de investimentos (.xlsx) — BOLSA + FIIS",
  fii_movimentos: "FIIs — movimentações (CSV)",
  fii_posicoes: "FIIs — posição atual (CSV)",
  acao_movimentos: "Ações — movimentações (CSV)",
  acao_posicoes: "Ações — posição atual (CSV)",
  caixinha: "Caixinhas — movimentações (CSV)",
};

export function ImportCsvDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("planilha_xlsx");
  const [csv, setCsv] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImport() {
    if (mode === "planilha_xlsx") {
      const file = fileRef.current?.files?.[0];
      if (!file) {
        toast.error("Selecione o arquivo Planilha de investimentos.xlsx");
        return;
      }

      startTransition(async () => {
        const fd = new FormData();
        fd.append("file", file);
        const result = await importInvestmentsWorkbook(fd);

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success(
          `Importado: ${result.fiis ?? 0} FII(s), ${result.acoes ?? 0} ação(ões)`,
        );
        if (result.summary?.length) {
          console.info("Importação:", result.summary);
        }
        if (fileRef.current) fileRef.current.value = "";
        setOpen(false);
      });
      return;
    }

    if (!csv.trim()) {
      toast.error("Cole o conteúdo da planilha (CSV) no campo abaixo");
      return;
    }

    startTransition(async () => {
      let result;
      switch (mode) {
        case "fii_movimentos":
          result = await importTradeCsv("fii", csv);
          break;
        case "fii_posicoes":
          result = await importPositionsSnapshotCsv("fii", csv);
          break;
        case "acao_movimentos":
          result = await importTradeCsv("acao", csv);
          break;
        case "acao_posicoes":
          result = await importPositionsSnapshotCsv("acao", csv);
          break;
        case "caixinha":
          result = await importCaixinhaCsv(csv);
          break;
        default:
          return;
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${result.imported} linha(s) importada(s)`);
        if (result.errors?.length) {
          toast.warning(`${result.errors.length} linha(s) com aviso — veja o console`);
          console.warn(result.errors);
        }
        setCsv("");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline" }))}>
        <Upload className="h-4 w-4" />
        Importar planilha
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar planilha</DialogTitle>
          <DialogDescription>
            Envie sua &quot;Planilha de investimentos.xlsx&quot; (abas BOLSA e FIIS) ou
            cole um CSV exportado manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de importação</Label>
            <NativeSelect
              value={mode}
              onChange={(e) => setMode(e.target.value as ImportMode)}
            >
              {(Object.keys(modeLabels) as ImportMode[]).map((key) => (
                <option key={key} value={key}>
                  {modeLabels[key]}
                </option>
              ))}
            </NativeSelect>
          </div>

          {mode === "planilha_xlsx" ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p>
                  Lê as abas <strong>BOLSA</strong> (ações + FIIs com cotas) e{" "}
                  <strong>FIIS</strong>. Colunas: Investimento, Cotas, Valor da cota,
                  DY anual, Valor investido.
                </p>
                <p>
                  Tickers com <strong>*</strong> são aceitos. KNCR11 nas duas abas é
                  somado automaticamente.
                </p>
                <p>Linhas com 0 cotas são ignoradas (lista de observação).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="xlsx-file">Arquivo Excel</Label>
                <input
                  ref={fileRef}
                  id="xlsx-file"
                  type="file"
                  accept=".xlsx,.xls"
                  className="block w-full text-sm file:mr-4 file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-2"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                {mode.includes("posicoes") && (
                  <p>Colunas: ticker, quantidade, preco_medio, preco_atual</p>
                )}
                {mode.includes("movimentos") && mode !== "caixinha" && (
                  <p>
                    Colunas: ticker, tipo (compra/venda/dividendo), quantidade, preco,
                    data
                  </p>
                )}
                {mode === "caixinha" && (
                  <p>Colunas: nome, tipo (aporte/resgate/rendimento), valor, data</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Conteúdo CSV</Label>
                <Textarea
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  placeholder="ticker;quantidade;preco_medio;preco_atual"
                  rows={10}
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}

          <Button type="button" className="w-full" disabled={pending} onClick={handleImport}>
            {pending ? "Importando…" : "Importar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
