import { signOut } from "@/lib/auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type HeaderProps = {
  userName: string;
};

export function Header({ userName }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <span className="text-sm text-muted-foreground md:hidden">NSB Invest</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Olá, {userName}
        </span>
        <ThemeToggle />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
