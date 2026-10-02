"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { NumberField, TextField } from "@/components/shared/form-field";
import { MetricGrid } from "@/components/shared/metric-grid";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { monthlyFixedCost } from "@/lib/calculations/real-cost";
import { formatCurrency, formatCurrencyPerKm, formatNumber, parseDecimal } from "@/lib/format";
import { useData } from "@/providers/data-provider";
import type { Vehicle, VehicleFixedCosts } from "@/types";

type NumericKey = Exclude<keyof VehicleFixedCosts, "insuranceExpiresOn">;

const ANNUAL: { key: NumericKey; label: string }[] = [
  { key: "insuranceAnnual", label: "Seguro" },
  { key: "ipvaAnnual", label: "IPVA" },
  { key: "licensingAnnual", label: "Licenciamento" },
];

const MONTHLY: { key: NumericKey; label: string }[] = [
  { key: "financingMonthly", label: "Parcela do veículo" },
  { key: "trackerMonthly", label: "Rastreador" },
  { key: "phoneMonthly", label: "Internet / telefone" },
  { key: "otherMonthly", label: "Outros custos fixos" },
];

const toInput = (n: number) => (n ? formatNumber(n).replace(/\./g, "") : "");

interface FixedCostsSheetProps {
  vehicle: Vehicle;
  /** KM médio mensal usado no rateio */
  monthlyKm: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FixedCostsSheet({ vehicle, monthlyKm, open, onOpenChange }: FixedCostsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Custos fixos</SheetTitle>
        <SheetDescription>Existem com o veículo rodando ou parado. Deixe em branco o que não tiver.</SheetDescription>
        {open && <FixedCostsForm vehicle={vehicle} monthlyKm={monthlyKm} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function FixedCostsForm({ vehicle, monthlyKm, onDone }: { vehicle: Vehicle; monthlyKm: number; onDone: () => void }) {
  const { updateVehicle } = useData();
  const [values, setValues] = useState<Record<NumericKey, string>>(
    () =>
      Object.fromEntries([...ANNUAL, ...MONTHLY].map(({ key }) => [key, toInput(vehicle.fixedCosts[key])])) as Record<
        NumericKey,
        string
      >,
  );
  const [expiresOn, setExpiresOn] = useState(vehicle.fixedCosts.insuranceExpiresOn ?? "");
  const [pending, setPending] = useState(false);

  const parsed = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, Math.max(0, parseDecimal(v) || 0)]),
  ) as Record<NumericKey, number>;
  const costs: VehicleFixedCosts = { ...parsed, insuranceExpiresOn: expiresOn || null };
  const monthly = monthlyFixedCost(costs);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await updateVehicle(vehicle.id, { fixedCosts: costs });
      toast.success("Custos fixos atualizados");
      onDone();
    } finally {
      setPending(false);
    }
  }

  const field = ({ key, label }: { key: NumericKey; label: string }) => (
    <NumberField
      key={key}
      id={key}
      label={label}
      prefix="R$"
      value={values[key]}
      onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
    />
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <fieldset className="grid gap-3">
        <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">Por ano</legend>
        <div className="grid grid-cols-2 gap-3">{ANNUAL.slice(0, 2).map(field)}</div>
        <div className="grid grid-cols-2 gap-3">
          {field(ANNUAL[2])}
          <TextField
            id="insuranceExpiresOn"
            label="Vencimento seguro"
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
          />
        </div>
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">Por mês</legend>
        <div className="grid grid-cols-2 gap-3">{MONTHLY.map(field)}</div>
      </fieldset>

      <div className="bg-muted/40 overflow-hidden rounded-2xl border">
        <MetricGrid
          items={[
            { label: "Por mês", value: formatCurrency(monthly) },
            { label: "Por ano", value: formatCurrency(monthly * 12) },
            { label: "Por km", value: formatCurrencyPerKm(monthlyKm > 0 ? monthly / monthlyKm : 0) },
          ]}
        />
        <p className="text-muted-foreground border-t px-4 py-2 text-xs">
          Rateio sobre {formatNumber(monthlyKm)} km/mês.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar custos fixos"}
      </Button>
    </form>
  );
}
