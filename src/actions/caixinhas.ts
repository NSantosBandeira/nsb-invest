"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { toDecimal, toNumber } from "@/lib/decimal";
import { parseCalendarDateInput } from "@/lib/dates";
import { getCdiAnnualRatePercent, getCdiDailyRatePercent } from "@/lib/market/cdi";
import { calculateCaixinhaBalance } from "@/lib/portfolio/caixinha";
import { calculateCaixinhaGains } from "@/lib/portfolio/gains";
import type { ActionState } from "@/actions/institutions";
import { parseMoneyInput } from "@/lib/money";

const caixinhaSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  institutionId: z.string().optional(),
  cdiPercent: z.string().optional(),
  initialBalance: z.string().optional(),
  notes: z.string().optional(),
});

const movementSchema = z.object({
  caixinhaId: z.string(),
  type: z.enum(["APORTE", "RESGATE", "RENDIMENTO", "AJUSTE"]),
  amount: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().optional(),
});

function parseOptionalAmount(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  return parseMoneyInput(value, true);
}

export async function createCaixinha(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = caixinhaSchema.safeParse({
    name: formData.get("name"),
    institutionId: formData.get("institutionId") || undefined,
    cdiPercent: formData.get("cdiPercent") || undefined,
    initialBalance: formData.get("initialBalance") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const institutionId =
    parsed.data.institutionId && parsed.data.institutionId !== "none"
      ? parsed.data.institutionId
      : null;

  if (institutionId) {
    const inst = await db.institution.findFirst({ where: { id: institutionId, userId } });
    if (!inst) return { error: "Instituição inválida" };
  }

  let initialBalance: number | null = null;
  try {
    initialBalance = parseOptionalAmount(parsed.data.initialBalance);
  } catch {
    return { error: "Saldo inicial inválido" };
  }

  const caixinha = await db.caixinha.create({
    data: {
      userId,
      name: parsed.data.name.trim(),
      institutionId,
      cdiPercent: parsed.data.cdiPercent
        ? toDecimal(parsed.data.cdiPercent.replace(",", "."))
        : null,
      notes: parsed.data.notes || null,
    },
  });

  if (initialBalance != null && initialBalance > 0) {
    await db.caixinhaMovement.create({
      data: {
        caixinhaId: caixinha.id,
        userId,
        type: "APORTE",
        amount: toDecimal(initialBalance),
        date: new Date(),
        notes: "Saldo inicial",
      },
    });
  }

  revalidatePath("/caixinhas");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateCaixinha(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const parsed = caixinhaSchema.safeParse({
    name: formData.get("name"),
    institutionId: formData.get("institutionId") || undefined,
    cdiPercent: formData.get("cdiPercent") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const caixinha = await db.caixinha.findFirst({ where: { id, userId } });
  if (!caixinha) return { error: "Caixinha não encontrada" };

  const institutionId =
    parsed.data.institutionId && parsed.data.institutionId !== "none"
      ? parsed.data.institutionId
      : null;

  await db.caixinha.update({
    where: { id },
    data: {
      name: parsed.data.name.trim(),
      institutionId,
      cdiPercent: parsed.data.cdiPercent
        ? toDecimal(parsed.data.cdiPercent.replace(",", "."))
        : null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/caixinhas/${id}`);
  revalidatePath("/caixinhas");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCaixinhaMovement(movementId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const movement = await db.caixinhaMovement.findFirst({
    where: { id: movementId, userId },
  });
  if (!movement) return { error: "Movimentação não encontrada" };

  await db.caixinhaMovement.delete({ where: { id: movementId } });
  revalidatePath(`/caixinhas/${movement.caixinhaId}`);
  revalidatePath("/caixinhas");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCaixinha(id: string): Promise<ActionState> {
  const userId = await requireUserId();
  const caixinha = await db.caixinha.findFirst({ where: { id, userId } });
  if (!caixinha) return { error: "Caixinha não encontrada" };

  await db.caixinha.delete({ where: { id } });
  revalidatePath("/caixinhas");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addCaixinhaMovement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = movementSchema.safeParse({
    caixinhaId: formData.get("caixinhaId"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const caixinha = await db.caixinha.findFirst({
    where: { id: parsed.data.caixinhaId, userId },
  });
  if (!caixinha) return { error: "Caixinha não encontrada" };

  let amount: number;
  try {
    amount = parseMoneyInput(parsed.data.amount);
  } catch {
    return { error: "Valor inválido" };
  }

  await db.caixinhaMovement.create({
    data: {
      caixinhaId: parsed.data.caixinhaId,
      userId,
      type: parsed.data.type,
      amount: toDecimal(amount),
      date: parseCalendarDateInput(parsed.data.date),
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath(`/caixinhas/${parsed.data.caixinhaId}`);
  revalidatePath("/caixinhas");
  revalidatePath("/ganhos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getCaixinhas() {
  const userId = await requireUserId();
  const [caixinhas, cdiAnnualRate, cdiDailyRate] = await Promise.all([
    db.caixinha.findMany({
      where: { userId },
      include: { institution: true, movements: true },
      orderBy: { name: "asc" },
    }),
    getCdiAnnualRatePercent(),
    getCdiDailyRatePercent(),
  ]);

  return caixinhas.map((c) => {
    const balance = calculateCaixinhaBalance(c.movements);
    return {
      ...c,
      balance,
      gains: calculateCaixinhaGains(c.movements, balance, {
        cdiPercent: c.cdiPercent ? toNumber(c.cdiPercent) : null,
        cdiAnnualRate,
        cdiDailyRate,
      }),
    };
  });
}

export async function getCaixinha(id: string) {
  const userId = await requireUserId();
  const [caixinha, cdiAnnualRate, cdiDailyRate] = await Promise.all([
    db.caixinha.findFirst({
      where: { id, userId },
      include: {
        institution: true,
        movements: { orderBy: { date: "desc" } },
      },
    }),
    getCdiAnnualRatePercent(),
    getCdiDailyRatePercent(),
  ]);
  if (!caixinha) return null;

  const balance = calculateCaixinhaBalance(caixinha.movements);
  return {
    ...caixinha,
    balance,
    gains: calculateCaixinhaGains(caixinha.movements, balance, {
      cdiPercent: caixinha.cdiPercent ? toNumber(caixinha.cdiPercent) : null,
      cdiAnnualRate,
      cdiDailyRate,
    }),
  };
}
