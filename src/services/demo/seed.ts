import { DEFAULT_WEAR_ITEMS } from "@/lib/constants";
export { DEMO_CREDENTIALS } from "@/lib/constants";
import { addDays, toISODate } from "@/lib/dates";
import type { Maintenance, Trip, UserProfile, Vehicle, VehicleFixedCosts, WearItem } from "@/types";

/** Dados de demonstração: usados pelo seed do banco (prisma/seed.ts). */
export const LOCAL_USER_ID = "local-user";

export const mockUser: UserProfile = {
  id: LOCAL_USER_ID,
  name: "João Motorista",
  email: "joao@kmreal.app",
};

export const DEMO_MONTHLY_GOAL = 10000;

type Seed<T> = Omit<T, "userId" | "createdAt" | "updatedAt" | "deletedAt"> & { createdAt?: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const today = () => toISODate(new Date());
const HISTORY_DAYS = 100;

/** Gerador pseudoaleatório determinístico: os dados de exemplo são sempre os mesmos. */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const wear = (id: string, costs: Partial<Record<WearItem["type"], [number, number?]>>): WearItem[] =>
  DEFAULT_WEAR_ITEMS.map((item) => {
    const [cost, lifespanKm] = costs[item.type] ?? [0];
    return { ...item, id: `${id}-${item.type}`, cost, lifespanKm: lifespanKm ?? item.lifespanKm };
  });

const fixed = (c: Partial<VehicleFixedCosts>): VehicleFixedCosts => ({
  insuranceAnnual: 0,
  insuranceExpiresOn: null,
  ipvaAnnual: 0,
  licensingAnnual: 0,
  financingMonthly: 0,
  trackerMonthly: 0,
  phoneMonthly: 0,
  otherMonthly: 0,
  ...c,
});

/** Hodômetro no início do histórico de exemplo. */
const BASE_ODOMETER: Record<string, number> = { "v-hr": 84000, "v-fiorino": 52300, "v-master": 139000 };

export function buildMockVehicles(): Seed<Vehicle>[] {
  const readingDate = addDays(today(), -HISTORY_DAYS);
  return [
    {
      id: "v-hr",
      name: "HR Branca",
      model: "Hyundai HR 2.5 Diesel",
      fuelType: "diesel_s10",
      kmPerLiter: 9,
      estimatedMonthlyKm: 6000,
      odometer: { km: BASE_ODOMETER["v-hr"], date: readingDate },
      fixedCosts: fixed({
        insuranceAnnual: 4200,
        insuranceExpiresOn: addDays(today(), 20),
        ipvaAnnual: 2100,
        licensingAnnual: 160,
        financingMonthly: 2300,
        trackerMonthly: 89,
        phoneMonthly: 70,
        otherMonthly: 50,
      }),
      wearItems: wear("v-hr", { oil: [380], tires: [3200], brakes: [650], belt: [450], service: [900] }),
    },
    {
      id: "v-fiorino",
      name: "Fiorino",
      model: "Fiat Fiorino 1.4 Flex",
      fuelType: "gasolina",
      kmPerLiter: 11.5,
      estimatedMonthlyKm: 3500,
      odometer: { km: BASE_ODOMETER["v-fiorino"], date: readingDate },
      fixedCosts: fixed({
        insuranceAnnual: 2600,
        insuranceExpiresOn: addDays(today(), 140),
        ipvaAnnual: 1300,
        licensingAnnual: 160,
        trackerMonthly: 59,
        phoneMonthly: 70,
      }),
      wearItems: wear("v-fiorino", { oil: [250], tires: [1600, 50000], brakes: [420], belt: [300, 50000], service: [600] }),
    },
    {
      id: "v-master",
      name: "Master",
      model: "Renault Master 2.3 Furgão",
      fuelType: "diesel_s10",
      kmPerLiter: 8.5,
      estimatedMonthlyKm: 7000,
      odometer: { km: BASE_ODOMETER["v-master"], date: readingDate },
      fixedCosts: fixed({
        insuranceAnnual: 5200,
        insuranceExpiresOn: addDays(today(), 210),
        ipvaAnnual: 3400,
        licensingAnnual: 160,
        financingMonthly: 3100,
        trackerMonthly: 89,
        phoneMonthly: 70,
        otherMonthly: 100,
      }),
      wearItems: wear("v-master", { oil: [450], tires: [4000], brakes: [800], belt: [500], service: [1100] }),
    },
  ];
}

interface VehicleProfile {
  id: string;
  kmPerLiter: number;
  revenuePerKm: [number, number];
  km: [number, number];
  tollPerKm: number;
  helperChance: number;
  basePrice: number;
}

const PROFILES: VehicleProfile[] = [
  { id: "v-hr", kmPerLiter: 9, revenuePerKm: [2.0, 2.5], km: [180, 400], tollPerKm: 0.09, helperChance: 0.5, basePrice: 5.95 },
  { id: "v-fiorino", kmPerLiter: 11.5, revenuePerKm: [1.6, 2.0], km: [70, 220], tollPerKm: 0.05, helperChance: 0, basePrice: 5.79 },
  { id: "v-master", kmPerLiter: 8.5, revenuePerKm: [2.3, 2.8], km: [250, 520], tollPerKm: 0.11, helperChance: 0.6, basePrice: 5.95 },
];

/**
 * ~100 dias de viagens por veículo (a cada 1–2 dias), terminando hoje. O combustível sobe
 * ao longo do tempo (com reajuste no último mês) e a Master tem um mês recente mais fraco,
 * para os alertas terem o que mostrar.
 */
export function buildMockTrips(now: Date = new Date()): Seed<Trip>[] {
  const random = seededRandom(42);
  const between = ([min, max]: [number, number]) => min + random() * (max - min);
  const end = toISODate(now);
  const trips: Seed<Trip>[] = [];
  let n = 0;

  for (const profile of PROFILES) {
    for (let daysAgo = HISTORY_DAYS - 1 - Math.floor(random() * 2); daysAgo >= 0; daysAgo -= 1 + Math.round(random())) {
      const date = addDays(end, -daysAgo);
      const recent = daysAgo <= 30;
      const km = Math.round(between(profile.km));
      let revenuePerKm = between(profile.revenuePerKm);
      if (recent && profile.id === "v-master") revenuePerKm *= 0.88;
      // Combustível ~5% mais caro ao longo do período + reajuste de 7% nos últimos 30 dias.
      const trend = 1 + 0.05 * ((HISTORY_DAYS - daysAgo) / HISTORY_DAYS);
      const fuelPrice = round2(profile.basePrice * trend * (recent ? 1.07 : 1) + between([-0.05, 0.05]));

      // A Master roda como agregado pago por KM; os demais, por frete fechado.
      const perKm = profile.id === "v-master";
      const pricePerKm = perKm ? round2(revenuePerKm) : null;
      trips.push({
        id: `t-${++n}`,
        date,
        vehicleId: profile.id,
        paymentType: perKm ? "per_km" : "fixed",
        pricePerKm,
        freightRevenue: pricePerKm ? round2(pricePerKm * km) : Math.round((km * revenuePerKm) / 10) * 10,
        km,
        fuelLiters: round2((km / profile.kmPerLiter) * between([0.96, 1.06])),
        fuelPricePerLiter: fuelPrice,
        tolls: random() < 0.6 ? round2(km * profile.tollPerKm) : 0,
        helperPayment: random() < profile.helperChance ? Math.round(between([100, 180]) / 10) * 10 : 0,
        // Alimentação, estacionamento, pequenos reparos
        otherCosts: random() < 0.5 ? Math.round(between([20, 90])) : 0,
        createdAt: new Date(`${date}T18:00:00`).toISOString(),
      });
    }
  }
  return trips;
}

/** Manutenções coerentes com o KM das viagens (o hodômetro "anda" com elas). */
export function buildMockMaintenances(trips: Seed<Trip>[] = buildMockTrips()): Seed<Maintenance>[] {
  const start = addDays(today(), -HISTORY_DAYS);
  const odometerAt = (vehicleId: string, daysAgo: number) =>
    BASE_ODOMETER[vehicleId] +
    trips
      .filter((t) => t.vehicleId === vehicleId && t.date > start && t.date <= addDays(today(), -daysAgo))
      .reduce((sum, t) => sum + t.km, 0);

  /** Data aproximada em que o veículo estava com determinado KM. */
  const dateForKm = (vehicleId: string, km: number) => {
    for (let d = 0; d <= HISTORY_DAYS; d++) if (odometerAt(vehicleId, d) <= km) return addDays(today(), -d);
    const perDay = (odometerAt(vehicleId, 0) - BASE_ODOMETER[vehicleId]) / HISTORY_DAYS;
    return addDays(today(), -HISTORY_DAYS - Math.ceil((BASE_ODOMETER[vehicleId] - km) / perDay));
  };

  /** Manutenção realizada `kmAgo` km atrás. */
  const done = (id: string, vehicleId: string, type: Maintenance["type"], kmAgo: number, cost: number, description = "") => {
    const odometerKm = odometerAt(vehicleId, 0) - kmAgo;
    return {
      id,
      vehicleId,
      type,
      description,
      status: "done" as const,
      date: dateForKm(vehicleId, odometerKm),
      odometerKm,
      cost,
    };
  };

  return [
    // HR: óleo perto da troca (faltam ~900 km); correia sem registro
    done("m-1", "v-hr", "oil", 9100, 380),
    done("m-2", "v-hr", "service", 15000, 900),
    done("m-3", "v-hr", "tires", 21000, 3200),
    done("m-4", "v-hr", "brakes", 24000, 650),
    // Fiorino: embreagem avulsa (sem vida útil) entra como "manutenção" no custo por km
    done("m-5", "v-fiorino", "oil", 4000, 250),
    done("m-6", "v-fiorino", "brakes", 6000, 420),
    done("m-7", "v-fiorino", "clutch", 2500, 1350, "Kit de embreagem"),
    done("m-8", "v-fiorino", "service", 14000, 600),
    done("m-9", "v-fiorino", "tires", 30000, 1600),
    done("m-10", "v-fiorino", "belt", 20000, 300),
    // Master: pneus passaram do limite (~800 km); freios planejados
    done("m-11", "v-master", "oil", 3000, 450),
    done("m-12", "v-master", "service", 6000, 1100),
    done("m-13", "v-master", "tires", 60800, 4000),
    done("m-14", "v-master", "belt", 35000, 500),
    {
      id: "m-15",
      vehicleId: "v-master",
      type: "brakes",
      description: "Pastilhas e discos dianteiros",
      status: "planned",
      date: addDays(today(), 10),
      odometerKm: null,
      cost: 800,
    },
  ];
}
