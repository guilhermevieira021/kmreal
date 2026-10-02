import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Maintenance, Trip, UserSettings, Vehicle, VehicleFixedCosts } from "@/types";

/**
 * Conversão entre as linhas do Prisma e os tipos de domínio (src/types).
 * As telas continuam usando exatamente os mesmos tipos do protótipo.
 */

/** Decimal/number/null → number */
const num = (value: Prisma.Decimal | number | null | undefined) => (value == null ? 0 : Number(value));

/** Colunas @db.Date chegam como Date em UTC 00:00 → "YYYY-MM-DD" */
export const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);
export const toDbDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const meta = (row: { id: string; createdAt: Date; updatedAt: Date; deletedAt: Date | null }, userId: string) => ({
  id: row.id,
  userId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
});

export const vehicleInclude = {
  fixedCost: true,
  wearItems: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.VehicleInclude;

export type VehicleRow = Prisma.VehicleGetPayload<{ include: typeof vehicleInclude }>;

export function fixedCostsFromRow(row: VehicleRow["fixedCost"]): VehicleFixedCosts {
  return {
    insuranceAnnual: num(row?.insuranceAnnual),
    insuranceExpiresOn: row?.insuranceExpiresOn ? fromDbDate(row.insuranceExpiresOn) : null,
    ipvaAnnual: num(row?.ipvaAnnual),
    licensingAnnual: num(row?.licensingAnnual),
    financingMonthly: num(row?.financingMonthly),
    trackerMonthly: num(row?.trackerMonthly),
    phoneMonthly: num(row?.phoneMonthly),
    otherMonthly: num(row?.otherMonthly),
  };
}

export function fixedCostsToRow(c: VehicleFixedCosts) {
  return {
    insuranceAnnual: c.insuranceAnnual,
    insuranceExpiresOn: c.insuranceExpiresOn ? toDbDate(c.insuranceExpiresOn) : null,
    ipvaAnnual: c.ipvaAnnual,
    licensingAnnual: c.licensingAnnual,
    financingMonthly: c.financingMonthly,
    trackerMonthly: c.trackerMonthly,
    phoneMonthly: c.phoneMonthly,
    otherMonthly: c.otherMonthly,
  };
}

export function vehicleFromRow(row: VehicleRow): Vehicle {
  return {
    ...meta(row, row.userId),
    name: row.name,
    model: row.model,
    fuelType: row.fuelType,
    kmPerLiter: num(row.kmPerLiter),
    estimatedMonthlyKm: row.estimatedMonthlyKm,
    odometer:
      row.odometerKm !== null && row.odometerDate ? { km: row.odometerKm, date: fromDbDate(row.odometerDate) } : null,
    fixedCosts: fixedCostsFromRow(row.fixedCost),
    wearItems: row.wearItems.map((w) => ({
      id: w.id,
      type: w.type,
      label: w.label,
      cost: num(w.cost),
      lifespanKm: w.lifespanKm,
    })),
  };
}

export function tripFromRow(row: Prisma.TripModel): Trip {
  return {
    ...meta(row, row.userId),
    date: fromDbDate(row.date),
    vehicleId: row.vehicleId,
    freightRevenue: num(row.freightRevenue),
    km: num(row.km),
    fuelLiters: num(row.fuelLiters),
    fuelPricePerLiter: num(row.fuelPricePerLiter),
    tolls: num(row.tolls),
    helperPayment: num(row.helperPayment),
    otherCosts: num(row.otherCosts),
  };
}

export function maintenanceFromRow(row: Prisma.MaintenanceModel): Maintenance {
  return {
    ...meta(row, row.userId),
    vehicleId: row.vehicleId,
    type: row.type,
    description: row.description,
    status: row.status,
    date: fromDbDate(row.date),
    odometerKm: row.odometerKm,
    cost: num(row.cost),
  };
}

export function settingsFromRow(userId: string, row: Prisma.GoalModel | null): UserSettings {
  return {
    userId,
    monthlyProfitGoal: row?.monthlyProfitTarget == null ? null : num(row.monthlyProfitTarget),
    updatedAt: (row?.updatedAt ?? new Date(0)).toISOString(),
  };
}
