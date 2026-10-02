import { HEALTH_THRESHOLDS, MAINTENANCE_TYPE_LABELS } from "@/lib/constants";
import { addDays, fromISODate, toISODate } from "@/lib/dates";
import { normalizeSearch } from "@/lib/format";
import type { Maintenance, MaintenanceType, Trip, Vehicle, WearItem } from "@/types";

export type HealthStatus = "ok" | "soon" | "overdue" | "unknown";

const STATUS_ORDER: Record<HealthStatus, number> = { overdue: 0, soon: 1, unknown: 2, ok: 3 };

export const worstStatus = (statuses: HealthStatus[]): HealthStatus =>
  statuses.reduce<HealthStatus>((worst, s) => (STATUS_ORDER[s] < STATUS_ORDER[worst] ? s : worst), "ok");

export interface OdometerEstimate {
  km: number;
  /** Data da última leitura conhecida (hodômetro informado ou manutenção) */
  readingDate: string;
  /** KM somado das viagens registradas depois da leitura */
  addedKm: number;
}

/**
 * KM atual estimado: última leitura conhecida (hodômetro ou manutenção realizada com KM)
 * + KM das viagens registradas depois dela.
 */
export function estimateOdometer(vehicle: Vehicle, maintenances: Maintenance[], trips: Trip[]): OdometerEstimate | null {
  const readings = [
    ...(vehicle.odometer ? [vehicle.odometer] : []),
    ...maintenances
      .filter((m) => m.vehicleId === vehicle.id && m.status === "done" && m.odometerKm !== null)
      .map((m) => ({ km: m.odometerKm as number, date: m.date })),
  ];
  if (!readings.length) return null;
  const latest = readings.reduce((a, b) => (b.date > a.date || (b.date === a.date && b.km > a.km) ? b : a));
  const addedKm = trips
    .filter((t) => t.vehicleId === vehicle.id && t.date > latest.date)
    .reduce((sum, t) => sum + t.km, 0);
  return { km: Math.round(latest.km + addedKm), readingDate: latest.date, addedKm };
}

function matchesItem(m: Maintenance, item: WearItem): boolean {
  if (m.type !== item.type) return false;
  return item.type !== "other" || normalizeSearch(m.description) === normalizeSearch(item.label);
}

export interface WearItemHealth {
  item: WearItem;
  status: HealthStatus;
  lastDone: Maintenance | null;
  dueKm: number | null;
  /** Negativo = atrasado */
  remainingKm: number | null;
  /** 0–100: quanto da vida útil já foi usada */
  usedShare: number | null;
}

export function wearItemHealth(
  item: WearItem,
  vehicle: Vehicle,
  maintenances: Maintenance[],
  odometer: OdometerEstimate | null,
): WearItemHealth {
  const lastDone =
    maintenances
      .filter((m) => m.vehicleId === vehicle.id && m.status === "done" && m.odometerKm !== null && matchesItem(m, item))
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

  if (!lastDone || !odometer || item.lifespanKm <= 0) {
    return { item, status: "unknown", lastDone, dueKm: null, remainingKm: null, usedShare: null };
  }

  const dueKm = (lastDone.odometerKm as number) + item.lifespanKm;
  const remainingKm = dueKm - odometer.km;
  const soonKm = Math.max(item.lifespanKm * HEALTH_THRESHOLDS.soonShare, HEALTH_THRESHOLDS.soonMinKm);
  const status: HealthStatus = remainingKm < 0 ? "overdue" : remainingKm <= soonKm ? "soon" : "ok";
  const usedShare = Math.min(100, Math.max(0, ((item.lifespanKm - remainingKm) / item.lifespanKm) * 100));
  return { item, status, lastDone, dueKm, remainingKm, usedShare };
}

export interface PlannedHealth {
  maintenance: Maintenance;
  status: HealthStatus;
  daysLeft: number;
  remainingKm: number | null;
}

/** Manutenção planejada: vence pela data ou pelo KM (o que chegar primeiro). */
export function plannedHealth(m: Maintenance, odometer: OdometerEstimate | null, now: Date = new Date()): PlannedHealth {
  const daysLeft = Math.round((fromISODate(m.date).getTime() - fromISODate(toISODate(now)).getTime()) / 86_400_000);
  const remainingKm = m.odometerKm !== null && odometer ? m.odometerKm - odometer.km : null;
  const overdue = daysLeft < 0 || (remainingKm !== null && remainingKm < 0);
  const soon =
    daysLeft <= HEALTH_THRESHOLDS.soonDays || (remainingKm !== null && remainingKm <= HEALTH_THRESHOLDS.soonMinKm * 2);
  return { maintenance: m, status: overdue ? "overdue" : soon ? "soon" : "ok", daysLeft, remainingKm };
}

/** Itens destacados no topo da saúde do veículo. */
export const KEY_ITEM_TYPES: MaintenanceType[] = ["oil", "tires", "service"];

export interface InsuranceHealth {
  status: HealthStatus;
  daysLeft: number;
  expiresOn: string;
}

export function insuranceHealth(vehicle: Vehicle, now: Date = new Date()): InsuranceHealth | null {
  const expiresOn = vehicle.fixedCosts.insuranceExpiresOn;
  if (!expiresOn) return null;
  const daysLeft = Math.round((fromISODate(expiresOn).getTime() - fromISODate(toISODate(now)).getTime()) / 86_400_000);
  const status: HealthStatus =
    daysLeft < 0 ? "overdue" : daysLeft <= HEALTH_THRESHOLDS.insuranceDays ? "soon" : "ok";
  return { status, daysLeft, expiresOn };
}

export interface VehicleHealth {
  vehicle: Vehicle;
  odometer: OdometerEstimate | null;
  items: WearItemHealth[];
  planned: PlannedHealth[];
  insurance: InsuranceHealth | null;
  history: Maintenance[];
  overall: HealthStatus;
}

export function buildVehicleHealth(
  vehicle: Vehicle,
  maintenances: Maintenance[],
  trips: Trip[],
  now: Date = new Date(),
): VehicleHealth {
  const own = maintenances.filter((m) => m.vehicleId === vehicle.id);
  const odometer = estimateOdometer(vehicle, own, trips);
  const items = vehicle.wearItems
    .map((item) => wearItemHealth(item, vehicle, own, odometer))
    .sort(
      (a, b) =>
        Number(!KEY_ITEM_TYPES.includes(a.item.type)) - Number(!KEY_ITEM_TYPES.includes(b.item.type)) ||
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
    );
  const planned = own
    .filter((m) => m.status === "planned")
    .map((m) => plannedHealth(m, odometer, now))
    .sort((a, b) => a.maintenance.date.localeCompare(b.maintenance.date));
  const insurance = insuranceHealth(vehicle, now);
  const history = own.filter((m) => m.status === "done").sort((a, b) => b.date.localeCompare(a.date));

  return {
    vehicle,
    odometer,
    items,
    planned,
    insurance,
    history,
    overall: worstStatus([
      ...items.filter((i) => i.status !== "unknown").map((i) => i.status),
      ...planned.map((p) => p.status),
      ...(insurance ? [insurance.status] : []),
    ]),
  };
}

export const maintenanceLabel = (m: Pick<Maintenance, "type" | "description">) =>
  m.type === "other" && m.description ? m.description : MAINTENANCE_TYPE_LABELS[m.type];

/** Data ISO daqui a N dias (para formulários de manutenção planejada). */
export const daysFromToday = (days: number) => addDays(toISODate(new Date()), days);
