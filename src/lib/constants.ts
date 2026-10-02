import type { FuelType, MaintenanceType, VehicleFixedCosts, WearItem } from "@/types";

export const APP_NAME = "KmReal";

/** Conta de demonstração criada pelo seed (npm run db:seed). */
export const DEMO_CREDENTIALS = { email: "joao@kmreal.app", password: "kmreal123" };

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  diesel: "Diesel",
  diesel_s10: "Diesel S10",
  gasolina: "Gasolina",
  etanol: "Etanol",
  gnv: "GNV",
};

/** Preço de referência (R$/l) usado no simulador quando não há nenhum abastecimento registrado. */
export const REFERENCE_FUEL_PRICES: Record<FuelType, number> = {
  diesel: 6.1,
  diesel_s10: 6.25,
  gasolina: 6.3,
  etanol: 4.3,
  gnv: 4.9,
};

/** Margem (%) abaixo da qual um frete é sinalizado como "margem baixa". */
export const VERDICT_THRESHOLDS = { lowMargin: 20 };

export const FUEL_TYPE_OPTIONS = Object.entries(FUEL_TYPE_LABELS).map(([value, label]) => ({
  value: value as FuelType,
  label,
}));

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  oil: "Troca de óleo",
  tires: "Pneus",
  brakes: "Freios",
  belt: "Correia",
  clutch: "Embreagem",
  service: "Revisão",
  other: "Outro",
};

export const MAINTENANCE_TYPES = Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceType[];

/** Itens acompanhados por padrão em todo veículo novo (valores a preencher). */
export const DEFAULT_WEAR_ITEMS: Omit<WearItem, "id">[] = [
  { type: "oil", label: "Óleo e filtros", cost: 0, lifespanKm: 10000 },
  { type: "tires", label: "Pneus", cost: 0, lifespanKm: 60000 },
  { type: "brakes", label: "Freios", cost: 0, lifespanKm: 30000 },
  { type: "belt", label: "Correia", cost: 0, lifespanKm: 60000 },
  { type: "service", label: "Revisão", cost: 0, lifespanKm: 20000 },
];

export const EMPTY_FIXED_COSTS: VehicleFixedCosts = {
  insuranceAnnual: 0,
  insuranceExpiresOn: null,
  ipvaAnnual: 0,
  licensingAnnual: 0,
  financingMonthly: 0,
  trackerMonthly: 0,
  phoneMonthly: 0,
  otherMonthly: 0,
};

export const DEFAULT_MONTHLY_KM = 4000;

/** Antecedência para avisos: % da vida útil restante (mín. em km) e dias para datas. */
export const HEALTH_THRESHOLDS = { soonShare: 0.1, soonMinKm: 500, soonDays: 15, insuranceDays: 30 };
