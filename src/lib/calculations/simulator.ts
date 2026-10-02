import { REFERENCE_FUEL_PRICES, VERDICT_THRESHOLDS } from "@/lib/constants";
import type { Trip, Vehicle } from "@/types";
import { percentChange } from "./metrics";
import { calculateRealMetrics, summarizeReal, type CostRates, type RealMetrics, type VehicleCostRates } from "./real-cost";
import { round2, summarizeTrips } from "./trip";

export type CostBasis =
  | { kind: "history"; tripCount: number }
  | { kind: "consumption"; fuelPrice: number; kmPerLiter: number; priceSource: "last-trip" | "reference" };

export interface CostEstimate {
  costPerKm: number;
  basis: CostBasis;
}

/**
 * Estima o custo OPERACIONAL por km de um veículo.
 * 1) Com histórico: custo/km real das viagens desse veículo (combustível, pedágio, ajudante, outros).
 * 2) Sem histórico: só combustível, pela média km/l e o último preço pago (ou preço de referência).
 */
export function estimateOperationalCostPerKm(vehicle: Vehicle, trips: Trip[]): CostEstimate {
  const history = trips.filter((t) => t.vehicleId === vehicle.id && t.km > 0);
  if (history.length) {
    const s = summarizeTrips(history);
    return { costPerKm: round2(s.costs / s.km), basis: { kind: "history", tripCount: history.length } };
  }

  const lastPrice = trips.find((t) => t.fuelPricePerLiter > 0)?.fuelPricePerLiter;
  const fuelPrice = lastPrice ?? REFERENCE_FUEL_PRICES[vehicle.fuelType];
  return {
    costPerKm: round2(fuelPrice / vehicle.kmPerLiter),
    basis: {
      kind: "consumption",
      fuelPrice,
      kmPerLiter: vehicle.kmPerLiter,
      priceSource: lastPrice ? "last-trip" : "reference",
    },
  };
}

export interface FreightSimulation extends RealMetrics {
  revenue: number;
  operationalCost: number;
  /** Fixos + desgaste + manutenções rateados pelo KM do frete */
  overheadCost: number;
  realCost: number;
  realProfit: number;
  operationalProfit: number;
  basis: CostBasis;
  rates: VehicleCostRates | undefined;
  /** Preenchido só quando o tempo estimado é informado */
  realProfitPerHour: number | null;
}

interface SimulationInput {
  freight: number;
  km: number;
  vehicle: Vehicle;
  trips: Trip[];
  rates: CostRates;
  /** Tempo estimado da viagem em horas (opcional) */
  hours?: number;
}

export function simulateFreight({ freight, km, vehicle, trips, rates, hours }: SimulationInput): FreightSimulation {
  const { costPerKm, basis } = estimateOperationalCostPerKm(vehicle, trips);
  const vehicleRates = rates.get(vehicle.id);
  const operationalCost = round2(costPerKm * km);
  const overheadCost = round2((vehicleRates?.overheadPerKm ?? 0) * km);
  const realCost = round2(operationalCost + overheadCost);
  const realProfit = round2(freight - realCost);
  return {
    revenue: round2(freight),
    operationalCost,
    overheadCost,
    realCost,
    realProfit,
    operationalProfit: round2(freight - operationalCost),
    basis,
    rates: vehicleRates,
    realProfitPerHour: hours && hours > 0 ? round2(realProfit / hours) : null,
    ...calculateRealMetrics(freight, operationalCost, realCost, km),
  };
}

export type FreightVerdict = "good" | "low" | "loss";

/** Veredito sobre o lucro REAL: um frete que só paga o diesel não é viável. */
export function freightVerdict(realProfit: number, realMargin: number): FreightVerdict {
  if (realProfit < 0) return "loss";
  if (realMargin < VERDICT_THRESHOLDS.lowMargin) return "low";
  return "good";
}

export interface AverageBaseline {
  metrics: RealMetrics;
  tripCount: number;
  scope: "vehicle" | "all";
}

/** Média de referência: viagens do veículo; se não houver, todas as viagens. */
export function averageBaseline(vehicle: Vehicle, trips: Trip[], rates: CostRates): AverageBaseline | null {
  const own = trips.filter((t) => t.vehicleId === vehicle.id);
  const base = own.length ? own : trips;
  if (!base.length) return null;
  const s = summarizeReal(base, rates);
  return {
    metrics: s,
    tripCount: base.length,
    scope: own.length ? "vehicle" : "all",
  };
}

export interface ComparisonRow {
  key: keyof RealMetrics;
  label: string;
  current: number;
  average: number;
  /** Variação % do frete atual sobre a média */
  delta: number | null;
  /** true quando a variação é boa para o motorista (custo menor, receita/lucro maior) */
  favorable: boolean | null;
}

export function compareWithAverage(simulation: RealMetrics, baseline: RealMetrics): ComparisonRow[] {
  const rows: { key: keyof RealMetrics; label: string; higherIsBetter: boolean }[] = [
    { key: "revenuePerKm", label: "Receita/km", higherIsBetter: true },
    { key: "realCostPerKm", label: "Custo real/km", higherIsBetter: false },
    { key: "realProfitPerKm", label: "Lucro real/km", higherIsBetter: true },
  ];
  return rows.map(({ key, label, higherIsBetter }) => {
    const delta = percentChange(simulation[key], baseline[key]);
    return {
      key,
      label,
      current: simulation[key],
      average: baseline[key],
      delta,
      favorable: delta === null || delta === 0 ? null : delta > 0 === higherIsBetter,
    };
  });
}
