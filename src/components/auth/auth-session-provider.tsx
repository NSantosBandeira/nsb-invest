"use client";

import { SessionProvider } from "next-auth/react";
import { SessionMonitor } from "@/components/auth/session-monitor";

type AuthSessionProviderProps = {
  children: React.ReactNode;
  idleTimeoutMs: number;
};

export function AuthSessionProvider({ children, idleTimeoutMs }: AuthSessionProviderProps) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus>
      {children}
      <SessionMonitor idleTimeoutMs={idleTimeoutMs} />
    </SessionProvider>
  );
}
