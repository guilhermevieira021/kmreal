"use client";

import { useState, type FormEvent } from "react";
import { CalendarClock, ChevronRight, Gauge, Plus, SearchX, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { AmountInput } from "@/components/shared/amount-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { ProgressBar } from "@/components/shared/progress-bar";
import { Section } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { KEY_ITEM_TYPES, maintenanceLabel, type WearItemHealth } from "@/lib/calculations/vehicle-health";
import { formatCurrency, formatDate, formatKm, parseDecimal, todayISO } from "@/lib/format";
import { useData, useVehicle } from "@/providers/data-provider";
import type { MaintenanceType } from "@/types";
import { HealthBadge } from "./health-badge";
import { MaintenanceSheet, type MaintenanceSheetState } from "./maintenance-sheet";
import { useVehicleHealth } from "./use-vehicle-health";

const NEXT_TITLES: Partial<Record<MaintenanceType, string>> = {
  oil: "Próxima troca de óleo",
  tires: "Próxima troca de pneus",
  service: "Próxima revisão",
};

const PROGRESS_COLOR = { ok: "bg-positive", soon: "bg-warning", overdue: "bg-destructive", unknown: "bg-muted" };

function describeRemaining(h: WearItemHealth): string {
  if (h.remainingKm === null || h.dueKm === null) return "Registre a última troca para acompanhar.";
  const when = `troca aos ${formatKm(h.dueKm)}`;
  return h.remainingKm < 0 ? `Passou ${formatKm(-h.remainingKm)} · ${when}` : `Faltam ${formatKm(h.remainingKm)} · ${when}`;
}

/** Card grande para óleo, pneus e revisão. */
function KeyItemCard({ h, onRegister }: { h: WearItemHealth; onRegister: () => void }) {
  return (
    <div className="bg-card rounded-2xl border p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{NEXT_TITLES[h.item.type] ?? h.item.label}</p>
          <p className="text-muted-foreground text-sm tabular-nums">{describeRemaining(h)}</p>
        </div>
        <HealthBadge status={h.status} />
      </div>
      {h.usedShare !== null && (
        <ProgressBar
          className="mt-3 h-2"
          value={h.usedShare}
          label={`Vida útil usada: ${Math.round(h.usedShare)}%`}
          indicatorClassName={PROGRESS_COLOR[h.status]}
        />
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs tabular-nums">
          {h.lastDone
            ? `Última: ${formatDate(h.lastDone.date)} aos ${formatKm(h.lastDone.odometerKm ?? 0)}`
            : `Vida útil: ${formatKm(h.item.lifespanKm)}`}
        </p>
        <Button type="button" variant="outline" size="sm" className="h-9 rounded-full" onClick={onRegister}>
          Registrar troca
        </Button>
      </div>
    </div>
  );
}

export function VehicleHealthView({ id }: { id: string }) {
  const { vehicle, isLoading } = useVehicle(id);
  const health = useVehicleHealth(id);
  const [sheet, setSheet] = useState<MaintenanceSheetState | null>(null);
  const [odometerOpen, setOdometerOpen] = useState(false);

  if (isLoading) {
    return (
      <>
        <PageHeader title="Saúde do veículo" backHref={`/veiculos/${id}`} />
        <ListSkeleton rows={3} className="h-32" />
      </>
    );
  }
  if (!vehicle || !health) {
    return (
      <>
        <PageHeader title="Saúde do veículo" backHref="/veiculos" />
        <EmptyState icon={SearchX} title="Veículo não encontrado" />
      </>
    );
  }

  const keyItems = health.items.filter((h) => KEY_ITEM_TYPES.includes(h.item.type));
  const otherItems = health.items.filter((h) => !KEY_ITEM_TYPES.includes(h.item.type));
  const currentKm = health.odometer?.km ?? null;
  const register = (type: MaintenanceType, description = "") =>
    setSheet({ defaults: { type, status: "done", description: type === "other" ? description : "" } });

  return (
    <>
      <PageHeader title="Saúde do veículo" description={vehicle.name} backHref={`/veiculos/${id}`} />

      <div className="grid gap-6">
        {/* KM atual */}
        <button
          type="button"
          onClick={() => setOdometerOpen(true)}
          className="bg-card active:bg-accent flex items-center gap-3 rounded-2xl border p-4 text-left shadow-xs"
        >
          <span className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl">
            <Gauge className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-muted-foreground block text-xs font-medium">KM atual (estimado)</span>
            <span className="block text-xl font-bold tabular-nums">
              {health.odometer ? formatKm(health.odometer.km) : "Informe o KM"}
            </span>
            {health.odometer && (
              <span className="text-muted-foreground block text-xs tabular-nums">
                Leitura de {formatDate(health.odometer.readingDate)} + {formatKm(health.odometer.addedKm)} em viagens
              </span>
            )}
          </span>
          <span className="text-primary-strong text-sm font-semibold">Atualizar</span>
        </button>

        <div className="grid gap-3">
          {keyItems.map((h) => (
            <KeyItemCard key={h.item.id} h={h} onRegister={() => register(h.item.type, h.item.label)} />
          ))}
        </div>

        {(otherItems.length > 0 || health.insurance) && (
          <Section title="Outros itens">
            <ul className="bg-card divide-y overflow-hidden rounded-2xl border shadow-xs">
              {health.insurance && (
                <li className="flex items-center gap-3 px-4 py-3">
                  <ShieldCheck className="text-muted-foreground size-5 shrink-0" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-medium">Seguro</span>
                    <span className="text-muted-foreground block text-xs tabular-nums">
                      Vence em {formatDate(health.insurance.expiresOn)}
                      {health.insurance.daysLeft >= 0 && ` (${health.insurance.daysLeft} dias)`}
                    </span>
                  </span>
                  <HealthBadge status={health.insurance.status} />
                </li>
              )}
              {otherItems.map((h) => (
                <li key={h.item.id}>
                  <button
                    type="button"
                    onClick={() => register(h.item.type, h.item.label)}
                    className="active:bg-accent flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-medium">{h.item.label}</span>
                      <span className="text-muted-foreground block text-xs tabular-nums">{describeRemaining(h)}</span>
                    </span>
                    <HealthBadge status={h.status} />
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Planejadas">
          {health.planned.length ? (
            <ul className="bg-card divide-y overflow-hidden rounded-2xl border shadow-xs">
              {health.planned.map((p) => (
                <li key={p.maintenance.id}>
                  <button
                    type="button"
                    onClick={() => setSheet({ maintenance: p.maintenance })}
                    className="active:bg-accent flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <CalendarClock className="text-muted-foreground size-5 shrink-0" />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-medium">{maintenanceLabel(p.maintenance)}</span>
                      <span className="text-muted-foreground block text-xs tabular-nums">
                        {formatDate(p.maintenance.date)}
                        {p.maintenance.cost > 0 && ` · ${formatCurrency(p.maintenance.cost)}`}
                      </span>
                    </span>
                    <HealthBadge status={p.status} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground px-1 text-sm">Nenhuma manutenção planejada.</p>
          )}
        </Section>

        <Section title="Histórico de manutenções">
          {health.history.length ? (
            <ul className="bg-card divide-y overflow-hidden rounded-2xl border shadow-xs">
              {health.history.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSheet({ maintenance: m })}
                    className="active:bg-accent flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block truncate font-medium">{maintenanceLabel(m)}</span>
                      <span className="text-muted-foreground block text-xs tabular-nums">
                        {formatDate(m.date)}
                        {m.odometerKm !== null && ` · ${formatKm(m.odometerKm)}`}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(m.cost)}</span>
                    <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground px-1 text-sm">Nenhuma manutenção registrada ainda.</p>
          )}
        </Section>
      </div>

      {/* Ação principal na zona do polegar */}
      <div className="bg-background/95 sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 mt-6 px-4 py-3 backdrop-blur">
        <Button size="lg" className="w-full" onClick={() => setSheet({ defaults: { status: "done" } })}>
          <Plus /> Registrar manutenção
        </Button>
      </div>

      <MaintenanceSheet vehicleId={id} currentKm={currentKm} state={sheet} onClose={() => setSheet(null)} />
      <OdometerSheet vehicleId={id} currentKm={currentKm} open={odometerOpen} onOpenChange={setOdometerOpen} />
    </>
  );
}

function OdometerSheet({
  vehicleId,
  currentKm,
  open,
  onOpenChange,
}: {
  vehicleId: string;
  currentKm: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>KM atual do veículo</SheetTitle>
        <SheetDescription>Olhe o painel e informe o KM. As próximas viagens somam a partir dele.</SheetDescription>
        {open && <OdometerForm vehicleId={vehicleId} currentKm={currentKm} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function OdometerForm({ vehicleId, currentKm, onDone }: { vehicleId: string; currentKm: number | null; onDone: () => void }) {
  const { updateVehicle } = useData();
  const [value, setValue] = useState(currentKm ? String(currentKm) : "");
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const km = parseDecimal(value);
    if (!(km > 0)) return setError("Informe o KM do painel");
    await updateVehicle(vehicleId, { odometer: { km, date: todayISO() } });
    toast.success("KM atualizado");
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <AmountInput
        id="odometer"
        suffix="km"
        aria-label="KM atual"
        value={value}
        error={error}
        enterKeyHint="done"
        onChange={(e) => {
          setValue(e.target.value);
          setError(undefined);
        }}
      />
      <Button type="submit" size="lg">
        Salvar KM
      </Button>
    </form>
  );
}
