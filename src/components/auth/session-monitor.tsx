"use client";

import { useCallback, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;
const CHECK_INTERVAL_MS = 30_000;
const SESSION_UPDATE_DEBOUNCE_MS = 60_000;

type SessionMonitorProps = {
  idleTimeoutMs: number;
};

export function SessionMonitor({ idleTimeoutMs }: SessionMonitorProps) {
  const { status, update } = useSession();
  const lastActivityRef = useRef(0);
  const lastSessionUpdateRef = useRef(0);

  const expireSession = useCallback(async (message: string) => {
    toast.info(message);
    await signOut({ redirectTo: "/login?reason=session-expired" });
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    lastActivityRef.current = performance.now();

    const onActivity = () => {
      const now = performance.now();
      lastActivityRef.current = now;

      if (now - lastSessionUpdateRef.current < SESSION_UPDATE_DEBOUNCE_MS) return;

      lastSessionUpdateRef.current = now;
      void update();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const intervalId = window.setInterval(() => {
      const idleMs = performance.now() - lastActivityRef.current;
      if (idleMs >= idleTimeoutMs) {
        void expireSession("Sessão encerrada por inatividade.");
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      window.clearInterval(intervalId);
    };
  }, [status, idleTimeoutMs, update, expireSession]);

  useEffect(() => {
    if (status === "unauthenticated") {
      lastSessionUpdateRef.current = 0;
    }
  }, [status]);

  return null;
}
