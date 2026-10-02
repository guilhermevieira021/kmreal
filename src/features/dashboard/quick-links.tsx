"use client";

import Link from "next/link";
import { Calculator, HeartPulse, Medal, type LucideIcon } from "lucide-react";
import { ProBadge } from "@/features/subscription/pro-lock";
import { useData } from "@/providers/data-provider";

const LINKS: { href: string; label: string; icon: LucideIcon; pro?: boolean }[] = [
  { href: "/saude", label: "Saúde financeira", icon: HeartPulse, pro: true },
  { href: "/simulador", label: "Simular frete", icon: Calculator },
  { href: "/veiculos/ranking", label: "Ranking", icon: Medal, pro: true },
];

/** Atalhos para as ferramentas que não estão no menu inferior. */
export function QuickLinks() {
  const { isPro } = useData();
  return (
    <nav aria-label="Ferramentas" className="grid grid-cols-3 gap-2">
      {LINKS.map(({ href, label, icon: Icon, pro }) => (
        <Link
          key={href}
          href={href}
          className="bg-card active:bg-accent flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-semibold shadow-xs transition-colors"
        >
          <Icon className="size-6" />
          {label}
          {pro && !isPro && <ProBadge />}
        </Link>
      ))}
    </nav>
  );
}
