"use client";

import { deleteCaixinhaMovement } from "@/actions/caixinhas";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteMovementButton({ movementId }: { movementId: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="text-muted-foreground hover:text-destructive"
      title="Excluir movimentação"
      onClick={async () => {
        if (!confirm("Excluir esta movimentação? O saldo será recalculado.")) return;
        const result = await deleteCaixinhaMovement(movementId);
        if (result.error) alert(result.error);
        else router.refresh();
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      <span className="sr-only">Excluir</span>
    </Button>
  );
}
