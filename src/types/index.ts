export type FuelType = "diesel" | "diesel_s10" | "gasolina" | "etanol" | "gnv";

/**
 * Metadados de toda entidade sincronizável. Espelham colunas do banco
 * (ver prisma/schema.prisma) e permitem sincronização entre dispositivos:
 * - `userId`: dono do registro (toda consulta no servidor é filtrada por ele)
 * - `updatedAt`: base para sync incremental e resolução de conflito (last-write-wins)
 * - `deletedAt`: exclusão lógica, para propagar remoções a outros aparelhos
 */
export interface EntityMeta {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Campos controlados pelo sistema, nunca enviados pela tela. */
export type MetaFields = keyof EntityMeta;

/** Custos fixos do veículo: existem rodando ou parado. */
export interface VehicleFixedCosts {
  insuranceAnnual: number;
  /** Vencimento do seguro (YYYY-MM-DD), para alertas */
  insuranceExpiresOn: string | null;
  ipvaAnnual: number;
  licensingAnnual: number;
  financingMonthly: number;
  trackerMonthly: number;
  phoneMonthly: number;
  otherMonthly: number;
}

export type MaintenanceType = "oil" | "tires" | "brakes" | "belt" | "clutch" | "service" | "other";

/** Item com vida útil em km: vira custo de desgaste por km e é acompanhado na saúde do veículo. */
export interface WearItem {
  id: string;
  type: MaintenanceType;
  /** Nome exibido (livre para itens personalizados) */
  label: string;
  /** Valor da troca completa */
  cost: number;
  lifespanKm: number;
}

/** Leitura do hodômetro informada pelo motorista. */
export interface OdometerReading {
  km: number;
  date: string;
}

export interface Vehicle extends EntityMeta {
  name: string;
  model: string;
  fuelType: FuelType;
  /** Média de consumo em km/l */
  kmPerLiter: number;
  /** KM rodados por mês estimado: base do rateio de custos fixos enquanto não há histórico */
  estimatedMonthlyKm: number;
  odometer: OdometerReading | null;
  fixedCosts: VehicleFixedCosts;
  wearItems: WearItem[];
}

export type VehicleInput = Omit<Vehicle, MetaFields>;

export type MaintenanceStatus = "done" | "planned";

export interface Maintenance extends EntityMeta {
  vehicleId: string;
  type: MaintenanceType;
  /** Observação (obrigatória para "Outro") */
  description: string;
  status: MaintenanceStatus;
  /** Data realizada ou planejada (YYYY-MM-DD) */
  date: string;
  /** KM do veículo na manutenção (ou KM planejado) */
  odometerKm: number | null;
  cost: number;
}

export type MaintenanceInput = Omit<Maintenance, MetaFields>;

export interface TripCosts {
  /** Litros abastecidos */
  fuelLiters: number;
  /** Preço do litro do combustível (R$/l) */
  fuelPricePerLiter: number;
  tolls: number;
  helperPayment: number;
  otherCosts: number;
}

/** Como o motorista foi pago: frete fechado ou valor combinado por km. */
export type PaymentType = "fixed" | "per_km";

export interface Trip extends EntityMeta, TripCosts {
  /** Data no formato YYYY-MM-DD */
  date: string;
  vehicleId: string | null;
  /** Receita da viagem. Em per_km = pricePerKm × km (calculada; base de todos os indicadores) */
  freightRevenue: number;
  paymentType: PaymentType;
  /** Valor combinado por km (só em per_km) */
  pricePerKm: number | null;
  km: number;
}

export type TripInput = Omit<Trip, MetaFields>;

/** Preferências do usuário (1 registro por usuário). */
export interface UserSettings {
  userId: string;
  /** Meta de lucro mensal em R$ (null = sem meta) */
  monthlyProfitGoal: number | null;
  updatedAt: string;
}

export type SettingsInput = Partial<Omit<UserSettings, "userId" | "updatedAt">>;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  user: UserProfile;
  /** Expiração do token (ISO). Mock: sessão sem expiração. */
  expiresAt: string | null;
}

/** Indicadores relativos, válidos para uma viagem, um período ou uma simulação. */
export interface UnitMetrics {
  revenuePerKm: number;
  costPerKm: number;
  profitPerKm: number;
  /** Margem de lucro em % da receita */
  margin: number;
}

export interface TripSummary extends UnitMetrics {
  totalRevenue: number;
  fuelCost: number;
  totalCosts: number;
  netProfit: number;
}

export interface PeriodSummary {
  revenue: number;
  costs: number;
  profit: number;
  km: number;
  tripCount: number;
}
