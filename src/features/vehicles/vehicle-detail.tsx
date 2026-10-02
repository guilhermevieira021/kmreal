"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Gauge, HeartPulse, Pencil, Plus, Receipt, SearchX, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Money } from "@/components/shared/money";
import { Section } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { summarizeReal, wearItemPerKm } from "@/lib/calculations/real-cost";
import { KEY_ITEM_TYPES } from "@/lib/calculations/vehicle-health";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatCurrencyPerKm, formatDate, formatKm, formatNumber } from "@/lib/format";
import { useData, useVehicle } from "@/providers/data-provider";
import type { VehicleFixedCosts, WearItem } from "@/types";
import { ProLockedCard } from "@/features/subscription/pro-lock";
import { FixedCostsSheet } from "./fixed-costs-sheet";
import { HealthBadge } from "./health-badge";
import { useVehicleHealth } from "./use-vehicle-health";
import { WearItemSheet } from "./wear-item-sheet";

const FIXED_ROWS: { key: Exclude<keyof VehicleFixedCosts, "insuranceExpiresOn">; label: string; period: "ano" | "mês" }[] = [
  { key: "insuranceAnnual", label: "Seguro", period: "ano" },
  { key: "ipvaAnnual", label: "IPVA", period: "ano" },
  { key: "licensingAnnual", label: "Licenciamento", period: "ano" },
  { key: "financingMonthly", label: "Parcela", period: "mês" },
  { key: "trackerMonthly", label: "Rastreador", period: "mês" },
  { key: "phoneMonthly", label: "Internet / telefone", period: "mês" },
  { key: "otherMonthly", label: "Outros fixos", period: "mês" },
];

const row = "flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-sm";

