"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncSingleTickerQuote } from "@/actions/market";
import { Button } from "@/components/ui/button";

type SyncTickerQuoteButtonProps = {
  ticker: string;
  assetType: "fii" | "acao";
  variant?: "outline" | "secondary" | "default";
  size?: "default" | "sm";
};

export function SyncTickerQuoteButton({
  ticker,
  assetType,
  variant = "outline",
  size = "sm",
}: SyncTickerQuoteButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await syncSingleTickerQuote(ticker, assetType);
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success(
              result.message ?? `${ticker}: preço e DY atualizados`,
            );
          }
        });
      }}
    >
      <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      Buscar cotação e DY
    </Button>
  );
}
