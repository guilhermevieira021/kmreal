"use client";

import { Lock } from "lucide-react";
import { Badge } from "@/components/shared/badge";
import { MetricGrid } from "@/components/shared/metric-grid";
import { Money } from "@/components/shared/money";
import { profitTone, valueToneClass } from "@/components/shared/value-tone";
import { ProBadge } from "@/features/subscription/pro-lock";
import { useUpgrade } from "@/features/subscription/upgrade-provider";
import type { RealTripSummary } from "@/lib/calculations/real-cost";
import { formatCurrency, formatCurrencyPerKm, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";

/**
 * Indicadores de uma viagem.
 * PRO: lucro real em destaque + receita, custo operacional, custo real e lucro real por km.
 * FREE: lucro operacional (o resumo já vem sem custos fixos/manutenção) + acesso bloqueado ao custo real.
 */
export function TripResults({ summary, className }: { summary: RealTripSummary; className?: string }) {
  const { isPro } = useData();
  const { openUpgrade } = useUpgrade();
  const tone = profitTone(summary.realProfit);
  const overhead = summary.fixedCosts + summary.wearCosts + summary.maintenanceCosts;

  return (
    <div className={cn("bg-card overflow-hidden rounded-2xl border shadow-xs", className)}>
      <div className="flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">{isPro ? "Lucro real" : "Lucro"}</p>
          <Money value={summary.realProfit} size="lg" className={valueToneClass(tone)} />
        </div>
        <Badge tone={tone}>Margem {formatPercent(summary.realMargin)}</Badge>
      </div>

      {isPro ? (
        <>
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
        </>
      ) : (
        <>
          <MetricGrid
            className="bg-muted/40 border-t"
            items={[
              { label: "Receita/km", value: formatCurrencyPerKm(summary.revenuePerKm) },
              { label: "Custo/km", value: formatCurrencyPerKm(summary.operationalCostPerKm) },
              { label: "Lucro/km", value: formatCurrencyPerKm(summary.realProfitPerKm), tone },
            ]}
          />
          <button
            type="button"
            onClick={() => openUpgrade("Custo real e lucro real por KM")}
            className="active:bg-accent flex min-h-12 w-full items-center gap-2 border-t px-4 py-3 text-left text-sm"
          >
            <Lock className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className="flex-1">
              <span className="font-medium">Lucro real por KM</span>
              <span className="text-muted-foreground block text-xs">Com custos fixos, desgaste e manutenção</span>
            </span>
            <ProBadge />
          </button>
        </>
      )}
    </div>
  );
}
