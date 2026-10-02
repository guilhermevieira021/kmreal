"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { History, SearchX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ChipGroup } from "@/components/shared/chip-group";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { MetricGrid } from "@/components/shared/metric-grid";
import { Money } from "@/components/shared/money";
import { SearchInput } from "@/components/shared/search-input";
import { profitTone, valueToneClass } from "@/components/shared/value-tone";
import { Button } from "@/components/ui/button";
import { ExportReportButton } from "@/features/export/export-report-button";
import { summarizeReal, type CostRates, type RealPeriodSummary } from "@/lib/calculations/real-cost";
import { formatCurrency, formatKm, formatMonthYear } from "@/lib/format";
import { filterByPeriod, HISTORY_PERIODS, PERIOD_LABELS, periodRange, type PeriodId } from "@/lib/periods";
import { cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import type { Trip } from "@/types";
import { TripList } from "./trip-list";
import { searchTrips } from "./trip-search";

interface MonthGroup {
  key: string;
  label: string;
  trips: Trip[];
  summary: RealPeriodSummary;
}

/** Agrupa viagens (já ordenadas desc) por mês, preservando a ordem. */
function groupByMonth(trips: Trip[], rates: CostRates): MonthGroup[] {
  const groups = new Map<string, Trip[]>();
  for (const trip of trips) {
    const key = trip.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), trip]);
  }
  return [...groups].map(([key, items]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      key,
      label: formatMonthYear(new Date(year, month - 1, 1)),
      trips: items,
      summary: summarizeReal(items, rates),
    };
  });
}

export function TripHistory() {
  const { trips, vehicles, costRates, isLoading, isPro } = useData();
  const [period, setPeriod] = useState<PeriodId>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(
    () => searchTrips(filterByPeriod(trips, period), vehicles, deferredQuery),
    [trips, vehicles, period, deferredQuery],
  );
  const groups = useMemo(() => groupByMonth(filtered, costRates), [filtered, costRates]);
  const summary = useMemo(() => summarizeReal(filtered, costRates), [filtered, costRates]);
  const isFiltered = period !== "all" || deferredQuery.trim() !== "";

  if (!isLoading && !trips.length) {
    return (
      <>
        <PageHeader title="Histórico" />
        <EmptyState
          icon={History}
          title="Sem viagens registradas"
          description="Suas viagens aparecem aqui, agrupadas por mês."
          action={
            <Button asChild size="lg">
              <Link href="/viagens/nova">Registrar viagem</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Histórico"
        description={isLoading ? undefined : `${filtered.length} de ${trips.length} viagens`}
        action={
          filtered.length > 0 ? (
            <ExportReportButton
              compact
              trips={filtered}
              periodLabel={PERIOD_LABELS[period]}
              range={periodRange(period)}
              filterLabel={deferredQuery.trim() ? `busca: "${deferredQuery.trim()}"` : undefined}
            />
          ) : undefined
        }
      />

      <div className="grid gap-3">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar veículo ou data (ex.: 15/09)" />
        <ChipGroup
          label="Período"
          value={period}
          onChange={setPeriod}
          options={HISTORY_PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
        />
      </div>

      {isLoading ? (
        <div className="mt-4">
          <ListSkeleton rows={5} className="h-[74px]" />
        </div>
      ) : !filtered.length ? (
        <div className="mt-4">
          <EmptyState
            icon={SearchX}
            title="Nenhuma viagem encontrada"
            description="Tente outro período ou termo de busca."
            action={
              isFiltered ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setPeriod("all");
                  }}
                >
                  Limpar filtros
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Resumo do que está filtrado */}
          <div className="bg-card mt-4 overflow-hidden rounded-2xl border shadow-xs">
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {isPro ? "Lucro real" : "Lucro"} · {PERIOD_LABELS[period]}
              </p>
              <Money value={summary.realProfit} size="md" className={valueToneClass(profitTone(summary.realProfit))} />
            </div>
            <MetricGrid
              className="bg-muted/40 border-t"
              items={[
                { label: "Receita", value: formatCurrency(summary.revenue) },
                { label: isPro ? "Custo real" : "Custos", value: formatCurrency(summary.realCosts) },
                { label: "KM", value: formatKm(summary.km) },
              ]}
            />
          </div>

          <div className="mt-2 grid gap-4">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <div className="bg-background/95 sticky top-0 z-10 -mx-4 mb-2 flex items-end justify-between gap-3 px-5 pt-3 pb-2 backdrop-blur">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{group.label}</h2>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {group.summary.tripCount} {group.summary.tripCount === 1 ? "viagem" : "viagens"} ·{" "}
                      {formatKm(group.summary.km)}
                    </p>
                  </div>
                  <div className={cn("shrink-0 text-right", valueToneClass(profitTone(group.summary.realProfit)))}>
                    <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      {isPro ? "Lucro real" : "Lucro"}
                    </p>
                    <Money value={group.summary.realProfit} size="sm" />
                  </div>
                </div>
                <TripList trips={group.trips} />
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
