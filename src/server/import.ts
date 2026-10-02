import "server-only";
import { getDb } from "./db";
import { conflict } from "./errors";
import { fixedCostsToRow, toDbDate } from "./mappers";
import type { ImportSnapshot } from "./validation";

export interface ImportResult {
  vehicles: number;
  trips: number;
  maintenances: number;
  goal: boolean;
}

/**
 * Importa os dados do protótipo (localStorage) para a conta, numa única transação.
 * Os ids locais (ex.: "v-hr", "t-12") são trocados por ids novos; viagens e manutenções
 * são religadas aos veículos importados. Só pode acontecer uma vez por conta.
 */
export async function importLocalSnapshot(userId: string, snapshot: ImportSnapshot): Promise<ImportResult> {
  return getDb().$transaction(
    async (tx) => {
      // Trava atômica: só a primeira importação marca a conta; as demais caem em 409.
      const claimed = await tx.user.updateMany({
        where: { id: userId, localImportAt: null },
        data: { localImportAt: new Date() },
      });
      if (!claimed.count) throw conflict("Os dados deste aparelho já foram importados para esta conta");

      const vehicleIds = new Map<string, string>();
      for (const v of snapshot.vehicles) {
        const created = await tx.vehicle.create({
          data: {
            userId,
            name: v.name,
            model: v.model,
            fuelType: v.fuelType,
            kmPerLiter: v.kmPerLiter,
            estimatedMonthlyKm: v.estimatedMonthlyKm,
            odometerKm: v.odometer?.km ?? null,
            odometerDate: v.odometer ? toDbDate(v.odometer.date) : null,
            createdAt: v.createdAt ? new Date(v.createdAt) : undefined,
            fixedCost: { create: fixedCostsToRow(v.fixedCosts) },
            wearItems: {
              create: v.wearItems.map(({ type, label, cost, lifespanKm }) => ({ type, label, cost, lifespanKm })),
            },
          },
          select: { id: true },
        });
        vehicleIds.set(v.id, created.id);
      }

      const trips = await tx.trip.createMany({
        data: snapshot.trips.map((t) => ({
          userId,
          vehicleId: t.vehicleId ? (vehicleIds.get(t.vehicleId) ?? null) : null,
          date: toDbDate(t.date),
          freightRevenue: t.freightRevenue,
          km: t.km,
          fuelLiters: t.fuelLiters,
          fuelPricePerLiter: t.fuelPricePerLiter,
          tolls: t.tolls,
          helperPayment: t.helperPayment,
          otherCosts: t.otherCosts,
          createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
        })),
      });

      // Manutenção sem veículo correspondente não tem onde ficar: é descartada.
      const maintenances = await tx.maintenance.createMany({
        data: snapshot.maintenances
          .filter((m) => vehicleIds.has(m.vehicleId))
          .map((m) => ({
            userId,
            vehicleId: vehicleIds.get(m.vehicleId)!,
            type: m.type,
            description: m.description,
            status: m.status,
            date: toDbDate(m.date),
            odometerKm: m.odometerKm,
            cost: m.cost,
          })),
      });

      // A meta local só entra se a conta ainda não tiver uma.
      let goal = false;
      if (snapshot.monthlyProfitGoal) {
        const existing = await tx.goal.findUnique({ where: { userId } });
        if (!existing?.monthlyProfitTarget) {
          await tx.goal.upsert({
            where: { userId },
            create: { userId, monthlyProfitTarget: snapshot.monthlyProfitGoal },
            update: { monthlyProfitTarget: snapshot.monthlyProfitGoal },
          });
          goal = true;
        }
      }

      return { vehicles: vehicleIds.size, trips: trips.count, maintenances: maintenances.count, goal };
    },
    { timeout: 30_000 },
  );
}
