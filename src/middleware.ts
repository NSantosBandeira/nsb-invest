import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/caixinhas/:path*",
    "/fiis/:path*",
    "/acoes/:path*",
    "/ganhos/:path*",
    "/configuracoes/:path*",
    "/login",
    "/register",
  ],
};
