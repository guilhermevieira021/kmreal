/**
 * Custo real por km = custo operacional da viagem + custos que não aparecem na viagem:
 *
 *  - Fixos:       (anuais ÷ 12 + mensais) ÷ KM médio mensal do veículo
 *  - Desgaste:    Σ (valor ÷ vida útil em km) dos itens de vida útil
 *  - Manutenções: gasto realizado nos últimos 12 meses com tipos SEM item de vida útil
 *                 (os tipos com vida útil já entram como desgaste — evita contar duas vezes)
 *
 * Tudo vira uma taxa R$/km por veículo, aplicada a cada viagem. Por isso o lucro real de
 * uma viagem, de um mês ou de um relatório sempre fecha com a soma das partes.
 */
import { DEFAULT_MONTHLY_KM } from "@/lib/constants";
import { addDays, toISODate } from "@/lib/dates";
import type { Maintenance, Trip, TripCosts, Vehicle, VehicleFixedCosts, WearItem } from "@/types";
import { calculateTripSummary, round2 } from "./trip";

const AVG_DAYS_PER_MONTH = 30.44;
/** Janela usada para medir o KM médio mensal real */
const KM_WINDOW_DAYS = 90;
/** Histórico mínimo (dias entre a 1ª viagem da janela e hoje) para confiar no KM real */
const MIN_HISTORY_DAYS = 30;
const MAINTENANCE_WINDOW_DAYS = 365;

const per = (value: number, km: number) => (km > 0 ? value / km : 0);

export function monthlyFixedCost(c: VehicleFixedCosts): number {
  return round2(
    (c.insuranceAnnual + c.ipvaAnnual + c.licensingAnnual) / 12 +
      c.financingMonthly +
      c.trackerMonthly +
      c.phoneMonthly +
      c.otherMonthly,
  );
}

export const wearItemPerKm = (item: Pick<WearItem, "cost" | "lifespanKm">) => per(item.cost, item.lifespanKm);

export const wearRatePerKm = (items: WearItem[]) => items.reduce((sum, i) => sum + wearItemPerKm(i), 0);

/** Tipos cobertos por um item de vida útil ("Outro" nunca cobre: é livre demais). */
export function coveredTypes(items: WearItem[]): Set<string> {
  return new Set(items.filter((i) => i.type !== "other" && i.cost > 0).map((i) => i.type));
}

export interface MonthlyKmReference {
  km: number;
  basis: "history" | "estimate";
}

/** KM médio mensal: histórico dos últimos 90 dias (com ≥ 30 dias de dados) ou a estimativa do cadastro. */
export function referenceMonthlyKm(vehicle: Vehicle, trips: Trip[], now: Date = new Date()): MonthlyKmReference {
  const today = toISODate(now);
  const start = addDays(today, -(KM_WINDOW_DAYS - 1));
  const inWindow = trips.filter((t) => t.vehicleId === vehicle.id && t.date >= start && t.date <= today);
  const first = inWindow.reduce<string | null>((min, t) => (!min || t.date < min ? t.date : min), null);

  if (first) {
    const days = Math.round((new Date(today).getTime() - new Date(first).getTime()) / 86_400_000) + 1;
    if (days >= MIN_HISTORY_DAYS) {
      const km = inWindow.reduce((sum, t) => sum + t.km, 0);
      return { km: Math.round((km / days) * AVG_DAYS_PER_MONTH), basis: "history" };
    }
  }
  return { km: vehicle.estimatedMonthlyKm || DEFAULT_MONTHLY_KM, basis: "estimate" };
}

export interface VehicleCostRates {
  vehicleId: string;
  monthlyFixed: number;
  annualFixed: number;
  monthlyKm: MonthlyKmReference;
  fixedPerKm: number;
  wearPerKm: number;
  maintenancePerKm: number;
  /** Fixos + desgaste + manutenções */
  overheadPerKm: number;
}

export type CostRates = Map<string, VehicleCostRates>;

export function buildVehicleRates(
  vehicle: Vehicle,
  trips: Trip[],
  maintenances: Maintenance[],
  now: Date = new Date(),
): VehicleCostRates {
  const monthlyFixed = monthlyFixedCost(vehicle.fixedCosts);
  const monthlyKm = referenceMonthlyKm(vehicle, trips, now);
  const fixedPerKm = per(monthlyFixed, monthlyKm.km);
  const wearPerKm = wearRatePerKm(vehicle.wearItems);

  // Manutenções avulsas (não cobertas por vida útil) dos últimos 12 meses ÷ km do mesmo período.
  const today = toISODate(now);
  const since = addDays(today, -MAINTENANCE_WINDOW_DAYS);
  const covered = coveredTypes(vehicle.wearItems);
  const spent = maintenances
    .filter((m) => m.vehicleId === vehicle.id && m.status === "done" && m.date >= since && m.date <= today)
    .filter((m) => !covered.has(m.type))
    .reduce((sum, m) => sum + m.cost, 0);
  const kmDriven = trips
    .filter((t) => t.vehicleId === vehicle.id && t.date >= since && t.date <= today)
    .reduce((sum, t) => sum + t.km, 0);
  // Pouco histórico: usa ao menos um ano de KM estimado para não inflar a taxa.
  const maintenancePerKm = per(spent, Math.max(kmDriven, monthlyKm.km * 12));

  return {
    vehicleId: vehicle.id,
    monthlyFixed,
    annualFixed: round2(monthlyFixed * 12),
    monthlyKm,
    fixedPerKm,
    wearPerKm,
    maintenancePerKm,
    overheadPerKm: fixedPerKm + wearPerKm + maintenancePerKm,
  };
}

