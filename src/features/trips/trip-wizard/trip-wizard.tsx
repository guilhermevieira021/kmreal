"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Fuel, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { AmountInput } from "@/components/shared/amount-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Money } from "@/components/shared/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VehiclePicker } from "@/features/vehicles/vehicle-picker";
import { useData } from "@/providers/data-provider";
import { calculateRealTrip, type CostRates } from "@/lib/calculations/real-cost";
import { calculateFuelCost } from "@/lib/calculations/trip";
import { formatCurrency, formatNumber, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Trip, TripInput, Vehicle } from "@/types";
import { TripResults } from "../trip-results";
import type { TripWizardInitial } from "./prefill";
import {
  OPTIONAL_STEP_FIELD,
  STEPS,
  safe,
  toNumbers,
  validateStep,
  type WizardErrors,
  type WizardValues,
} from "./steps";

interface TripWizardProps {
  vehicles: Vehicle[];
  /** Viagens anteriores, usadas para sugerir o preço do combustível */
  recentTrips: Trip[];
  costRates: CostRates;
  /** Pré-preenchimento parcial (simulador, "repetir viagem") */
  initial?: TripWizardInitial;
  /** Viagem existente: ativa o modo edição */
  editing?: Trip;
  /** Para onde voltar ao fechar */
  closeHref: string;
  onSubmit: (input: TripInput) => Promise<void>;
}

const toInput = (n: number) => (n ? formatNumber(n).replace(/\./g, "") : "");

function initialValues(vehicles: Vehicle[], recentTrips: Trip[], initial?: TripWizardInitial, editing?: Trip): WizardValues {
  if (editing) {
    return {
      date: editing.date,
      vehicleId: editing.vehicleId ?? "",
      freightRevenue: toInput(editing.freightRevenue),
      km: toInput(editing.km),
      fuelLiters: toInput(editing.fuelLiters),
      fuelPricePerLiter: editing.fuelPricePerLiter ? editing.fuelPricePerLiter.toFixed(2).replace(".", ",") : "",
      tolls: toInput(editing.tolls),
      helperPayment: toInput(editing.helperPayment),
      otherCosts: toInput(editing.otherCosts),
    };
  }
  const lastPrice = recentTrips.find((t) => t.fuelPricePerLiter > 0)?.fuelPricePerLiter;
  const vehicleId =
    initial?.vehicleId && vehicles.some((v) => v.id === initial.vehicleId) ? initial.vehicleId : (vehicles[0]?.id ?? "");
  return {
    date: todayISO(),
    vehicleId,
    freightRevenue: initial?.freightRevenue ?? "",
    km: initial?.km ?? "",
    fuelLiters: "",
    fuelPricePerLiter: lastPrice ? lastPrice.toFixed(2).replace(".", ",") : "",
    tolls: initial?.tolls ?? "",
    helperPayment: initial?.helperPayment ?? "",
    otherCosts: "",
  };
}

