"use client";

import { useState } from "react";
import { OPERATIONAL_CATEGORIES, type CostBreakdown, type CostCategory } from "@/lib/calculations/cost-breakdown";
import { formatCurrency, formatCurrencyPerKm, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Ordem fixa da paleta: a cor segue a categoria, nunca a posição/ranking. */
const CATEGORY_COLOR: Record<CostCategory, string> = {
  fuel: "bg-chart-1",
  tolls: "bg-chart-2",
  helper: "bg-chart-3",
  other: "bg-chart-4",
  fixed: "bg-chart-5",
  maintenance: "bg-chart-6",
  wear: "bg-chart-7",
};

/** A lista separa o que aparece na viagem do que só o custo real enxerga. */
const GROUPS: { title: string; categories: CostCategory[] }[] = [
  { title: "Operacional (na viagem)", categories: OPERATIONAL_CATEGORIES },
  { title: "Veículo (fixos, manutenção, desgaste)", categories: ["fixed", "maintenance", "wear"] },
];

/**
 * Parte-do-todo dos custos: barra empilhada + lista com valor, % e R$/km.
 * A lista é a "tabela" do gráfico: todo valor fica legível sem depender da cor.
 */
export function CostBreakdownChart({ breakdown }: { breakdown: CostBreakdown }) {
  const [active, setActive] = useState<CostCategory | null>(null);
  const visible = breakdown.items.filter((i) => i.value > 0);

  return (
    <div className="bg-card rounded-2xl border p-4 shadow-xs">
      <div className="flex h-3 w-full gap-0.5" role="img" aria-label="Composição dos custos">
        {visible.map((item, index) => (
          <div
            key={item.category}
            title={`${item.label}: ${formatCurrency(item.value)} (${formatPercent(item.share)})`}
            onPointerEnter={() => setActive(item.category)}
            onPointerLeave={() => setActive(null)}
            className={cn(
              "h-full transition-opacity",
              CATEGORY_COLOR[item.category],
              index === 0 && "rounded-l-[4px]",
              index === visible.length - 1 && "rounded-r-[4px]",
              active && active !== item.category && "opacity-30",
            )}
            style={{ width: `${item.share}%` }}
          />
        ))}
      </div>

      {GROUPS.map((group) => {
        const items = breakdown.items.filter((i) => group.categories.includes(i.category));
        const subtotal = items.reduce((sum, i) => sum + i.value, 0);
        return (
          <div key={group.title} className="mt-4">
            <p className="text-muted-foreground flex justify-between text-[11px] font-semibold tracking-wide uppercase">
              <span>{group.title}</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </p>
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.category}>
                  <button
                    type="button"
                    onClick={() => setActive((prev) => (prev === item.category ? null : item.category))}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 py-2 text-left transition-opacity",
                      active && active !== item.category && "opacity-50",
                    )}
                  >
                    <span aria-hidden className={cn("size-3 shrink-0 rounded-[3px]", CATEGORY_COLOR[item.category])} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="text-muted-foreground block text-xs tabular-nums">
                        {formatCurrencyPerKm(item.perKm)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums">{formatCurrency(item.value)}</span>
                      <span className="text-muted-foreground block text-xs tabular-nums">{formatPercent(item.share)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
