"use client";

import { useState, type FormEvent } from "react";
import { Field, NumberField, TextField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { DEFAULT_MONTHLY_KM, FUEL_TYPE_OPTIONS } from "@/lib/constants";
import { formatNumber, parseDecimal } from "@/lib/format";
import type { FuelType, Vehicle, VehicleInput } from "@/types";

/** Dados básicos editados neste formulário (custos e vida útil têm telas próprias). */
export type VehicleBasics = Pick<VehicleInput, "name" | "model" | "fuelType" | "kmPerLiter" | "estimatedMonthlyKm"> & {
  /** KM atual informado (null = não informado) */
  odometerKm: number | null;
};

type Errors = Partial<Record<keyof VehicleBasics, string>>;

interface VehicleFormProps {
  initialValues?: Vehicle;
  /** KM atual estimado, para pré-preencher na edição */
  currentKm?: number | null;
  submitLabel: string;
  onSubmit: (input: VehicleBasics) => Promise<void>;
}

const toInput = (n: number | null | undefined) => (n ? formatNumber(n).replace(/\./g, "") : undefined);

export function VehicleForm({ initialValues, currentKm, submitLabel, onSubmit }: VehicleFormProps) {
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const odometerText = String(data.get("odometerKm") ?? "").trim();
    const input: VehicleBasics = {
      name: String(data.get("name") ?? "").trim(),
      model: String(data.get("model") ?? "").trim(),
      fuelType: String(data.get("fuelType")) as FuelType,
      kmPerLiter: parseDecimal(String(data.get("kmPerLiter") ?? "")),
      estimatedMonthlyKm: parseDecimal(String(data.get("estimatedMonthlyKm") ?? "")),
      odometerKm: odometerText ? parseDecimal(odometerText) : null,
    };

    const nextErrors: Errors = {
      name: input.name ? undefined : "Informe um nome",
      model: input.model ? undefined : "Informe o modelo",
      kmPerLiter: input.kmPerLiter > 0 ? undefined : "Informe uma média válida",
      estimatedMonthlyKm: input.estimatedMonthlyKm > 0 ? undefined : "Informe quantos km roda por mês",
      odometerKm: input.odometerKm === null || input.odometerKm >= 0 ? undefined : "KM inválido",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setPending(true);
    try {
      await onSubmit(input);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <TextField id="name" label="Nome" placeholder="Ex.: HR Branca" defaultValue={initialValues?.name} error={errors.name} />
      <TextField
        id="model"
        label="Modelo"
        placeholder="Ex.: Hyundai HR 2.5"
        defaultValue={initialValues?.model}
        error={errors.model}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field id="fuelType" label="Combustível">
          <NativeSelect id="fuelType" name="fuelType" defaultValue={initialValues?.fuelType ?? "diesel_s10"}>
            {FUEL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <NumberField
          id="kmPerLiter"
          label="Consumo"
          suffix="km/l"
          defaultValue={initialValues ? formatNumber(initialValues.kmPerLiter) : undefined}
          error={errors.kmPerLiter}
        />
      </div>
      <NumberField
        id="estimatedMonthlyKm"
        label="KM rodados por mês (média)"
        suffix="km"
        defaultValue={toInput(initialValues?.estimatedMonthlyKm ?? DEFAULT_MONTHLY_KM)}
        hint="Usado para ratear os custos fixos até haver 30 dias de viagens registradas."
        error={errors.estimatedMonthlyKm}
      />
      <NumberField
        id="odometerKm"
        label="KM atual do veículo (opcional)"
        suffix="km"
        placeholder="Ex.: 85000"
        defaultValue={toInput(currentKm)}
        hint="Com ele o app avisa trocas de óleo, pneus e revisões."
        error={errors.odometerKm}
      />
      <Button type="submit" size="lg" className="mt-2" disabled={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
