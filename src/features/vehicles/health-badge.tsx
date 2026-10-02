import type { HealthStatus } from "@/lib/calculations/vehicle-health";
import { cn } from "@/lib/utils";

/** Situação sempre com emoji + texto: nunca só a cor. */
export const HEALTH_STATUS: Record<HealthStatus, { emoji: string; label: string; className: string }> = {
  ok: { emoji: "🟢", label: "Em dia", className: "bg-positive/12 text-positive" },
  soon: { emoji: "🟡", label: "Próximo", className: "bg-amber-500/15 text-amber-800" },
  overdue: { emoji: "🔴", label: "Atrasado", className: "bg-destructive/10 text-destructive" },
  unknown: { emoji: "⚪", label: "Sem registro", className: "bg-muted text-muted-foreground" },
};

export function HealthBadge({ status, className }: { status: HealthStatus; className?: string }) {
  const s = HEALTH_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        s.className,
        className,
      )}
    >
      <span aria-hidden className="text-[10px]">
        {s.emoji}
      </span>
      {s.label}
    </span>
  );
}
