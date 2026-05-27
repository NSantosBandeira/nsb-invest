"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  createStockPosition,
  addStockMovement,
  updateStockPriceFromForm,
  deleteStockMovement,
} from "@/actions/acoes";
import type { ActionState } from "@/actions/institutions";
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
import { Plus, Trash2 } from "lucide-react";

type Institution = { id: string; name: string };

const initial: ActionState = {};

export function NewStockDialog({ institutions }: { institutions: Institution[] }) {
  const [state, action, pending] = useActionState(createStockPosition, initial);

  return (
    <Dialog>
      <DialogTrigger className={cn(buttonVariants())}>
        <Plus className="h-4 w-4" />
        Nova ação
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova ação</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker</Label>
            <Input id="ticker" name="ticker" placeholder="PETR4" required />
          </div>
          <InstitutionSelect institutions={institutions} id="stock-inst" />
          <div className="space-y-2">
            <Label htmlFor="currentPrice">Preço atual (R$)</Label>
            <CurrencyInput id="currentPrice" name="currentPrice" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Cadastrar ação"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StockMovementForm({ positionId }: { positionId: string }) {
  const [state, action, pending] = useActionState(addStockMovement, initial);
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
          <Input id="quantity" name="quantity" placeholder="100" required />
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

export function UpdateStockPriceForm({
  positionId,
  currentPrice,
}: {
  positionId: string;
  currentPrice: string;
}) {
  const [state, action, pending] = useActionState(updateStockPriceFromForm, initial);

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

export function DeleteStockMovementButton({ movementId }: { movementId: string }) {
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
        const result = await deleteStockMovement(movementId);
        if (result.error) alert(result.error);
        else router.refresh();
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      <span className="sr-only">Excluir</span>
    </Button>
  );
}
