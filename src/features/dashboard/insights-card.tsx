import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Insight } from "@/lib/calculations/insights";
import { cn } from "@/lib/utils";

const ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus };

const TONES = {
  positive: "bg-positive/12 text-positive",
  negative: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

/** "Resumo rápido": frases geradas por regras, com ícone indicando a direção. */
export function InsightsCard({ insights }: { insights: Insight[] }) {
  return (
    <ul className="bg-card divide-y overflow-hidden rounded-2xl border shadow-xs">
      {insights.map((insight) => {
        const Icon = ICONS[insight.direction];
        return (
          <li key={insight.id} className="flex items-center gap-3 px-4 py-3">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONES[insight.tone])}>
              <Icon className="size-4" aria-hidden />
            </span>
            <p className="text-sm leading-snug">{insight.text}</p>
          </li>
        );
      })}
    </ul>
  );
}
