import { parseDecimal } from "@/lib/format";

export const STEPS = [
  { id: "vehicle", label: "Veículo", title: "Qual veículo você usou?" },
  { id: "revenue", label: "Receita", title: "Quanto você recebeu pelo frete?" },
  { id: "km", label: "KM", title: "Quantos km você rodou?" },
  { id: "fuel", label: "Combustível", title: "Quanto abasteceu?" },
  { id: "tolls", label: "Pedágio", title: "Quanto gastou com pedágio?" },
  { id: "helper", label: "Ajudante", title: "Quanto pagou ao ajudante?" },
  { id: "other", label: "Outros custos", title: "Teve outros custos?" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export const NUMERIC_FIELDS = [
  "freightRevenue",
  "km",
  "fuelLiters",
  "fuelPricePerLiter",
  "tolls",
  "helperPayment",
  "otherCosts",
] as const;

export type NumericField = (typeof NUMERIC_FIELDS)[number];
export type WizardValues = Record<NumericField, string> & { date: string; vehicleId: string };
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

const invalid = (n: number) => Number.isNaN(n) || n < 0;

export function validateStep(step: StepId, values: WizardValues, n: WizardNumbers): WizardErrors {
  const errors: WizardErrors = {};
  switch (step) {
    case "vehicle":
      if (!values.date) errors.date = "Informe a data da viagem";
      break;
    case "revenue":
      if (invalid(n.freightRevenue) || n.freightRevenue <= 0) errors.freightRevenue = "Informe um valor maior que zero";
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
