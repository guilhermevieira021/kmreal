import { revenueFromPricePerKm } from "@/lib/calculations/trip";
import { parseDecimal } from "@/lib/format";
import type { PaymentType } from "@/types";

export const STEPS = [
  { id: "payment", label: "Pagamento", title: "Como você foi pago?" },
  { id: "vehicle", label: "Veículo", title: "Qual veículo você usou?" },
  { id: "revenue", label: "Receita", title: "Quanto você recebeu?" },
  { id: "km", label: "KM", title: "Quantos km você rodou?" },
  { id: "fuel", label: "Combustível", title: "Quanto abasteceu?" },
  { id: "tolls", label: "Pedágio", title: "Quanto gastou com pedágio?" },
  { id: "helper", label: "Ajudante", title: "Quanto pagou ao ajudante?" },
  { id: "other", label: "Outros custos", title: "Teve outros custos?" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

/** Na etapa de receita, a pergunta depende de como o motorista foi pago. */
export function stepText(step: (typeof STEPS)[number], paymentType: PaymentType) {
  if (step.id === "revenue" && paymentType === "per_km") {
    return { label: "Valor por KM", title: "Qual valor combinado por KM?" };
  }
  return { label: step.label, title: step.title };
}

export const NUMERIC_FIELDS = [
  "freightRevenue",
  "pricePerKm",
  "km",
  "fuelLiters",
  "fuelPricePerLiter",
  "tolls",
  "helperPayment",
  "otherCosts",
] as const;

export type NumericField = (typeof NUMERIC_FIELDS)[number];
export type WizardValues = Record<NumericField, string> & {
  date: string;
  vehicleId: string;
  paymentType: PaymentType;
};
export type WizardErrors = Partial<Record<keyof WizardValues, string>>;
export type WizardNumbers = Record<NumericField, number>;

/** Etapas sem campo obrigatório: podem ser puladas com o valor vazio (= 0). */
export const OPTIONAL_STEP_FIELD: Partial<Record<StepId, NumericField>> = {
  tolls: "tolls",
  helper: "helperPayment",
  other: "otherCosts",
};

export function toNumbers(values: WizardValues): WizardNumbers {
  return Object.fromEntries(NUMERIC_FIELDS.map((f) => [f, parseDecimal(values[f])])) as WizardNumbers;
}

/** Número seguro para a prévia: inválido ou negativo vira 0. */
export const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Receita da viagem conforme a forma de pagamento.
 * Frete fechado: o valor informado. Valor por KM: valor combinado × km (ex.: 2,35 × 420 = 987,00).
 */
export function effectiveRevenue(paymentType: PaymentType, n: WizardNumbers): number {
  return paymentType === "per_km" ? revenueFromPricePerKm(safe(n.pricePerKm), safe(n.km)) : safe(n.freightRevenue);
}

const invalid = (n: number) => Number.isNaN(n) || n < 0;

export function validateStep(step: StepId, values: WizardValues, n: WizardNumbers): WizardErrors {
  const errors: WizardErrors = {};
  switch (step) {
    case "payment":
      break;
    case "vehicle":
      if (!values.date) errors.date = "Informe a data da viagem";
      break;
    case "revenue":
      if (values.paymentType === "per_km") {
        if (invalid(n.pricePerKm) || n.pricePerKm <= 0) errors.pricePerKm = "Informe o valor combinado por KM";
      } else if (invalid(n.freightRevenue) || n.freightRevenue <= 0) {
        errors.freightRevenue = "Informe um valor maior que zero";
      }
      break;
    case "km":
      if (invalid(n.km) || n.km <= 0) errors.km = "Informe a distância rodada";
      break;
    case "fuel":
      if (invalid(n.fuelLiters)) errors.fuelLiters = "Valor inválido";
      if (invalid(n.fuelPricePerLiter)) errors.fuelPricePerLiter = "Valor inválido";
      else if (n.fuelLiters > 0 && n.fuelPricePerLiter <= 0) errors.fuelPricePerLiter = "Informe o preço do litro";
      break;
    default: {
      const field = OPTIONAL_STEP_FIELD[step];
      if (field && invalid(n[field])) errors[field] = "Valor inválido";
    }
  }
  return errors;
}
