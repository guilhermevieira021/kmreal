"use client";

import { useMemo, useState } from "react";
import { CircleCheck, HeartPulse } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ChipGroup } from "@/components/shared/chip-group";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { profitTone } from "@/components/shared/value-tone";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertList } from "@/features/alerts/alert-list";
import { useAlerts } from "@/features/alerts/use-alerts";
import { ExportReportButton } from "@/features/export/export-report-button";
import { calculateCostBreakdown } from "@/lib/calculations/cost-breakdown";
import { summarizeReal } from "@/lib/calculations/real-cost";
import { buildProfitTrend } from "@/lib/calculations/trend";
import { formatCurrencyPerKm, formatPercent } from "@/lib/format";
import { filterByPeriod, HEALTH_PERIODS, PERIOD_LABELS, periodRange, type PeriodId } from "@/lib/periods";
import { useData } from "@/providers/data-provider";
import { CostBreakdownChart } from "./cost-breakdown-chart";
import { ProfitTrendChart } from "./profit-trend-chart";

const ALL_VEHICLES = "all";

export function HealthView() {
  const { trips, vehicles, costRates, isLoading } = useData();
  const alerts = useAlerts();
  const [period, setPeriod] = useState<PeriodId>("30d");
  const [vehicleId, setVehicleId] = useState<string>(ALL_VEHICLES);

  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const data = useMemo(() => {
    const scoped = vehicleId === ALL_VEHICLES ? trips : trips.filter((t) => t.vehicleId === vehicleId);
    const inPeriod = filterByPeriod(scoped, period);
    const summary = summarizeReal(inPeriod, costRates);
    return {
      inPeriod,
      summary,
      breakdown: calculateCostBreakdown(summary),
      trend: buildProfitTrend(scoped, costRates, period),
    };
  }, [trips, costRates, period, vehicleId]);

  const s = data.summary;
  const overheadPerKm = s.realCostPerKm - s.operationalCostPerKm;
  const subject = vehicle ? `O custo real do ${vehicle.name}` : "Seu custo real atual";

  return (
    <>
      <PageHeader title="Saúde financeira" description="Para onde vai o seu dinheiro" backHref="/dashboard" />

      <div className="grid gap-2">
        <ChipGroup
          label="Período"
          value={period}
          onChange={setPeriod}
          options={HEALTH_PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
        />
        {vehicles.length > 1 && (
          <ChipGroup
            label="Veículo"
            value={vehicleId}
            onChange={setVehicleId}
            options={[
              { value: ALL_VEHICLES, label: "Todos os veículos" },
              ...vehicles.map((v) => ({ value: v.id, label: v.name })),
            ]}
          />
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 grid gap-3">
          <Skeleton className="h-[150px] rounded-3xl" />
          <Skeleton className="h-[180px] rounded-2xl" />
        </div>
      ) : !data.inPeriod.length ? (
        <div className="mt-4">
          <EmptyState
            icon={HeartPulse}
            title="Sem viagens neste período"
            description="Escolha um período maior ou registre novas viagens."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-6">
          <section aria-label="Custo real por km" className="bg-hero text-hero-foreground rounded-3xl p-5 shadow-lg">
            <p className="text-sm font-medium opacity-80">{subject} é</p>
            <Money value={s.realCostPerKm} size="xl" suffix="/km" className="mt-2" />
            <p className="mt-3 text-sm tabular-nums opacity-70">
              {formatCurrencyPerKm(s.operationalCostPerKm)} operacional + {formatCurrencyPerKm(overheadPerKm)} de fixos,
              manutenção e desgaste
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Receita por KM" value={formatCurrencyPerKm(s.revenuePerKm)} />
            <StatCard label="Custo operacional/KM" value={formatCurrencyPerKm(s.operationalCostPerKm)} />
            <StatCard label="Custo real por KM" value={formatCurrencyPerKm(s.realCostPerKm)} />
            <StatCard
              label="Lucro real por KM"
              tone={profitTone(s.realProfitPerKm)}
              value={formatCurrencyPerKm(s.realProfitPerKm)}
            />
            <StatCard label="Receita total" value={<Money value={s.revenue} />} />
            <StatCard
              label={`Lucro real · ${formatPercent(s.realMargin)}`}
              tone={profitTone(s.realProfit)}
              value={<Money value={s.realProfit} />}
            />
          </div>

          <Section title="Lucro real no período">
            <ProfitTrendChart buckets={data.trend} />
          </Section>

          <Section title="Composição do custo real">
            <CostBreakdownChart breakdown={data.breakdown} />
          </Section>

          <ExportReportButton
            kind="profitability"
            trips={data.inPeriod}
            periodLabel={`${PERIOD_LABELS[period]}${vehicle ? ` · ${vehicle.name}` : ""}`}
            range={periodRange(period)}
          />
        </div>
      )}

      <Section id="alertas" title="Alertas" className="mt-6 scroll-mt-4">
        {isLoading ? null : alerts.length ? (
          <AlertList alerts={alerts} />
        ) : (
          <p className="bg-card text-muted-foreground flex items-center gap-2 rounded-2xl border p-4 text-sm">
            <CircleCheck className="text-positive size-5" /> Tudo certo por aqui. Nenhum alerta no momento.
          </p>
        )}
      </Section>
    </>
  );
}
