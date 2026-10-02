import Link from "next/link";
import { ChevronRight, CircleAlert, Info, OctagonAlert, PartyPopper, type LucideIcon } from "lucide-react";
import type { AlertSeverity, OperationalAlert } from "@/lib/calculations/alerts";
import { cn } from "@/lib/utils";

/** Cores de status reservadas: sempre acompanhadas de ícone e rótulo, nunca só cor. */
const SEVERITY: Record<AlertSeverity, { icon: LucideIcon; label: string; className: string }> = {
  critical: { icon: OctagonAlert, label: "Crítico", className: "bg-destructive/10 text-destructive" },
  warning: { icon: CircleAlert, label: "Atenção", className: "bg-amber-500/15 text-amber-700" },
  info: { icon: Info, label: "Aviso", className: "bg-sky-500/12 text-sky-700" },
  positive: { icon: PartyPopper, label: "Boa notícia", className: "bg-positive/12 text-positive" },
};

function AlertItem({ alert }: { alert: OperationalAlert }) {
  const { icon: Icon, label, className } = SEVERITY[alert.severity];
  const content = (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", className)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="sr-only">{label}: </span>
        <span className="block text-sm leading-snug font-semibold">{alert.title}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">{alert.description}</span>
      </span>
      {alert.href && <ChevronRight className="text-muted-foreground size-5 shrink-0 self-center" />}
    </>
  );
  const itemClass = "flex gap-3 p-4";

  return (
    <li>
      {alert.href ? (
        <Link href={alert.href} className={cn(itemClass, "active:bg-accent transition-colors")}>
          {content}
        </Link>
      ) : (
        <div className={itemClass}>{content}</div>
      )}
    </li>
  );
}

export function AlertList({ alerts, limit }: { alerts: OperationalAlert[]; limit?: number }) {
  const visible = limit ? alerts.slice(0, limit) : alerts;
  return (
    <ul className="bg-card divide-y overflow-hidden rounded-2xl border shadow-xs">
      {visible.map((alert) => (
        <AlertItem key={alert.id} alert={alert} />
      ))}
    </ul>
  );
}
