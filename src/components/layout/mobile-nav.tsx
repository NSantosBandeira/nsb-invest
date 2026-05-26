"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/caixinhas", label: "Caixinhas" },
  { href: "/fiis", label: "FIIs" },
  { href: "/acoes", label: "Ações" },
  { href: "/ganhos", label: "Ganhos" },
  { href: "/configuracoes", label: "Configurações" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "md:hidden")}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Menu</span>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>NSB Invest</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-2">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
