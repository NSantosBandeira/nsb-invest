import { redirect } from "next/navigation";
import { AuthSessionProvider } from "@/components/auth/auth-session-provider";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SESSION_IDLE_TIMEOUT_MS } from "@/lib/session-config";
import { getSessionUser } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AuthSessionProvider idleTimeoutMs={SESSION_IDLE_TIMEOUT_MS}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header userName={user.name} />
          <main className="page-main flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
