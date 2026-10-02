import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/shared/badge";
import { Money } from "@/components/shared/money";
import type { RealMetrics } from "@/lib/calculations/real-cost";
import { formatCurrency, formatCurrencyPerKm, formatPercent } from "@/lib/format";

interface ProfitPerKmCardProps {
  metrics: RealMetrics;
  /** Lucro real/km do mês anterior, para comparação (null = sem dados) */
  previousProfitPerKm: number | null;
  previousMonthLabel: string;
}

/** Card principal do dashboard: quanto sobra, de verdade, por km rodado. */
export function ProfitPerKmCard({ metrics, previousProfitPerKm, previousMonthLabel }: ProfitPerKmCardProps) {
  const delta = previousProfitPerKm === null ? null : metrics.realProfitPerKm - previousProfitPerKm;

  return (
    <section
      aria-label="Lucro real por km do mês"
      className="bg-primary text-primary-foreground relative overflow-hidden rounded-3xl p-5 shadow-lg"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/5" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium opacity-80">Lucro real por KM</p>
        {delta !== null && (
          <Badge tone="inverse">
            {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {delta >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(delta))} vs {previousMonthLabel}
          </Badge>
        )}
      </div>

      <Money
        value={metrics.realProfitPerKm}
        size="xl"
        suffix="/km"
        className={metrics.realProfitPerKm < 0 ? "mt-3 text-red-300" : "mt-3"}
      />

      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-white/15 pt-4">
        <div className="min-w-0">
          <dt className="text-[11px] font-medium tracking-wide uppercase opacity-60">Receita/km</dt>
          <dd className="truncate text-sm font-semibold tabular-nums">{formatCurrencyPerKm(metrics.revenuePerKm)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] font-medium tracking-wide uppercase opacity-60">Custo real/km</dt>
          <dd className="truncate text-sm font-semibold tabular-nums">{formatCurrencyPerKm(metrics.realCostPerKm)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] font-medium tracking-wide uppercase opacity-60">Margem real</dt>
          <dd className="truncate text-sm font-semibold tabular-nums">{formatPercent(metrics.realMargin)}</dd>
        </div>
      </dl>
    </section>
  );
}
