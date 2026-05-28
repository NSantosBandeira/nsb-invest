export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 sm:p-6">
      <div className="mb-6 w-full max-w-md text-center sm:mb-8">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">NSB Invest</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle seus investimentos em um só lugar
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