export function VehicleDetail({ id }: { id: string }) {
  const { vehicle, isLoading } = useVehicle(id);
  const { trips, costRates, isPro } = useData();
  const health = useVehicleHealth(id);
  const [fixedOpen, setFixedOpen] = useState(false);
  const [wearState, setWearState] = useState<{ item?: WearItem } | null>(null);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Veículo" backHref="/veiculos" />
        <ListSkeleton rows={3} className="h-32" />
      </>
    );
  }
  if (!vehicle || !health) {
    return (
      <>
        <PageHeader title="Veículo" backHref="/veiculos" />
        <EmptyState icon={SearchX} title="Veículo não encontrado" />
      </>
    );
  }

  const rates = costRates.get(vehicle.id);
  const summary = summarizeReal(
    trips.filter((t) => t.vehicleId === vehicle.id),
    costRates,
  );
  const hasTrips = summary.tripCount > 0;
  const fixedRows = FIXED_ROWS.filter((r) => vehicle.fixedCosts[r.key] > 0);
  const keyItems = health.items.filter((i) => KEY_ITEM_TYPES.includes(i.item.type));

  const perKmRows: [string, number][] = [
    ["Operacional (média das viagens)", summary.operationalCostPerKm],
    ["Custos fixos", rates?.fixedPerKm ?? 0],
    ["Manutenções", rates?.maintenancePerKm ?? 0],
    ["Desgaste (vida útil)", rates?.wearPerKm ?? 0],
  ];

  return (
    <>
      <PageHeader
        title={vehicle.name}
        description={`${vehicle.model} · ${formatNumber(vehicle.kmPerLiter)} km/l · ${FUEL_TYPE_LABELS[vehicle.fuelType]}`}
        backHref="/veiculos"
        action={
          <Button asChild variant="outline" size="icon" className="rounded-full" aria-label="Editar dados do veículo">
            <Link href={`/veiculos/${vehicle.id}/editar`}>
              <Pencil />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6">
        {isPro ? (
          <>
            {/* Custo real do veículo */}
            <section aria-label="Custo real do veículo" className="bg-hero text-hero-foreground rounded-3xl p-5 shadow-lg">
              <p className="text-sm font-medium opacity-80">Custo real do veículo</p>
              {hasTrips ? (
                <Money value={summary.realCostPerKm} size="xl" suffix="/km" className="mt-2" />
              ) : (
                <Money value={rates?.overheadPerKm ?? 0} size="xl" suffix="/km + combustível" className="mt-2" />
              )}
              <dl className="mt-4 grid gap-1.5 border-t border-hero-foreground/15 pt-3 text-sm">
                {perKmRows.map(([label, value]) =>
                  !hasTrips && label.startsWith("Operacional") ? null : (
                    <div key={label} className="flex justify-between gap-3 tabular-nums">
                      <dt className="opacity-70">{label}</dt>
                      <dd className="font-semibold">{formatCurrencyPerKm(value)}</dd>
                    </div>
                  ),
                )}
              </dl>
              {rates && (
                <p className="mt-3 text-xs opacity-60">
                  Fixos rateados sobre {formatNumber(rates.monthlyKm.km)} km/mês (
                  {rates.monthlyKm.basis === "history" ? "média dos últimos 90 dias" : "estimativa do cadastro"}).
                </p>
              )}
            </section>

            {/* Saúde do veículo (resumo) */}
            <Section title="Saúde do veículo">
              <Link
                href={`/veiculos/${vehicle.id}/saude`}
                className="bg-card active:bg-accent block overflow-hidden rounded-2xl border shadow-xs transition-colors"
              >
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                  <span className="text-sm">
                    <span className="text-muted-foreground">KM atual </span>
                    <strong className="tabular-nums">{health.odometer ? formatKm(health.odometer.km) : "não informado"}</strong>
                  </span>
                  <ChevronRight className="text-muted-foreground size-5" />
                </div>
                <ul className="divide-y">
                  {keyItems.map((h) => (
                    <li key={h.item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="truncate">{h.item.label}</span>
                      <HealthBadge status={h.status} />
                    </li>
                  ))}
                </ul>
              </Link>
            </Section>

            {/* Custos fixos */}
            <Section title="Custos fixos">
              <div className="bg-card overflow-hidden rounded-2xl border shadow-xs">
                <div className="grid grid-cols-3 divide-x border-b">
                  {[
                    ["Por mês", formatCurrency(rates?.monthlyFixed ?? 0)],
                    ["Por ano", formatCurrency(rates?.annualFixed ?? 0)],
                    ["Por km", formatCurrencyPerKm(rates?.fixedPerKm ?? 0)],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 px-3 py-3 first:pl-4">
                      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">{label}</p>
                      <p className="truncate text-sm font-bold tabular-nums">{value}</p>
                    </div>
                  ))}
                </div>
                {fixedRows.length ? (
                  <ul className="divide-y">
                    {fixedRows.map((r) => (
                      <li key={r.key} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(vehicle.fixedCosts[r.key])}/{r.period}
                        </span>
                      </li>
                    ))}
                    {vehicle.fixedCosts.insuranceExpiresOn && (
                      <li className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">Vencimento do seguro</span>
                        <span className="font-medium tabular-nums">{formatDate(vehicle.fixedCosts.insuranceExpiresOn)}</span>
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-muted-foreground px-4 py-3 text-sm">
                    Nenhum custo fixo informado. Sem eles, o lucro aparece maior do que é.
                  </p>
                )}
                <button type="button" onClick={() => setFixedOpen(true)} className={`${row} text-primary-strong border-t font-semibold`}>
                  <Pencil className="size-4" /> Editar custos fixos
                </button>
              </div>
            </Section>

            {/* Vida útil */}
            <Section title="Vida útil (desgaste)">
              <div className="bg-card overflow-hidden rounded-2xl border shadow-xs">
                <ul className="divide-y">
                  {vehicle.wearItems.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => setWearState({ item })} className={`${row} active:bg-accent`}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.label}</span>
                          <span className="text-muted-foreground block text-xs tabular-nums">
                            {item.cost > 0 ? formatCurrency(item.cost) : "Valor não informado"} a cada {formatKm(item.lifespanKm)}
                          </span>
                        </span>
                        <span className="font-semibold tabular-nums">{formatCurrencyPerKm(wearItemPerKm(item))}</span>
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => setWearState({})} className={`${row} text-primary-strong border-t font-semibold`}>
                  <Plus className="size-4" /> Adicionar item
                </button>
              </div>
              <p className="text-muted-foreground flex gap-2 px-1 text-xs">
                <Wrench className="mt-px size-3.5 shrink-0" />
                Itens com vida útil entram como desgaste por km. Manutenções avulsas (ex.: embreagem sem item) entram pelo
                valor gasto nos últimos 12 meses.
              </p>
            </Section>
          </>
        ) : (
          <>
            {/* FREE: dados básicos + o que o PRO desbloqueia */}
            <dl className="bg-card divide-y rounded-2xl border shadow-xs">
              {[
                ["Consumo", `${formatNumber(vehicle.kmPerLiter)} km/l`],
                ["Combustível", FUEL_TYPE_LABELS[vehicle.fuelType]],
                ["KM rodados por mês", formatKm(vehicle.estimatedMonthlyKm)],
                ["KM atual", health.odometer ? formatKm(health.odometer.km) : "Não informado"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <ProLockedCard
              feature="Custo real do veículo"
              icon={Gauge}
              title="Custo real por KM"
              teaser="R$ 1,69/km"
              description="Quanto este veículo custa de verdade, rodando ou parado."
            />
            <ProLockedCard
              feature="Custos fixos"
              icon={Receipt}
              title="Custos fixos"
              description="Seguro, IPVA, parcela e rastreador convertidos em R$/km."
            />
            <ProLockedCard
              feature="Saúde do veículo"
              icon={HeartPulse}
              title="Saúde do veículo"
              description="Próxima troca de óleo, pneus e revisão, com avisos antes de vencer."
            />
            <ProLockedCard
              feature="Controle de vida útil"
              icon={Wrench}
              title="Vida útil e desgaste"
              description="Pneus, freios e correia viram custo por km — sem surpresas."
            />
          </>
        )}
      </div>

      <FixedCostsSheet
        vehicle={vehicle}
        monthlyKm={rates?.monthlyKm.km ?? vehicle.estimatedMonthlyKm}
        open={fixedOpen}
        onOpenChange={setFixedOpen}
      />
      <WearItemSheet
        vehicle={vehicle}
        item={wearState?.item}
        open={wearState !== null}
        onOpenChange={(open) => !open && setWearState(null)}
      />
    </>
  );
}
