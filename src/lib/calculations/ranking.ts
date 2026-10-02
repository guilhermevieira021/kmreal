import type { Trip, Vehicle } from "@/types";
import { summarizeReal, type CostRates, type RealPeriodSummary } from "./real-cost";

export type RankingMetric = "profit" | "profitPerKm" | "revenuePerKm";

export const RANKING_METRIC_LABELS: Record<RankingMetric, string> = {
  profit: "Lucro real",
  profitPerKm: "Lucro real/km",
  revenuePerKm: "Receita/km",
};

export interface VehicleStats {
  vehicle: Vehicle;
  summary: RealPeriodSummary;
}

export function buildVehicleStats(vehicles: Vehicle[], trips: Trip[], rates: CostRates): VehicleStats[] {
  return vehicles.map((vehicle) => ({
    vehicle,
    summary: summarizeReal(
      trips.filter((t) => t.vehicleId === vehicle.id),
      rates,
    ),
  }));
}

export function metricValue({ summary }: VehicleStats, metric: RankingMetric): number {
  if (metric === "profit") return summary.realProfit;
  return metric === "profitPerKm" ? summary.realProfitPerKm : summary.revenuePerKm;
}

/** Ordena do melhor para o pior. Veículos sem viagens ficam fora do ranking. */
export function rankVehicles(stats: VehicleStats[], metric: RankingMetric): { ranked: VehicleStats[]; unranked: VehicleStats[] } {
  return {
    ranked: stats.filter((s) => s.summary.tripCount > 0).sort((a, b) => metricValue(b, metric) - metricValue(a, metric)),
    unranked: stats.filter((s) => s.summary.tripCount === 0),
  };
}
