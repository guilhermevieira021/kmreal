import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, backHref, action }: PageHeaderProps) {
  return (
    <header className="flex items-center gap-2 pt-2 pb-4">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Voltar"
          className="hover:bg-accent -ml-2 flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <ChevronLeft className="size-6" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground truncate text-sm">{description}</p>}
      </div>
      {action}
    </header>
  );
}
