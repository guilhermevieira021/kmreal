import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { valueToneClass, type ValueTone } from "./value-tone";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: ValueTone;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, tone = "default", className }: StatCardProps) {
  return (
    <div className={cn("bg-card min-w-0 rounded-2xl border p-4 shadow-xs", className)}>
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <div className={cn("mt-1.5 truncate text-xl font-bold tabular-nums", valueToneClass(tone))}>{value}</div>
    </div>
  );
}
