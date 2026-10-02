import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ListOptions } from "@/services/types";
import type {
  Maintenance,
  MaintenanceInput,
  SettingsInput,
  Trip,
  TripInput,
  UserSettings,
  Vehicle,
  VehicleInput,
} from "@/types";
import { getDb } from "./db";
import { badRequest, notFound } from "./errors";
import {
  fixedCostsToRow,
  maintenanceFromRow,
  settingsFromRow,
  toDbDate,
  tripFromRow,
  vehicleFromRow,
  vehicleInclude,
} from "./mappers";

/**
 * Repositórios do servidor: mesmos contratos do cliente (src/services/types.ts),
 * mas sempre escopados ao usuário da sessão. Nenhuma consulta sai daqui sem `userId`.
 */

const listWhere = (userId: string, { updatedSince, includeDeleted }: ListOptions = {}) => ({
  userId,
  ...(includeDeleted ? {} : { deletedAt: null }),
  ...(updatedSince ? { updatedAt: { gt: new Date(updatedSince) } } : {}),
});

/** Garante que o veículo existe e é do usuário (inclusive excluídos, para manter o histórico editável). */
async function assertOwnedVehicle(userId: string, vehicleId: string) {
  const found = await getDb().vehicle.findFirst({ where: { id: vehicleId, userId }, select: { id: true } });
  if (!found) throw badRequest("Veículo inválido");
}

/* ---------- Veículos ---------- */

function vehicleScalars(input: Partial<VehicleInput>): Prisma.VehicleUpdateInput {
  return {
    name: input.name,
    model: input.model,
    fuelType: input.fuelType,
    kmPerLiter: input.kmPerLiter,
    estimatedMonthlyKm: input.estimatedMonthlyKm,
    ...(input.odometer !== undefined
      ? {
          odometerKm: input.odometer?.km ?? null,
          odometerDate: input.odometer ? toDbDate(input.odometer.date) : null,
        }
      : {}),
  };
}

/** Itens de vida útil ganham ids do servidor (nunca confiamos em ids vindos do cliente). */
const wearItemsCreate = (items: VehicleInput["wearItems"]) =>
  items.map(({ type, label, cost, lifespanKm }) => ({ type, label, cost, lifespanKm }));

export const vehicles = {
  async list(userId: string, options?: ListOptions): Promise<Vehicle[]> {
    const rows = await getDb().vehicle.findMany({
      where: listWhere(userId, options),
      include: vehicleInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(vehicleFromRow);
  },

  async get(userId: string, id: string): Promise<Vehicle | null> {
    const row = await getDb().vehicle.findFirst({ where: { id, userId, deletedAt: null }, include: vehicleInclude });
    return row ? vehicleFromRow(row) : null;
  },

  async create(userId: string, input: VehicleInput): Promise<Vehicle> {
    const row = await getDb().vehicle.create({
      data: {
        userId,
        name: input.name,
        model: input.model,
        fuelType: input.fuelType,
        kmPerLiter: input.kmPerLiter,
        estimatedMonthlyKm: input.estimatedMonthlyKm,
        odometerKm: input.odometer?.km ?? null,
        odometerDate: input.odometer ? toDbDate(input.odometer.date) : null,
        fixedCost: { create: fixedCostsToRow(input.fixedCosts) },
        wearItems: { create: wearItemsCreate(input.wearItems) },
      },
      include: vehicleInclude,
    });
    return vehicleFromRow(row);
  },

  async update(userId: string, id: string, changes: Partial<VehicleInput>): Promise<Vehicle> {
    const db = getDb();
    const existing = await db.vehicle.findFirst({ where: { id, userId, deletedAt: null }, select: { id: true } });
    if (!existing) throw notFound("Veículo");

    const row = await db.$transaction(async (tx) => {
      if (changes.fixedCosts) {
        const data = fixedCostsToRow(changes.fixedCosts);
        await tx.fixedCost.upsert({ where: { vehicleId: id }, create: { vehicleId: id, ...data }, update: data });
      }
      if (changes.wearItems) {
        // A lista é editada como um todo na tela: substitui todos os itens.
        await tx.wearItem.deleteMany({ where: { vehicleId: id } });
        await tx.wearItem.createMany({ data: wearItemsCreate(changes.wearItems).map((w) => ({ ...w, vehicleId: id })) });
      }
      // Sempre toca o veículo: updatedAt reflete qualquer mudança (base do sync).
      return tx.vehicle.update({ where: { id }, data: vehicleScalars(changes), include: vehicleInclude });
    });
    return vehicleFromRow(row);
  },

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await getDb().vehicle.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!count) throw notFound("Veículo");
  },
};

