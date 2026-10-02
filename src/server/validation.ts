import "server-only";
import { z } from "zod";

/**
 * Validação de tudo que chega do cliente. Os formatos espelham src/types:
 * se um tipo de domínio mudar, o schema correspondente muda junto.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)");
const money = z.number().finite().min(0).max(10_000_000);
const km = z.number().finite().min(0).max(5_000_000);

export const fuelTypeSchema = z.enum(["diesel", "diesel_s10", "gasolina", "etanol", "gnv"]);
export const maintenanceTypeSchema = z.enum(["oil", "tires", "brakes", "belt", "clutch", "service", "other"]);

export const fixedCostsSchema = z.object({
  insuranceAnnual: money,
  insuranceExpiresOn: isoDate.nullable(),
  ipvaAnnual: money,
  licensingAnnual: money,
  financingMonthly: money,
  trackerMonthly: money,
  phoneMonthly: money,
  otherMonthly: money,
});

export const wearItemSchema = z.object({
  id: z.string().min(1).max(64),
  type: maintenanceTypeSchema,
  label: z.string().trim().min(1).max(60),
  cost: money,
  lifespanKm: z.number().int().positive().max(5_000_000),
});

export const vehicleInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  fuelType: fuelTypeSchema,
  kmPerLiter: z.number().finite().positive().max(100),
  estimatedMonthlyKm: z.number().int().positive().max(100_000),
  odometer: z.object({ km: z.number().int().min(0).max(5_000_000), date: isoDate }).nullable(),
  fixedCosts: fixedCostsSchema,
  wearItems: z.array(wearItemSchema).max(30),
});

export const tripInputSchema = z.object({
  date: isoDate,
  vehicleId: z.string().min(1).nullable(),
  freightRevenue: money,
  km: km.positive(),
  fuelLiters: z.number().finite().min(0).max(100_000),
  fuelPricePerLiter: z.number().finite().min(0).max(100),
  tolls: money,
  helperPayment: money,
  otherCosts: money,
});

export const maintenanceInputSchema = z.object({
  vehicleId: z.string().min(1),
  type: maintenanceTypeSchema,
  description: z.string().trim().max(120),
  status: z.enum(["done", "planned"]),
  date: isoDate,
  odometerKm: z.number().int().min(0).max(5_000_000).nullable(),
  cost: money,
});

export const settingsInputSchema = z.object({
  monthlyProfitGoal: z.number().finite().positive().max(10_000_000).nullable().optional(),
});

export const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(254);
export const passwordSchema = z.string().min(6, "Mínimo de 6 caracteres").max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export const passwordResetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });

/* ---------- Importação do localStorage (protótipo → conta) ---------- */

const legacyMeta = {
  id: z.string().min(1).max(64),
  createdAt: z.string().optional(),
};

export const importSnapshotSchema = z.object({
  vehicles: z.array(vehicleInputSchema.extend(legacyMeta)).max(50),
  trips: z.array(tripInputSchema.extend(legacyMeta)).max(10_000),
  maintenances: z.array(maintenanceInputSchema.extend(legacyMeta)).max(5_000),
  monthlyProfitGoal: z.number().finite().positive().nullable(),
});

export type ImportSnapshot = z.infer<typeof importSnapshotSchema>;
