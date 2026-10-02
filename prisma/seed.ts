/**
 * Cria (ou recria) a conta de demonstração com os mesmos dados de exemplo do protótipo.
 * Só mexe na conta demo — dados de outros usuários nunca são tocados.
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_CREDENTIALS } from "../src/lib/constants";
import { resolveDirectUrl } from "../src/lib/database-url";
import { buildMockMaintenances, buildMockTrips, buildMockVehicles, DEMO_MONTHLY_GOAL, mockUser } from "../src/services/demo/seed";

const toDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function main() {
  const url = resolveDirectUrl()?.value;
  if (!url) throw new Error("Defina DATABASE_URL (veja .env.example)");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const email = DEMO_CREDENTIALS.email;
    const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 11);

    // Recria do zero a conta demo (cascade remove veículos, viagens, manutenções e meta).
    await db.user.deleteMany({ where: { email } });
    const user = await db.user.create({
      data: { name: mockUser.name, email, passwordHash, goal: { create: { monthlyProfitTarget: DEMO_MONTHLY_GOAL } } },
    });

    const trips = buildMockTrips();
    const vehicleIds = new Map<string, string>();
    for (const v of buildMockVehicles()) {
      const created = await db.vehicle.create({
        data: {
          userId: user.id,
          name: v.name,
          model: v.model,
          fuelType: v.fuelType,
          kmPerLiter: v.kmPerLiter,
          estimatedMonthlyKm: v.estimatedMonthlyKm,
          odometerKm: v.odometer?.km ?? null,
          odometerDate: v.odometer ? toDate(v.odometer.date) : null,
          fixedCost: {
            create: {
              ...v.fixedCosts,
              insuranceExpiresOn: v.fixedCosts.insuranceExpiresOn ? toDate(v.fixedCosts.insuranceExpiresOn) : null,
            },
          },
          wearItems: {
            create: v.wearItems.map(({ type, label, cost, lifespanKm }) => ({ type, label, cost, lifespanKm })),
          },
        },
      });
      vehicleIds.set(v.id, created.id);
    }

    await db.trip.createMany({
      data: trips.map((t) => ({
        userId: user.id,
        vehicleId: t.vehicleId ? vehicleIds.get(t.vehicleId) : null,
        date: toDate(t.date),
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

    await db.maintenance.createMany({
      data: buildMockMaintenances(trips).map((m) => ({
        userId: user.id,
        vehicleId: vehicleIds.get(m.vehicleId)!,
        type: m.type,
        description: m.description,
        status: m.status,
        date: toDate(m.date),
        odometerKm: m.odometerKm,
        cost: m.cost,
      })),
    });

    console.log(`Conta demo pronta: ${email} / ${DEMO_CREDENTIALS.password} (${trips.length} viagens)`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
