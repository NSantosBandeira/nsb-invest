import { auth } from "@/lib/auth";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Não autorizado");
  }
  return userId;
}

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "Usuário",
    email: session.user.email ?? "",
  };
}
