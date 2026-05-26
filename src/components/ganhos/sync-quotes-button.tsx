"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncMarketQuotes } from "@/actions/market";
import { Button } from "@/components/ui/button";

export function SyncQuotesButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await syncMarketQuotes();
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success(
              result.message ??
                `Cotações atualizadas${result.updated ? ` (${result.updated} ativos)` : ""}`,
            );
          }
        });
      }}
    >
      <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      Atualizar cotações e DY
    </Button>
  );
}
