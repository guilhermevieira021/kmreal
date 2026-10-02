"use client";

import { ChevronRight, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpgrade } from "./upgrade-provider";

/** Selo "PRO" ao lado de recursos pagos (menus, atalhos, botões). */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-warning/12 text-warning inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide",
        className,
      )}
    >
      <Lock className="size-2.5" aria-hidden />
      PRO
    </span>
  );
}

interface ProLockedCardProps {
  /** Nome do recurso (vai para a oferta: "X faz parte do plano PRO") */
  feature: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  /** Valor "fantasma" desfocado, para mostrar que há um número esperando (ex.: "R$ 1,69/km") */
  teaser?: string;
  className?: string;
}

/**
 * Funcionalidade PRO visível para o FREE: o motorista vê que existe e, ao tocar,
 * recebe a oferta. Nunca revela o valor real (o "teaser" é fixo, ilustrativo).
 */
export function ProLockedCard({ feature, title, description, icon: Icon = Lock, teaser, className }: ProLockedCardProps) {
  const { openUpgrade } = useUpgrade();
  return (
    <button
      type="button"
      onClick={() => openUpgrade(feature)}
      className={cn(
        "bg-card active:bg-accent flex w-full items-center gap-3 rounded-2xl border border-dashed p-4 text-left shadow-xs transition-colors",
        className,
      )}
    >
      <span className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          <ProBadge />
        </span>
        {teaser && (
          <span aria-hidden className="mt-0.5 block text-xl font-bold tabular-nums blur-[6px] select-none">
            {teaser}
          </span>
        )}
        <span className="text-muted-foreground block text-sm">{description}</span>
      </span>
      <ChevronRight className="text-muted-foreground size-5 shrink-0" />
    </button>
  );
}
