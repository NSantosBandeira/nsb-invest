"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createCaixinha,
  addCaixinhaMovement,
  updateCaixinha,
} from "@/actions/caixinhas";
import { createInstitution } from "@/actions/institutions";
import type { ActionState } from "@/actions/institutions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { InstitutionSelect } from "@/components/institutions/institution-select";
import { InstitutionPresetsPanel } from "@/components/institutions/institution-presets-panel";
import { PRESET_INSTITUTIONS } from "@/lib/institutions/presets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";

type Institution = { id: string; name: string };

const initial: ActionState = {};

function useRefreshOnSuccess(state: ActionState) {
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);
}

export function NewCaixinhaDialog({ institutions }: { institutions: Institution[] }) {
  const [state, action, pending] = useActionState(createCaixinha, initial);
  useRefreshOnSuccess(state);

  return (
    <Dialog>
      <DialogTrigger className={cn(buttonVariants())}>
        <Plus className="h-4 w-4" />
        Nova caixinha
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova caixinha</DialogTitle>
          <DialogDescription>
            Informe o saldo atual se já tiver dinheiro na caixinha. Depois use movimentações
            para aportes, resgates e rendimentos.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && (
            <p className="text-sm text-green-600">Caixinha criada com sucesso!</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="Reserva de emergência" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialBalance">Saldo atual (R$)</Label>
            <CurrencyInput id="initialBalance" name="initialBalance" />
            <p className="text-xs text-muted-foreground">
              Opcional. Será registrado como aporte inicial.
            </p>
          </div>
          <InstitutionSelect institutions={institutions} id="caixinha-inst" />
          <div className="space-y-2">
            <Label htmlFor="cdiPercent">% do CDI (opcional)</Label>
            <Input id="cdiPercent" name="cdiPercent" placeholder="120" />
            <p className="text-xs text-muted-foreground">
              Usado para estimar ganho hoje/mês (ex.: Nubank+ = 120).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Criar caixinha"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type EditCaixinhaProps = {
  caixinha: {
    id: string;
    name: string;
    institutionId: string | null;
    cdiPercent: number | null;
    notes: string | null;
  };
  institutions: Institution[];
};

export function EditCaixinhaDialog({ caixinha, institutions }: EditCaixinhaProps) {
  const [state, action, pending] = useActionState(updateCaixinha, initial);
  useRefreshOnSuccess(state);

  return (
    <Dialog>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        <Pencil className="h-4 w-4" />
        Editar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar caixinha</DialogTitle>
          <DialogDescription>
            Altere nome, instituição ou % do CDI. Para mudar o saldo, use movimentações ou
            ajuste de saldo.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={caixinha.id} />
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && <p className="text-sm text-green-600">Salvo!</p>}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={caixinha.name}
              required
            />
          </div>
          <InstitutionSelect
            institutions={institutions}
            defaultValue={caixinha.institutionId ?? "none"}
            id="edit-caixinha-inst"
          />
          <div className="space-y-2">
            <Label htmlFor="edit-cdi">% do CDI</Label>
            <Input
              id="edit-cdi"
              name="cdiPercent"
              defaultValue={caixinha.cdiPercent != null ? String(caixinha.cdiPercent) : ""}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea
              id="edit-notes"
              name="notes"
              rows={2}
              defaultValue={caixinha.notes ?? ""}
            />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewInstitutionDialog({
  institutionNames = [],
}: {
  institutionNames?: string[];
}) {
  const [state, action, pending] = useActionState(createInstitution, initial);
  useRefreshOnSuccess(state);

  return (
    <Dialog>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        <Plus className="h-4 w-4" />
        Instituição
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Instituições</DialogTitle>
          <DialogDescription>
            As mais usadas já ficam disponíveis nos cadastros. Adicione outra abaixo se
            precisar.
          </DialogDescription>
        </DialogHeader>
        <InstitutionPresetsPanel existingNames={institutionNames} />
        <form action={action} className="space-y-4 border-t pt-4">
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && (
            <p className="text-sm text-green-600">Instituição adicionada!</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="inst-name">Outra instituição</Label>
            <Input
              id="inst-name"
              name="name"
              placeholder="Nome personalizado"
              list="institution-suggestions"
              required
            />
            <datalist id="institution-suggestions">
              {PRESET_INSTITUTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CaixinhaMovementForm({ caixinhaId }: { caixinhaId: string }) {
  const [state, action, pending] = useActionState(addCaixinhaMovement, initial);
  const today = new Date().toISOString().split("T")[0];
  useRefreshOnSuccess(state);

  return (
    <form action={action} className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">Registrar movimentação</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Ganho hoje</strong> só sobe com{" "}
          <strong className="font-medium text-foreground">Rendimento</strong> (ou ajuste de
          saldo). Aporte aumenta o saldo, mas não entra no ganho do dia.
        </p>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-600">
          Movimentação registrada! O saldo foi atualizado.
        </p>
      )}
      <input type="hidden" name="caixinhaId" value={caixinhaId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <NativeSelect name="type" defaultValue="APORTE" required>
            <option value="APORTE">Aporte</option>
            <option value="RESGATE">Resgate</option>
            <option value="RENDIMENTO">Rendimento</option>
            <option value="AJUSTE">Ajuste de saldo</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Valor (R$)</Label>
          <CurrencyInput id="amount" name="amount" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mov-notes">Observações</Label>
          <Textarea id="mov-notes" name="notes" rows={2} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Registrar"}
      </Button>
    </form>
  );
}
