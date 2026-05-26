export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">NSB Invest</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controle seus investimentos em um só lugar
        </p>
      </div>
      {children}
    </div>
  );
}
