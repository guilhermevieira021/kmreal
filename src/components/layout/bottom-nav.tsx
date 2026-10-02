"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CarFront, History, LayoutDashboard, Plus, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Prefixos de rota que também ativam o item */
  match: string[];
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard, match: ["/dashboard", "/simulador", "/saude"] },
  { href: "/historico", label: "Histórico", icon: History, match: ["/historico", "/viagens/"] },
  { href: "/viagens/nova", label: "Nova viagem", icon: Plus, match: ["/viagens/nova"], primary: true },
  { href: "/veiculos", label: "Veículos", icon: CarFront, match: ["/veiculos"] },
  { href: "/perfil", label: "Perfil", icon: UserRound, match: ["/perfil"] },
];

function isActive(pathname: string, item: NavItem) {
  if (pathname === "/viagens/nova") return item.href === "/viagens/nova";
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="bg-card/95 supports-[backdrop-filter]:bg-card/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.primary ? (
                  <span
                    className={cn(
                      "bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-full shadow-sm transition-transform active:scale-95",
                      active && "ring-primary/20 ring-4",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.5} />
                  </span>
                ) : (
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                )}
                <span className={cn(item.primary && "sr-only")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
