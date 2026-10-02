import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex w-full flex-col gap-8">
      <Logo className="justify-center" />
      <div className="grid gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
      {footer && <div className="text-muted-foreground text-center text-sm">{footer}</div>}
    </div>
  );
}
