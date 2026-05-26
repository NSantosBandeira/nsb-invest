import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
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
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/caixinhas") ||
        pathname.startsWith("/fiis") ||
        pathname.startsWith("/acoes") ||
        pathname.startsWith("/configuracoes");

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (isProtected && !isLoggedIn) {
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
