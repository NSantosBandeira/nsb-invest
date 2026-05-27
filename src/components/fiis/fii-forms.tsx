"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createFiiPosition,
  addFiiMovement,
  updateFiiMovement,
  updateFiiPriceFromForm,
  updateFiiDividendYieldFromForm,
  deleteFiiMovement,
} from "@/actions/fiis";
import type { ActionState } from "@/actions/institutions";
type FiiMovementType = "COMPRA" | "VENDA" | "DIVIDENDO";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { InstitutionSelect } from "@/components/institutions/institution-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toNumber } from "@/lib/number";

function useRefreshOnSuccess(state: ActionState, onSuccess?: () => void) {
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess?.();
    }
  }, [state.success, router, onSuccess]);
}

function toDateInputValue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Institution = { id: string; name: string };

const initial: ActionState = {};

export function NewFiiDialog({ institutions }: { institutions: Institution[] }) {
  const [state, action, pending] = useActionState(createFiiPosition, initial);

  return (
    <Dialog>
      <DialogTrigger className={cn(buttonVariants())}>
        <Plus className="h-4 w-4" />
        Novo FII
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo FII</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker</Label>
            <Input id="ticker" name="ticker" placeholder="HGLG11" required />
          </div>
          <InstitutionSelect institutions={institutions} id="fii-inst" />
          <div className="space-y-2">
            <Label htmlFor="currentPrice">Preço atual (R$)</Label>
            <CurrencyInput id="currentPrice" name="currentPrice" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Cadastrar FII"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FiiMovementForm({ positionId }: { positionId: string }) {
  const [state, action, pending] = useActionState(addFiiMovement, initial);
  const today = new Date().toISOString().split("T")[0];

  return (
    <form action={action} className="space-y-4 rounded-lg border p-4">
      <h3 className="font-medium">Registrar movimentação</h3>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-600">Movimentação registrada!</p>
      )}
      <input type="hidden" name="positionId" value={positionId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <NativeSelect name="type" defaultValue="COMPRA" required>
            <option value="COMPRA">Compra</option>
            <option value="VENDA">Venda</option>
            <option value="DIVIDENDO">Dividendo</option>
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantidade</Label>
          <Input id="quantity" name="quantity" placeholder="10" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Preço unitário (R$)</Label>
          <CurrencyInput id="unitPrice" name="unitPrice" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date" defaultValue={today} required />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Registrar"}
      </Button>
    </form>
  );
}

export function UpdateFiiPriceForm({
  positionId,
  currentPrice,
}: {
  positionId: string;
  currentPrice: string;
}) {
  const [state, action, pending] = useActionState(updateFiiPriceFromForm, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="positionId" value={positionId} />
      <div className="space-y-2">
        <Label htmlFor="update-price">Preço atual (R$)</Label>
        <CurrencyInput
          id="update-price"
          name="currentPrice"
          defaultValue={currentPrice}
          className="w-40"
          required
        />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Atualizar
      </Button>
      {state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function UpdateFiiDividendYieldForm({
  positionId,
  dividendYield,
}: {
  positionId: string;
  dividendYield: number | null;
}) {
  const [state, action, pending] = useActionState(updateFiiDividendYieldFromForm, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2 border-t pt-4">
      <input type="hidden" name="positionId" value={positionId} />
      <div className="min-w-[200px] flex-1 space-y-2">
        <Label htmlFor="dividendYield">Dividend yield manual (%)</Label>
        <Input
          id="dividendYield"
          name="dividendYield"
          placeholder="11,91"
          defaultValue={dividendYield != null ? String(dividendYield) : ""}
          inputMode="decimal"
        />
        <p className="text-xs text-muted-foreground">
          Deixe vazio para remover. Ex: 11,91 ou 0,1191. Sobrescreve até buscar na Brapi.
        </p>
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Salvando..." : "Salvar DY"}
      </Button>
      {state.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state.success && (
        <p className="w-full text-sm text-green-600">Dividend yield atualizado!</p>
      )}
    </form>
  );
}

export type FiiMovementRow = {
  id: string;
  type: FiiMovementType;
  quantity: unknown;
  unitPrice: unknown;
  date: Date;
  notes: string | null;
};

export function EditFiiMovementDialog({
  movement,
  positionId,
}: {
  movement: FiiMovementRow;
  positionId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateFiiMovement, initial);

  useRefreshOnSuccess(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "text-muted-foreground",
        )}
        title="Editar movimentação"
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="sr-only">Editar</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar movimentação</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <input type="hidden" name="movementId" value={movement.id} />
          <input type="hidden" name="positionId" value={positionId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <NativeSelect name="type" defaultValue={movement.type} required>
                <option value="COMPRA">Compra</option>
                <option value="VENDA">Venda</option>
                <option value="DIVIDENDO">Dividendo</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`qty-${movement.id}`}>Quantidade</Label>
              <Input
                id={`qty-${movement.id}`}
                name="quantity"
                defaultValue={String(toNumber(movement.quantity))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`price-${movement.id}`}>Preço unitário (R$)</Label>
              <CurrencyInput
                id={`price-${movement.id}`}
                name="unitPrice"
                defaultValue={toNumber(movement.unitPrice)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`date-${movement.id}`}>Data</Label>
              <Input
                id={`date-${movement.id}`}
                name="date"
                type="date"
                defaultValue={toDateInputValue(movement.date)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`notes-${movement.id}`}>Observações</Label>
            <Textarea
              id={`notes-${movement.id}`}
              name="notes"
              rows={2}
              defaultValue={movement.notes ?? ""}
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

export function DeleteFiiMovementButton({ movementId }: { movementId: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="text-muted-foreground hover:text-destructive"
      title="Excluir movimentação"
      onClick={async () => {
        if (
          !confirm(
            "Excluir esta movimentação? A posição (quantidade e preço médio) será recalculada.",
          )
        ) {
          return;
        }
        const result = await deleteFiiMovement(movementId);
        if (result.error) alert(result.error);
        else router.refresh();
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      <span className="sr-only">Excluir</span>
    </Button>
  );
}
