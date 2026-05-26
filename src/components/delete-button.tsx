"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { ActionState } from "@/actions/institutions";

type DeleteButtonProps = {
  label?: string;
  entityId: string;
  action: (id: string) => Promise<ActionState>;
  redirectTo?: string;
};

export function DeleteButton({
  label = "Excluir",
  entityId,
  action,
  redirectTo,
}: DeleteButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={async () => {
        if (!confirm("Tem certeza que deseja excluir? Esta ação não pode ser desfeita.")) {
          return;
        }
        const result = await action(entityId);
        if (result.error) {
          alert(result.error);
          return;
        }
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
      {label}
    </Button>
  );
}
