import { Badge } from "@/components/shared/badge";
import { MetricGrid } from "@/components/shared/metric-grid";
import { Money } from "@/components/shared/money";
import { profitTone, valueToneClass } from "@/components/shared/value-tone";
import type { RealTripSummary } from "@/lib/calculations/real-cost";
import { formatCurrency, formatCurrencyPerKm, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Indicadores de uma viagem: lucro real em destaque, os 4 valores por km
 * (receita, custo operacional, custo real, lucro real) e os totais.
 */
export function TripResults({ summary, className }: { summary: RealTripSummary; className?: string }) {
  const tone = profitTone(summary.realProfit);
  const overhead = summary.fixedCosts + summary.wearCosts + summary.maintenanceCosts;

  return (
    <div className={cn("bg-card overflow-hidden rounded-2xl border shadow-xs", className)}>
      <div className="flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">Lucro real</p>
          <Money value={summary.realProfit} size="lg" className={valueToneClass(tone)} />
        </div>
        <Badge tone={tone}>Margem {formatPercent(summary.realMargin)}</Badge>
      </div>
      <MetricGrid
        cols={2}
        className="bg-muted/40 border-t"
        items={[
          { label: "Receita/km", value: formatCurrencyPerKm(summary.revenuePerKm) },
          { label: "Custo operacional/km", value: formatCurrencyPerKm(summary.operationalCostPerKm) },
          { label: "Custo real/km", value: formatCurrencyPerKm(summary.realCostPerKm) },
          { label: "Lucro real/km", value: formatCurrencyPerKm(summary.realProfitPerKm), tone },
        ]}
      />
      <MetricGrid
        className="border-t"
        items={[
          { label: "Receita", value: formatCurrency(summary.revenue) },
          { label: "Operacional", value: formatCurrency(summary.operationalCosts) },
          { label: "Fixos + manut.", value: formatCurrency(overhead) },
        ]}
      />
    </div>
  );
}
