import type { DateRange } from "@/lib/dates";
import { filterByRange } from "@/lib/periods";
import type { Trip } from "@/types";
import { summarizeReal, type CostRates, type RealPeriodSummary } from "./real-cost";

/** Variação percentual. `null` quando não há base de comparação. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export interface WindowStats extends RealPeriodSummary {
  fuelCostPerKm: number;
}

/** Totais e indicadores reais das viagens dentro de um intervalo. */
export function statsForRange(trips: Trip[], range: DateRange, rates: CostRates): WindowStats {
  const s = summarizeReal(filterByRange(trips, range), rates);
  return { ...s, fuelCostPerKm: s.km > 0 ? s.fuelCost / s.km : 0 };
}
