import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  /** Âncora para links (ex.: /saude#alertas) */
  id?: string;
  /** Link "ver mais" no canto */
  action?: { href: string; label: string };
  className?: string;
  children: ReactNode;
}

/** Bloco de conteúdo com título discreto, padrão em todas as telas. */
export function Section({ title, id, action, className, children }: SectionProps) {
  return (
    <section id={id} className={cn("grid gap-2", className)}>
      <div className="flex min-h-6 items-center justify-between px-1">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{title}</h2>
        {action && (
          <Link href={action.href} className="text-muted-foreground -my-2 flex items-center py-2 text-sm font-medium">
            {action.label} <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
