import { cn } from "@/lib/utils";
import { valueToneClass, type ValueTone } from "./value-tone";

export interface MetricItem {
  label: string;
  value: string;
  tone?: ValueTone;
}

const COLS = { 2: "grid-cols-2", 3: "grid-cols-3" } as const;

/** Grade de indicadores compactos (rótulo + valor), com divisórias entre colunas e linhas. */
export function MetricGrid({ items, cols = 3, className }: { items: MetricItem[]; cols?: 2 | 3; className?: string }) {
  return (
    <dl className={cn("grid", COLS[cols], className)}>
      {items.map((item, index) => {
        const column = index % cols;
        return (
          <div
            key={item.label}
            className={cn(
              "min-w-0 px-3 py-3",
              column === 0 && "pl-4",
              column === cols - 1 && "pr-4",
              column < cols - 1 && "border-r",
              index >= cols && "border-t",
            )}
          >
            <dt className="text-muted-foreground truncate text-[11px] font-medium tracking-wide uppercase">{item.label}</dt>
            <dd className={cn("mt-0.5 truncate text-sm font-semibold tabular-nums", valueToneClass(item.tone ?? "default"))}>
              {item.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