/* ---------- Viagens ---------- */

function tripData(input: Partial<TripInput>) {
  return {
    date: input.date ? toDbDate(input.date) : undefined,
    vehicleId: input.vehicleId,
    freightRevenue: input.freightRevenue,
    km: input.km,
    fuelLiters: input.fuelLiters,
    fuelPricePerLiter: input.fuelPricePerLiter,
    tolls: input.tolls,
    helperPayment: input.helperPayment,
    otherCosts: input.otherCosts,
  };
}

export const trips = {
  async list(userId: string, options?: ListOptions): Promise<Trip[]> {
    const rows = await getDb().trip.findMany({
      where: listWhere(userId, options),
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(tripFromRow);
  },

  async get(userId: string, id: string): Promise<Trip | null> {
    const row = await getDb().trip.findFirst({ where: { id, userId, deletedAt: null } });
    return row ? tripFromRow(row) : null;
  },

  async create(userId: string, input: TripInput): Promise<Trip> {
    if (input.vehicleId) await assertOwnedVehicle(userId, input.vehicleId);
    const row = await getDb().trip.create({
      data: { ...tripData(input), userId, date: toDbDate(input.date), freightRevenue: input.freightRevenue, km: input.km },
    });
    return tripFromRow(row);
  },

  async update(userId: string, id: string, changes: Partial<TripInput>): Promise<Trip> {
    if (changes.vehicleId) await assertOwnedVehicle(userId, changes.vehicleId);
    const db = getDb();
    const { count } = await db.trip.updateMany({ where: { id, userId, deletedAt: null }, data: tripData(changes) });
    if (!count) throw notFound("Viagem");
    return tripFromRow(await db.trip.findUniqueOrThrow({ where: { id } }));
  },

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await getDb().trip.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!count) throw notFound("Viagem");
  },
};

/* ---------- Manutenções ---------- */

function maintenanceData(input: Partial<MaintenanceInput>) {
  return {
    vehicleId: input.vehicleId,
    type: input.type,
    description: input.description,
    status: input.status,
    date: input.date ? toDbDate(input.date) : undefined,
    odometerKm: input.odometerKm,
    cost: input.cost,
  };
}

export const maintenances = {
  async list(userId: string, options?: ListOptions): Promise<Maintenance[]> {
    const rows = await getDb().maintenance.findMany({ where: listWhere(userId, options), orderBy: { date: "desc" } });
    return rows.map(maintenanceFromRow);
  },

  async get(userId: string, id: string): Promise<Maintenance | null> {
    const row = await getDb().maintenance.findFirst({ where: { id, userId, deletedAt: null } });
    return row ? maintenanceFromRow(row) : null;
  },

  async create(userId: string, input: MaintenanceInput): Promise<Maintenance> {
    await assertOwnedVehicle(userId, input.vehicleId);
    const row = await getDb().maintenance.create({
      data: { ...input, userId, date: toDbDate(input.date) },
    });
    return maintenanceFromRow(row);
  },

  async update(userId: string, id: string, changes: Partial<MaintenanceInput>): Promise<Maintenance> {
    if (changes.vehicleId) await assertOwnedVehicle(userId, changes.vehicleId);
    const db = getDb();
    const { count } = await db.maintenance.updateMany({
      where: { id, userId, deletedAt: null },
      data: maintenanceData(changes),
    });
    if (!count) throw notFound("Manutenção");
    return maintenanceFromRow(await db.maintenance.findUniqueOrThrow({ where: { id } }));
  },

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await getDb().maintenance.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!count) throw notFound("Manutenção");
  },
};

/* ---------- Preferências (meta mensal) ---------- */

export const settings = {
  async get(userId: string): Promise<UserSettings> {
    return settingsFromRow(userId, await getDb().goal.findUnique({ where: { userId } }));
  },

  async update(userId: string, changes: SettingsInput): Promise<UserSettings> {
    const target = changes.monthlyProfitGoal;
    const row = await getDb().goal.upsert({
      where: { userId },
      create: { userId, monthlyProfitTarget: target ?? null },
      update: target === undefined ? {} : { monthlyProfitTarget: target },
    });
    return settingsFromRow(userId, row);
  },
};
