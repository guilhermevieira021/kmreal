"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Medal, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ChipGroup } from "@/components/shared/chip-group";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { profitTone, valueToneClass } from "@/components/shared/value-tone";
import { Button } from "@/components/ui/button";
import {
  buildVehicleStats,
  metricValue,
  RANKING_METRIC_LABELS,
  rankVehicles,
  type RankingMetric,
  type VehicleStats,
} from "@/lib/calculations/ranking";
import { formatCurrency, formatCurrencyPerKm, formatKm } from "@/lib/format";
import { filterByPeriod, PERIOD_LABELS, RANKING_PERIODS, type PeriodId } from "@/lib/periods";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";

const MEDALS = ["🥇", "🥈", "🥉"];
const METRICS = Object.keys(RANKING_METRIC_LABELS) as RankingMetric[];

const formatMetric = (stats: VehicleStats, metric: RankingMetric) =>
  metric === "profit" ? formatCurrency(stats.summary.realProfit) : formatCurrencyPerKm(metricValue(stats, metric));

function RankingRow({ stats, position, metric }: { stats: VehicleStats; position: number; metric: RankingMetric }) {
  const isPodium = position < MEDALS.length;
  const value = metricValue(stats, metric);
  return (
    <li
      className={cn(
        "bg-card flex items-center gap-3 rounded-2xl border p-4 shadow-xs",
        position === 0 && "border-warning/40 bg-warning/5",
      )}
    >
      <span
        className={cn("flex size-11 shrink-0 items-center justify-center", isPodium ? "text-3xl" : "bg-muted rounded-full text-base font-bold")}
        aria-label={`${position + 1}º lugar`}
      >
        {isPodium ? MEDALS[position] : position + 1}
      </span>
      <Link href={`/veiculos/${stats.vehicle.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{stats.vehicle.name}</span>
        <span className="text-muted-foreground block truncate text-xs tabular-nums">
          {stats.summary.tripCount} {stats.summary.tripCount === 1 ? "viagem" : "viagens"} · {formatKm(stats.summary.km)}
        </span>
      </Link>
      <span className="text-right">
        <span className={cn("block text-lg font-bold tabular-nums", metric !== "revenuePerKm" && valueToneClass(profitTone(value)))}>
          {formatMetric(stats, metric)}
        </span>
        <span className="text-muted-foreground block text-xs tabular-nums">
          {metric === "profit"
            ? formatCurrencyPerKm(stats.summary.realProfitPerKm)
            : `Lucro real ${formatCurrency(stats.summary.realProfit)}`}
        </span>
      </span>
    </li>
  );
}

export function VehicleRanking() {
  const { vehicles, trips, costRates, isLoading } = useData();
  const [metric, setMetric] = useState<RankingMetric>("profitPerKm");
  const [period, setPeriod] = useState<PeriodId>("all");

  const { ranked, unranked } = useMemo(
    () => rankVehicles(buildVehicleStats(vehicles, filterByPeriod(trips, period), costRates), metric),
    [vehicles, trips, costRates, period, metric],
  );

  return (
    <>
      <PageHeader title="Ranking de veículos" description="Qual veículo dá mais resultado" backHref="/veiculos" />

      {isLoading ? (
        <ListSkeleton rows={3} className="h-[78px]" />
      ) : vehicles.length < 2 ? (
        <EmptyState
          icon={Medal}
          title="Ranking disponível com 2+ veículos"
          description="Cadastre outro veículo para comparar o desempenho de cada um."
          action={
            <Button asChild size="lg">
              <Link href="/veiculos/novo">
                <Plus /> Adicionar veículo
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <ChipGroup
              label="Critério"
              value={metric}
              onChange={setMetric}
              options={METRICS.map((m) => ({ value: m, label: RANKING_METRIC_LABELS[m] }))}
            />
            <ChipGroup
              label="Período"
              value={period}
              onChange={setPeriod}
              options={RANKING_PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
            />
          </div>

          {ranked.length ? (
            <ol className="grid gap-2">
              {ranked.map((stats, i) => (
                <RankingRow key={stats.vehicle.id} stats={stats} position={i} metric={metric} />
              ))}
            </ol>
          ) : (
            <EmptyState icon={Medal} title="Sem viagens no período" description="Escolha um período maior." />
          )}

          {unranked.length > 0 && (
            <p className="text-muted-foreground px-1 text-sm">
              Sem viagens no período: {unranked.map((s) => s.vehicle.name).join(", ")}.
            </p>
          )}
        </div>
      )}
    </>
  );
}
