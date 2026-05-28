import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-[420px] w-full max-w-md animate-pulse rounded-xl bg-muted" />}>
      <LoginForm />
    </Suspense>
  );
}
