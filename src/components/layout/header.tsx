import { signOut } from "@/lib/auth";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

type HeaderProps = {
  userName: string;
};

export function Header({ userName }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card px-3 sm:h-16 sm:px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <MobileNav />
        <span className="truncate text-sm font-medium md:hidden">NSB Invest</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span className="hidden max-w-[140px] truncate text-sm text-muted-foreground md:inline lg:max-w-none">
          Olá, {userName}
        </span>
        <ThemeToggle />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="outline" size="sm" className="px-2.5 sm:px-3">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