export function buildCostRates(vehicles: Vehicle[], trips: Trip[], maintenances: Maintenance[], now?: Date): CostRates {
  return new Map(vehicles.map((v) => [v.id, buildVehicleRates(v, trips, maintenances, now)]));
}

/* ---------- Viagem ---------- */

export interface RealMetrics {
  revenuePerKm: number;
  operationalCostPerKm: number;
  realCostPerKm: number;
  realProfitPerKm: number;
  /** Margem real em % da receita */
  realMargin: number;
}

export interface RealCostParts {
  operationalCosts: number;
  fixedCosts: number;
  wearCosts: number;
  maintenanceCosts: number;
  realCosts: number;
  realProfit: number;
}

export interface RealTripSummary extends RealCostParts, RealMetrics {
  revenue: number;
  km: number;
  fuelCost: number;
  /** Lucro antes dos custos fixos e de manutenção */
  operationalProfit: number;
}

export function calculateRealMetrics(revenue: number, operationalCosts: number, realCosts: number, km: number): RealMetrics {
  const realProfit = revenue - realCosts;
  return {
    revenuePerKm: round2(per(revenue, km)),
    operationalCostPerKm: round2(per(operationalCosts, km)),
    realCostPerKm: round2(per(realCosts, km)),
    realProfitPerKm: round2(per(realProfit, km)),
    realMargin: revenue > 0 ? Math.round((realProfit / revenue) * 1000) / 10 : 0,
  };
}

type TripLike = Pick<Trip, "freightRevenue" | "km" | "vehicleId"> & TripCosts;

/** Resumo real de uma viagem. Sem veículo vinculado, só há custo operacional. */
export function calculateRealTrip(trip: TripLike, rates: CostRates): RealTripSummary {
  const op = calculateTripSummary(trip);
  const r = trip.vehicleId ? rates.get(trip.vehicleId) : undefined;
  const fixedCosts = r ? r.fixedPerKm * trip.km : 0;
  const wearCosts = r ? r.wearPerKm * trip.km : 0;
  const maintenanceCosts = r ? r.maintenancePerKm * trip.km : 0;
  const realCosts = op.totalCosts + fixedCosts + wearCosts + maintenanceCosts;

  return {
    revenue: op.totalRevenue,
    km: trip.km,
    fuelCost: op.fuelCost,
    operationalCosts: op.totalCosts,
    operationalProfit: op.netProfit,
    fixedCosts: round2(fixedCosts),
    wearCosts: round2(wearCosts),
    maintenanceCosts: round2(maintenanceCosts),
    realCosts: round2(realCosts),
    realProfit: round2(op.totalRevenue - realCosts),
    ...calculateRealMetrics(op.totalRevenue, op.totalCosts, realCosts, trip.km),
  };
}

/* ---------- Período ---------- */

export interface RealPeriodSummary extends RealCostParts, RealMetrics {
  revenue: number;
  km: number;
  tripCount: number;
  fuelCost: number;
  tolls: number;
  helper: number;
  other: number;
}

export function summarizeReal(trips: Trip[], rates: CostRates): RealPeriodSummary {
  const acc = {
    revenue: 0,
    km: 0,
    fuelCost: 0,
    tolls: 0,
    helper: 0,
    other: 0,
    operationalCosts: 0,
    fixedCosts: 0,
    wearCosts: 0,
    maintenanceCosts: 0,
    realCosts: 0,
  };
  for (const trip of trips) {
    const s = calculateRealTrip(trip, rates);
    acc.revenue += s.revenue;
    acc.km += s.km;
    acc.fuelCost += s.fuelCost;
    acc.tolls += trip.tolls;
    acc.helper += trip.helperPayment;
    acc.other += trip.otherCosts;
    acc.operationalCosts += s.operationalCosts;
    acc.fixedCosts += s.fixedCosts;
    acc.wearCosts += s.wearCosts;
    acc.maintenanceCosts += s.maintenanceCosts;
    acc.realCosts += s.realCosts;
  }
  const rounded = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, round2(v)])) as typeof acc;
  return {
    ...rounded,
    tripCount: trips.length,
    realProfit: round2(acc.revenue - acc.realCosts),
    ...calculateRealMetrics(acc.revenue, acc.operationalCosts, acc.realCosts, acc.km),
  };
}
