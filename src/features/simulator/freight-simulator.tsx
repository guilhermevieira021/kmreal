"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BarChart3, Calculator, CircleAlert, CircleCheck, CircleX, Info, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AmountInput } from "@/components/shared/amount-input";
import { ChipGroup } from "@/components/shared/chip-group";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { MetricGrid } from "@/components/shared/metric-grid";
import { Money } from "@/components/shared/money";
import { Section } from "@/components/shared/section";
import { profitTone, valueToneClass } from "@/components/shared/value-tone";
import { Button } from "@/components/ui/button";
import {
  averageBaseline,
  compareWithAverage,
  freightVerdict,
  simulateFreight,
  type CostBasis,
  type FreightVerdict,
} from "@/lib/calculations/simulator";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import {
  formatCurrency,
  formatCurrencyPerKm,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  parseDecimal,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { PREFILL_PARAMS } from "@/features/trips/trip-wizard/prefill";
import { useData } from "@/providers/data-provider";
import { ProLockedCard } from "@/features/subscription/pro-lock";

const VERDICTS: Record<FreightVerdict, { label: string; icon: typeof CircleCheck; className: string }> = {
  good: { label: "Frete viável", icon: CircleCheck, className: "bg-positive/12 text-positive" },
  low: { label: "Margem baixa", icon: CircleAlert, className: "bg-warning/12 text-warning" },
  loss: { label: "Frete com prejuízo", icon: CircleX, className: "bg-destructive/10 text-destructive" },
};

function describeBasis(basis: CostBasis): string {
  if (basis.kind === "history") {
    return `Custo operacional pela média de ${basis.tripCount} ${basis.tripCount === 1 ? "viagem" : "viagens"} deste veículo (combustível, pedágios, ajudante e outros).`;
  }
  const source = basis.priceSource === "last-trip" ? "último preço pago" : "preço de referência";
  return `Sem histórico: considera só combustível — ${formatNumber(basis.kmPerLiter)} km/l a ${formatCurrency(basis.fuelPrice)}/L (${source}).`;
}

export function FreightSimulator() {
  const { vehicles, trips, costRates, isLoading, isPro } = useData();
  const [selectedId, setSelectedId] = useState<string>();
  const [freight, setFreight] = useState("");
  const [km, setKm] = useState("");
  const [hours, setHours] = useState("");

  const vehicleId = selectedId ?? vehicles[0]?.id ?? "";
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const freightValue = parseDecimal(freight);
  const kmValue = parseDecimal(km);
  const hoursValue = parseDecimal(hours);
  const result =
    vehicle && freightValue > 0 && kmValue > 0
      ? simulateFreight({
          freight: freightValue,
          km: kmValue,
          vehicle,
          trips,
          rates: costRates,
          hours: hoursValue > 0 ? hoursValue : undefined,
        })
      : null;
  const baseline = vehicle ? averageBaseline(vehicle, trips, costRates) : null;

  if (isLoading) {
    return (
      <>
        <PageHeader title="Simulador de frete" backHref="/dashboard" />
        <ListSkeleton rows={3} className="h-16" />
      </>
    );
  }

  if (!vehicles.length) {
    return (
      <>
        <PageHeader title="Simulador de frete" backHref="/dashboard" />
        <EmptyState
          icon={Truck}
          title="Cadastre um veículo"
          description="O simulador usa o consumo do veículo para estimar o custo."
          action={
            <Button asChild size="lg">
              <Link href="/veiculos/novo">Cadastrar veículo</Link>
            </Button>
          }
        />
      </>
    );
  }

  const tone = result ? profitTone(result.realProfit) : "default";
  const verdict = result ? VERDICTS[freightVerdict(result.realProfit, result.realMargin)] : null;
  const comparison = result && baseline ? compareWithAverage(result, baseline.metrics) : null;

  return (
    <>
      <PageHeader title="Simulador de frete" description="Vale a pena aceitar?" backHref="/dashboard" />

      <div className="grid gap-5">
        <div className="grid gap-2">
          {vehicles.length > 1 && (
            <ChipGroup
              label="Veículo"
              value={vehicleId}
              onChange={setSelectedId}
              options={vehicles.map((v) => ({ value: v.id, label: v.name }))}
            />
          )}
          {vehicle && (
            <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-sm">
              <Truck className="size-4" /> {vehicle.name} · {formatNumber(vehicle.kmPerLiter)} km/l ·{" "}
              {FUEL_TYPE_LABELS[vehicle.fuelType]}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <label htmlFor="sim-freight" className="text-sm font-medium">
              Valor do frete
            </label>
            <AmountInput
              id="sim-freight"
              prefix="R$"
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
              className="text-2xl"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="sim-km" className="text-sm font-medium">
              Distância
            </label>
            <AmountInput id="sim-km" suffix="km" value={km} onChange={(e) => setKm(e.target.value)} className="text-2xl" />
          </div>
          <div className="col-span-2 grid gap-2">
            <label htmlFor="sim-hours" className="text-sm font-medium">
              Tempo estimado <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <AmountInput
              id="sim-hours"
              suffix="horas"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="text-2xl"
            />
          </div>
        </div>

        <section aria-live="polite" aria-label="Resultado da simulação">
          {result && verdict ? (
            <div className="bg-card overflow-hidden rounded-2xl border shadow-xs">
              <div className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-semibold", verdict.className)}>
                <verdict.icon className="size-4" /> {verdict.label}
              </div>
              <div className="flex items-end justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium">{isPro ? "Lucro real por KM" : "Lucro estimado por KM"}</p>
                  <Money value={result.realProfitPerKm} size="lg" suffix="/km" className={valueToneClass(tone)} />
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs font-medium">{isPro ? "Lucro real" : "Lucro estimado"}</p>
                  <Money value={result.realProfit} size="md" className={valueToneClass(tone)} />
                </div>
              </div>
              {isPro ? (
                <>
                  <MetricGrid
                    cols={2}
                    className="bg-muted/40 border-t"
                    items={[
                      { label: "Receita/km", value: formatCurrencyPerKm(result.revenuePerKm) },
                      { label: "Custo operacional/km", value: formatCurrencyPerKm(result.operationalCostPerKm) },
                      { label: "Custo real/km", value: formatCurrencyPerKm(result.realCostPerKm) },
                      { label: "Margem real", value: formatPercent(result.realMargin), tone },
                    ]}
                  />
                  <MetricGrid
                    className="border-t"
                    items={[
                      { label: "Operacional", value: formatCurrency(result.operationalCost) },
                      { label: "Fixos + manut.", value: formatCurrency(result.overheadCost) },
                      result.realProfitPerHour !== null
                        ? { label: "Lucro/hora", value: formatCurrency(result.realProfitPerHour), tone }
                        : { label: "Lucro/hora", value: "—", tone: "muted" },
                    ]}
                  />
                </>
              ) : (
                <>
                  <MetricGrid
                    className="bg-muted/40 border-t"
                    items={[
                      { label: "Receita/km", value: formatCurrencyPerKm(result.revenuePerKm) },
                      { label: "Custo/km", value: formatCurrencyPerKm(result.operationalCostPerKm) },
                      { label: "Margem", value: formatPercent(result.realMargin), tone },
                    ]}
                  />
                  <div className="border-t p-3">
                    <ProLockedCard
                      feature="Simulador avançado"
                      icon={Calculator}
                      title="Lucro real projetado"
                      description="Inclui custos fixos, desgaste e manutenção: veja se o frete paga o veículo."
                      className="shadow-none"
                    />
                  </div>
                </>
              )}
              {result.operationalProfit > 0 && result.realProfit < 0 && (
                <p className="text-destructive bg-destructive/5 border-t px-4 py-3 text-sm font-medium">
                  Paga o combustível e o pedágio, mas não cobre os custos do veículo.
                </p>
              )}
              <p className="text-muted-foreground flex gap-2 border-t px-4 py-3 text-xs">
                <Info className="mt-px size-3.5 shrink-0" />
                {describeBasis(result.basis)}
                {result.rates &&
                  ` Fixos, manutenção e desgaste: ${formatCurrencyPerKm(result.rates.overheadPerKm)} por km.`}
              </p>
            </div>
          ) : (
            <div className="text-muted-foreground rounded-2xl border border-dashed px-4 py-8 text-center text-sm">
              Informe o valor do frete e a distância para ver o lucro estimado.
            </div>
          )}
        </section>

        {!isPro && result && (
          <ProLockedCard
            feature="Comparação com média histórica"
            icon={BarChart3}
            title="Este frete vs sua média"
            description="Compare receita, custo e lucro por KM com o histórico do veículo."
          />
        )}

        {isPro && comparison && baseline && (
          <Section title="Este frete vs sua média">
            <div className="bg-card overflow-hidden rounded-2xl border shadow-xs">
              <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto_4.5rem] gap-3 border-b px-4 py-2 text-[11px] font-semibold tracking-wide uppercase">
                <span />
                <span className="text-right">Frete</span>
                <span className="text-right">Média</span>
                <span className="text-right">Dif.</span>
              </div>
              {comparison.map((row) => (
                <div
                  key={row.key}
                  className="grid min-h-12 grid-cols-[1fr_auto_auto_4.5rem] items-center gap-3 border-b px-4 py-2 text-sm last:border-b-0"
                >
                  <span className="font-medium">{row.label}</span>
                  <span className="text-right font-semibold tabular-nums">{formatCurrency(row.current)}</span>
                  <span className="text-muted-foreground text-right tabular-nums">{formatCurrency(row.average)}</span>
                  <span
                    className={cn(
                      "justify-self-end rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                      row.favorable === true && "bg-positive/12 text-positive",
                      row.favorable === false && "bg-destructive/10 text-destructive",
                      row.favorable === null && "bg-muted text-muted-foreground",
                    )}
                  >
                    {row.delta === null ? "—" : formatSignedPercent(row.delta)}
                  </span>
                </div>
              ))}
              <p className="text-muted-foreground bg-muted/40 px-4 py-2.5 text-xs">
                Média de {baseline.tripCount} {baseline.tripCount === 1 ? "viagem" : "viagens"}{" "}
                {baseline.scope === "vehicle" ? `do ${vehicle?.name}` : "de todos os veículos"}.
              </p>
            </div>
          </Section>
        )}

        {result && (
          <Button asChild size="lg">
            <Link
              href={`/viagens/nova?${new URLSearchParams({
                [PREFILL_PARAMS.vehicleId]: vehicleId,
                [PREFILL_PARAMS.freightRevenue]: freight,
                [PREFILL_PARAMS.km]: km,
              }).toString()}`}
            >
              Registrar como viagem <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}
