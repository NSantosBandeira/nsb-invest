"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInstitutionByName } from "@/actions/institutions";
import { PRESET_INSTITUTIONS } from "@/lib/institutions/presets";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InstitutionPresetsPanelProps = {
  existingNames: string[];
  className?: string;
};

export function InstitutionPresetsPanel({
  existingNames,
  className,
}: InstitutionPresetsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const existingLower = new Set(existingNames.map((n) => n.toLowerCase()));

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">
        Instituições populares (toque para adicionar)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_INSTITUTIONS.map((name) => {
          const has = existingLower.has(name.toLowerCase());
          return (
            <Button
              key={name}
              type="button"
              size="sm"
              variant={has ? "secondary" : "outline"}
              disabled={pending || has}
              className="h-7 text-xs"
              onClick={() => {
                startTransition(async () => {
                  const result = await createInstitutionByName(name);
                  if (result.error) alert(result.error);
                  else router.refresh();
                });
              }}
            >
              {name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
