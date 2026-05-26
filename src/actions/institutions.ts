"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensurePresetInstitutions } from "@/lib/institutions/seed";
import { requireUserId } from "@/lib/session";

const institutionSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
});

export type ActionState = { error?: string; success?: boolean; message?: string };

export async function createInstitution(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = institutionSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await db.institution.create({
      data: { userId, name: parsed.data.name.trim() },
    });
    revalidatePath("/caixinhas");
    revalidatePath("/fiis");
    revalidatePath("/acoes");
    return { success: true };
  } catch {
    return { error: "Instituição já existe ou dados inválidos" };
  }
}

export async function deleteInstitution(id: string): Promise<ActionState> {
  const userId = await requireUserId();
  const inst = await db.institution.findFirst({ where: { id, userId } });
  if (!inst) return { error: "Instituição não encontrada" };

  await db.institution.delete({ where: { id } });
  revalidatePath("/caixinhas");
  return { success: true };
}

export async function createInstitutionByName(name: string): Promise<ActionState> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Nome inválido" };

  try {
    await db.institution.create({
      data: { userId, name: trimmed },
    });
    revalidatePath("/caixinhas");
    revalidatePath("/fiis");
    revalidatePath("/acoes");
    revalidatePath("/configuracoes");
    return { success: true };
  } catch {
    return { error: "Instituição já cadastrada" };
  }
}

export async function getInstitutions() {
  const userId = await requireUserId();
  await ensurePresetInstitutions(userId);
  return db.institution.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}