export function TripWizard({ vehicles, recentTrips, costRates, initial, editing, closeHref, onSubmit }: TripWizardProps) {
  const router = useRouter();
  const { isPro } = useData();
  const isEdit = Boolean(editing);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<WizardErrors>({});
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<WizardValues>(() => initialValues(vehicles, recentTrips, initial, editing));
  const [startValues] = useState(values);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const numbers = useMemo(() => toNumbers(values), [values]);
  const summary = useMemo(
    () =>
      calculateRealTrip(
        {
          vehicleId: values.vehicleId || null,
          freightRevenue: safe(numbers.freightRevenue),
          km: safe(numbers.km),
          fuelLiters: safe(numbers.fuelLiters),
          fuelPricePerLiter: safe(numbers.fuelPricePerLiter),
          tolls: safe(numbers.tolls),
          helperPayment: safe(numbers.helperPayment),
          otherCosts: safe(numbers.otherCosts),
        },
        costRates,
      ),
    [numbers, values.vehicleId, costRates],
  );

  const vehicle = vehicles.find((v) => v.id === values.vehicleId);
  const estimatedLiters = vehicle && safe(numbers.km) ? Math.round((numbers.km / vehicle.kmPerLiter) * 10) / 10 : 0;
  const fuelCost = calculateFuelCost({
    fuelLiters: safe(numbers.fuelLiters),
    fuelPricePerLiter: safe(numbers.fuelPricePerLiter),
  });
  const isDirty = (Object.keys(values) as (keyof WizardValues)[]).some((k) => values[k] !== startValues[k]);

  const optionalField = OPTIONAL_STEP_FIELD[step.id];
  const canSkip = optionalField && !values[optionalField].trim();

  function setField(field: keyof WizardValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function bindAmount(field: keyof WizardValues) {
    return {
      value: values[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setField(field, e.target.value),
      error: errors[field],
      enterKeyHint: isLast || isEdit ? ("done" as const) : ("next" as const),
    };
  }

  function goTo(index: number) {
    setErrors({});
    setStepIndex(index);
    window.scrollTo({ top: 0 });
  }

  async function save() {
    // Valida todas as etapas; leva o motorista direto à primeira com problema.
    for (let i = 0; i < STEPS.length; i++) {
      const stepErrors = validateStep(STEPS[i].id, values, numbers);
      if (Object.keys(stepErrors).length) {
        setStepIndex(i);
        setErrors(stepErrors);
        return;
      }
    }
    setPending(true);
    try {
      await onSubmit({ date: values.date, vehicleId: values.vehicleId || null, ...numbers });
    } catch {
      toast.error("Não foi possível salvar a viagem");
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isEdit || isLast) return void save();
    const stepErrors = validateStep(step.id, values, numbers);
    if (Object.keys(stepErrors).length) return setErrors(stepErrors);
    goTo(stepIndex + 1);
  }

  function handleSelectVehicle(id: string) {
    setField("vehicleId", id);
    // Avança sozinho na criação: a escolha do veículo é a única ação da etapa.
    if (!isEdit) setTimeout(() => goTo(1), 150);
  }

  const closeButton = (
    <Button type="button" variant="ghost" size="icon" aria-label="Fechar" className="-ml-2">
      <X className="size-6" />
    </Button>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-dvh flex-col">
      {/* Cabeçalho + progresso */}
      <header className="bg-background/95 sticky top-0 z-10 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur">
        <div className="flex h-12 items-center gap-2">
          {isDirty ? (
            <ConfirmDialog
              trigger={closeButton}
              title={isEdit ? "Descartar alterações?" : "Descartar viagem?"}
              description={isEdit ? "As mudanças não salvas serão perdidas." : "Os dados preenchidos serão perdidos."}
              confirmLabel="Descartar"
              onConfirm={() => router.push(closeHref)}
            />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fechar"
              className="-ml-2"
              onClick={() => router.push(closeHref)}
            >
              <X className="size-6" />
            </Button>
          )}
          <p className="flex-1 text-center font-semibold">{isEdit ? "Editar viagem" : "Nova viagem"}</p>
          <span className="text-muted-foreground w-10 text-right text-sm tabular-nums">
            {stepIndex + 1}/{STEPS.length}
          </span>
        </div>
        <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}>
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                aria-label={`Etapa ${i + 1}: ${s.label}`}
                aria-current={i === stepIndex ? "step" : undefined}
                // Na edição, qualquer etapa é acessível; na criação, só as já vistas.
                disabled={!isEdit && i >= stepIndex}
                onClick={() => goTo(i)}
                className="flex h-6 w-full items-center"
              >
                <span
                  className={cn(
                    "block h-1.5 w-full rounded-full transition-colors",
                    i === stepIndex || (!isEdit && i < stepIndex) ? "bg-primary" : isEdit ? "bg-primary/25" : "bg-muted",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
      </header>

      {/* Etapa atual */}
      <div key={step.id} className="animate-in fade-in slide-in-from-right-4 flex-1 px-4 pt-3 duration-200">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{step.label}</p>
        <h1 className="mt-1 mb-5 text-2xl font-semibold tracking-tight">{step.title}</h1>

        {step.id === "vehicle" && (
          <div className="grid gap-5">
            <VehiclePicker vehicles={vehicles} value={values.vehicleId} onSelect={handleSelectVehicle} allowNone />
            <div className="grid gap-2">
              <label htmlFor="date" className="text-sm font-medium">
                Data da viagem
              </label>
              <Input
                id="date"
                type="date"
                value={values.date}
                max={todayISO()}
                onChange={(e) => setField("date", e.target.value)}
                aria-invalid={!!errors.date || undefined}
              />
              {errors.date && <p className="text-destructive text-sm">{errors.date}</p>}
            </div>
          </div>
        )}

        {step.id === "revenue" && (
          <AmountInput id="freightRevenue" prefix="R$" autoFocus aria-label={step.title} {...bindAmount("freightRevenue")} />
        )}

        {step.id === "km" && <AmountInput id="km" suffix="km" autoFocus aria-label={step.title} {...bindAmount("km")} />}

        {step.id === "fuel" && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="fuelLiters" className="text-sm font-medium">
                Litros abastecidos
              </label>
              <AmountInput id="fuelLiters" suffix="L" autoFocus {...bindAmount("fuelLiters")} />
              {estimatedLiters > 0 && (
                <button
                  type="button"
                  onClick={() => setField("fuelLiters", toInput(estimatedLiters))}
                  className="bg-muted/70 text-foreground flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm"
                >
                  <Sparkles className="size-4 shrink-0" />
                  <span className="flex-1">
                    Pela média do {vehicle?.name}: <strong>~{formatNumber(estimatedLiters)} L</strong>
                  </span>
                  <span className="font-semibold underline underline-offset-2">Usar</span>
                </button>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="fuelPricePerLiter" className="text-sm font-medium">
                Preço do litro
              </label>
              <AmountInput id="fuelPricePerLiter" prefix="R$" {...bindAmount("fuelPricePerLiter")} />
            </div>
            {fuelCost > 0 && (
              <div className="flex items-center justify-between rounded-xl border px-4 py-3">
                <span className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Fuel className="size-4" /> Total combustível
                </span>
                <span className="font-semibold tabular-nums">{formatCurrency(fuelCost)}</span>
              </div>
            )}
          </div>
        )}

        {optionalField && (
          <div className="grid gap-2">
            <AmountInput id={optionalField} prefix="R$" autoFocus aria-label={step.title} {...bindAmount(optionalField)} />
            <p className="text-muted-foreground text-sm">Deixe em branco se não teve esse custo.</p>
          </div>
        )}

        {/* Resultado em tempo real */}
        <section aria-live="polite" className="mt-6 pb-4">
          <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">Resultado</h2>
          {summary.revenue > 0 ? (
            <TripResults summary={summary} />
          ) : (
            <div className="text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-center text-sm">
              O lucro aparece aqui conforme você preenche.
            </div>
          )}
        </section>
      </div>

      {/* Ações: na zona do polegar */}
      <footer className="bg-background/95 sticky bottom-0 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {summary.revenue > 0 && (
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{isPro ? "Lucro real" : "Lucro"}</span>
            <Money
              value={summary.realProfit}
              size="sm"
              suffix={` · ${formatCurrency(summary.realProfitPerKm)}/km`}
              className={summary.realProfit < 0 ? "text-destructive" : "text-positive"}
            />
          </div>
        )}
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-14 rounded-xl"
              aria-label="Etapa anterior"
              onClick={() => goTo(stepIndex - 1)}
            >
              <ArrowLeft className="size-5" />
            </Button>
          )}
          {isEdit ? (
            <>
              <Button type="submit" size="lg" className="flex-1" disabled={pending}>
                <Check /> {pending ? "Salvando..." : "Salvar alterações"}
              </Button>
              {!isLast && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-14 rounded-xl"
                  aria-label="Próxima etapa"
                  onClick={() => goTo(stepIndex + 1)}
                >
                  <ArrowRight className="size-5" />
                </Button>
              )}
            </>
          ) : (
            <Button type="submit" size="lg" className="flex-1" disabled={pending}>
              {isLast ? (
                <>
                  <Check /> {pending ? "Salvando..." : "Salvar viagem"}
                </>
              ) : (
                <>
                  {canSkip ? "Pular" : "Continuar"} <ArrowRight />
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </form>
  );
}
