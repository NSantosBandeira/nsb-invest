"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensurePresetInstitutions } from "@/lib/institutions/seed";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export type AuthActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export async function registerUser(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "Este e-mail já está cadastrado" };
    }

    const hashed = await bcrypt.hash(parsed.data.password, 12);
    const user = await db.user.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        password: hashed,
      },
    });
    await ensurePresetInstitutions(user.id);
  } catch (error) {
    console.error("[registerUser] Erro ao criar usuário:", error);

    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";

    if (code === "ECONNREFUSED") {
      return {
        error:
          "Banco de dados indisponível. Execute: docker compose up -d postgres (ou use só Docker: docker compose up --build).",
      };
    }

    return {
      error:
        "Não foi possível criar a conta. Verifique se o PostgreSQL está rodando.",
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;

    console.error("[registerUser] Erro ao entrar após cadastro:", error);

    if (error instanceof AuthError) {
      return {
        message: "Conta criada com sucesso! Faça login com seu e-mail e senha.",
        success: true,
      };
    }

    return {
      message: "Conta criada com sucesso! Faça login com seu e-mail e senha.",
      success: true,
    };
  }

  return { success: true };
}

export async function loginUser(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;

    console.error("[loginUser] Erro:", error);

    if (error instanceof AuthError) {
      const code = error.type;
      if (code === "CredentialsSignin") {
        return { error: "E-mail ou senha incorretos" };
      }
      return { error: `Erro de autenticação (${code}). Tente novamente.` };
    }

    return { error: "Erro ao fazer login. Tente novamente." };
  }

  return { success: true };
}
