import { round2 } from "./trip";
import type { RealPeriodSummary } from "./real-cost";

export type CostCategory = "fuel" | "tolls" | "helper" | "other" | "fixed" | "maintenance" | "wear";

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  fuel: "Combustível",
  tolls: "Pedágios",
  helper: "Ajudante",
  other: "Outros custos",
  fixed: "Custos fixos",
  maintenance: "Manutenções",
  wear: "Desgaste (vida útil)",
};

/** Categorias operacionais (aparecem na viagem) vs. as que só o custo real enxerga. */
export const OPERATIONAL_CATEGORIES: CostCategory[] = ["fuel", "tolls", "helper", "other"];

export interface CostBreakdownItem {
  category: CostCategory;
  label: string;
  value: number;
  /** Participação no custo real total, 0–100 */
  share: number;
  perKm: number;
}

export interface CostBreakdown {
  items: CostBreakdownItem[];
  total: number;
  km: number;
  costPerKm: number;
}

/** Composição do custo real de um período, em valor, % e R$/km. */
export function calculateCostBreakdown(s: RealPeriodSummary): CostBreakdown {
  const values: Record<CostCategory, number> = {
    fuel: s.fuelCost,
    tolls: s.tolls,
    helper: s.helper,
    other: s.other,
    fixed: s.fixedCosts,
    maintenance: s.maintenanceCosts,
    wear: s.wearCosts,
  };
  const total = s.realCosts;

  return {
    total,
    km: s.km,
    costPerKm: s.realCostPerKm,
    items: (Object.keys(values) as CostCategory[]).map((category) => ({
      category,
      label: COST_CATEGORY_LABELS[category],
      value: round2(values[category]),
      share: total > 0 ? Math.round((values[category] / total) * 1000) / 10 : 0,
      perKm: s.km > 0 ? round2(values[category] / s.km) : 0,
    })),
  };
}
