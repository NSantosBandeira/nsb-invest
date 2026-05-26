import { db } from "@/lib/db";
import { PRESET_INSTITUTIONS } from "@/lib/institutions/presets";

export async function ensurePresetInstitutions(userId: string): Promise<void> {
  const existing = await db.institution.findMany({
    where: { userId },
    select: { name: true },
  });

  const existingLower = new Set(existing.map((i) => i.name.toLowerCase()));

  const toCreate = PRESET_INSTITUTIONS.filter(
    (name) => !existingLower.has(name.toLowerCase()),
  ).map((name) => ({ userId, name }));

  if (toCreate.length === 0) return;

  await db.institution.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
}
