"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, BellRing, Gauge, Route, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { profitTone } from "@/components/shared/value-tone";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertList } from "@/features/alerts/alert-list";
import { useAlerts } from "@/features/alerts/use-alerts";
import { GoalCard } from "@/features/goal/goal-card";
import { ProLockedCard } from "@/features/subscription/pro-lock";
import { bestTripOfMonth, buildInsights, comparisonWindow } from "@/lib/calculations/insights";
import { percentChange, statsForRange } from "@/lib/calculations/metrics";
import { summarizeReal } from "@/lib/calculations/real-cost";
import { isInMonth } from "@/lib/calculations/trip";
import { formatKm, formatMonthYear } from "@/lib/format";
import { useData, useVehicleNames } from "@/providers/data-provider";
import { InsightsCard } from "./insights-card";
import { ProfitHeroCard } from "./profit-hero-card";
import { QuickLinks } from "./quick-links";
import { RealCostCard } from "./real-cost-card";
import { BestTripCard, LastTripCard } from "./trip-highlights";

const DASHBOARD_ALERTS = 2;
const longMonth = new Intl.DateTimeFormat("pt-BR", { month: "long" });

function DashboardSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-[188px] rounded-3xl" />
      <Skeleton className="h-[120px] rounded-2xl" />
      <Skeleton className="h-[150px] rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[84px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function MonthOverview() {
  const { trips, costRates, settings, isLoading, isPro } = useData();
  const alerts = useAlerts();
  const vehicleNames = useVehicleNames();

  const data = useMemo(() => {
    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = summarizeReal(
      trips.filter((t) => isInMonth(t.date, now)),
      costRates,
    );
    const prev = summarizeReal(
      trips.filter((t) => isInMonth(t.date, previous)),
      costRates,
    );
    // Custo real: no início do mês compara 30 dias com os 30 anteriores (mais estável).
    const window = comparisonWindow(now);
    const costNow = statsForRange(trips, window.current, costRates);
    const costBefore = statsForRange(trips, window.previous, costRates);
    return {
      now,
      month,
      previous: prev.km > 0 ? prev : null,
      previousMonthName: longMonth.format(previous),
      cost: costNow,
      costChange: costBefore.tripCount ? percentChange(costNow.realCostPerKm, costBefore.realCostPerKm) : null,
      costChangeLabel: window.label.includes("mês") ? "vs mês passado" : "vs 30 dias antes",
      insights: buildInsights(trips, costRates, now),
      best: bestTripOfMonth(trips, costRates, now),
    };
  }, [trips, costRates]);

  const lastTrip = trips[0];
  const name = (trip: { vehicleId: string | null }) => (trip.vehicleId ? vehicleNames.get(trip.vehicleId) : undefined);

  return (
    <>
      <PageHeader title="Resumo do mês" description={formatMonthYear(data.now)} />

      {isLoading ? (
        <DashboardSkeleton />
      ) : !trips.length ? (
        <EmptyState
          icon={Route}
          title="Nenhuma viagem ainda"
          description="Registre sua primeira viagem para ver o lucro real por KM."
          action={
            <Button asChild size="lg">
              <Link href="/viagens/nova">Registrar viagem</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6">
          {/* Ordem de prioridade: 1) quanto estou ganhando 2) quanto o veículo custa 3) a meta */}
          <div className="grid gap-3">
            <ProfitHeroCard
              month={data.month}
              previous={data.previous}
              previousMonthName={data.previousMonthName}
              pro={isPro}
            />
            {isPro ? (
              <RealCostCard summary={data.cost} change={data.costChange} changeLabel={data.costChangeLabel} />
            ) : (
              <ProLockedCard
                feature="Custo real por KM"
                icon={Gauge}
                title="Seu veículo custa"
                teaser="R$ 1,69/km"
                description="Descubra o custo real por KM, com custos fixos, desgaste e manutenção."
              />
            )}
            <GoalCard goal={settings?.monthlyProfitGoal ?? null} monthProfit={data.month.realProfit} />
          </div>

          <Section title="Detalhes do mês">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Receita" icon={ArrowUpRight} value={<Money value={data.month.revenue} />} />
              <StatCard label={isPro ? "Custo real" : "Custos"} icon={ArrowDownRight} value={<Money value={data.month.realCosts} />} />
              <StatCard
                label={isPro ? "Lucro real" : "Lucro"}
                icon={Wallet}
                tone={profitTone(data.month.realProfit)}
                value={<Money value={data.month.realProfit} />}
              />
              <StatCard label="KM rodados" icon={Route} value={formatKm(data.month.km)} />
            </div>
          </Section>

          {!isPro && (
            <ProLockedCard
              feature="Alertas inteligentes e insights"
              icon={BellRing}
              title="Alertas e insights"
              description="Aviso de troca de óleo, pneus, seguro e quando o lucro por KM cair."
            />
          )}

          {isPro && alerts.length > 0 && (
            <Section
              title="Alertas"
              action={alerts.length > DASHBOARD_ALERTS ? { href: "/saude#alertas", label: `Ver ${alerts.length}` } : undefined}
            >
              <AlertList alerts={alerts} limit={DASHBOARD_ALERTS} />
            </Section>
          )}

          {isPro && data.insights.length > 0 && (
            <Section title="Resumo rápido">
              <InsightsCard insights={data.insights} />
            </Section>
          )}

          <Section title="Viagens" action={{ href: "/historico", label: "Histórico" }}>
            <div className="grid grid-cols-2 gap-3">
              {lastTrip && <LastTripCard trip={lastTrip} vehicleName={name(lastTrip)} />}
              {data.best && <BestTripCard trip={data.best} vehicleName={name(data.best)} />}
            </div>
          </Section>

          <Section title="Ferramentas">
            <QuickLinks />
          </Section>
        </div>
      )}
    </>
  );
}
