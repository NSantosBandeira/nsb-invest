import type { NextAuthConfig } from "next-auth";
import {
  SESSION_IDLE_TIMEOUT_SECONDS,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session-config";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/caixinhas",
  "/fiis",
  "/acoes",
  "/ganhos",
  "/configuracoes",
] as const;

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/register");
      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix),
      );

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (isProtected && !isLoggedIn) {
        return false;
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      const now = Math.floor(Date.now() / 1000);

      if (user) {
        token.id = user.id;
        token.iat = now;
        token.lastActivity = now;
        return token;
      }

      if (trigger === "update") {
        token.lastActivity = now;
        return token;
      }

      const lastActivity =
        typeof token.lastActivity === "number" ? token.lastActivity : token.iat;

      if (
        typeof lastActivity === "number" &&
        now - lastActivity > SESSION_IDLE_TIMEOUT_SECONDS
      ) {
        return null;
      }

      if (
        typeof token.iat === "number" &&
        now - token.iat > SESSION_MAX_AGE_SECONDS
      ) {
        return null;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token) return session;

      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
