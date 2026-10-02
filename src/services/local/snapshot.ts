import { DEFAULT_MONTHLY_KM, DEFAULT_WEAR_ITEMS, EMPTY_FIXED_COSTS } from "@/lib/constants";
import type { Maintenance, Trip, UserSettings, Vehicle } from "@/types";

/**
 * Dados do protótipo salvos no localStorage (v0.1 → v0.4), lidos para importação na conta.
 * Nada aqui escreve no servidor: só lê, normaliza e marca o que já foi resolvido.
 */

const KEYS = {
  vehicles: ["kmreal:v2:vehicles", "kmreal:vehicles"],
  trips: ["kmreal:v2:trips", "kmreal:trips"],
  maintenances: ["kmreal:v2:maintenances"],
  settings: ["kmreal:v2:settings"],
} as const;

/** Decisão do motorista sobre os dados deste aparelho (não pergunta de novo). */
const DECISION_KEY = "kmreal:local-import";
const BACKUP_PREFIX = "kmreal:backup:";

type Legacy<T> = Partial<T> & { id?: string; deletedAt?: string | null };

function read<T>(keys: readonly string[]): T | null {
  try {
    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    }
  } catch {
    // localStorage indisponível ou corrompido: trata como vazio.
  }
  return null;
}

const n = (value: unknown, fallback = 0) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
const pos = (value: unknown) => Math.max(0, n(value));
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export interface LocalSnapshot {
  vehicles: (Omit<Vehicle, "userId" | "updatedAt" | "deletedAt">)[];
  trips: (Omit<Trip, "userId" | "updatedAt" | "deletedAt">)[];
  maintenances: (Omit<Maintenance, "userId" | "updatedAt" | "deletedAt" | "createdAt">)[];
  monthlyProfitGoal: number | null;
}

/** Lê e normaliza os dados locais. Registros inválidos (que o servidor recusaria) são descartados. */
export function readLocalSnapshot(): LocalSnapshot {
  const alive = <T extends { deletedAt?: string | null }>(items: T[] | null) => (items ?? []).filter((i) => !i.deletedAt);

  const vehicles = alive(read<Legacy<Vehicle>[]>(KEYS.vehicles))
    .filter((v) => v.id && v.name)
    .map((v) => ({
      id: String(v.id),
      createdAt: v.createdAt ?? new Date().toISOString(),
      name: String(v.name).slice(0, 60),
      model: String(v.model || v.name).slice(0, 80),
      fuelType: v.fuelType ?? "diesel_s10",
      kmPerLiter: n(v.kmPerLiter) > 0 ? Math.min(n(v.kmPerLiter), 100) : 10,
      estimatedMonthlyKm: Math.round(n(v.estimatedMonthlyKm) > 0 ? n(v.estimatedMonthlyKm) : DEFAULT_MONTHLY_KM),
      odometer:
        v.odometer && isDate(v.odometer.date) ? { km: Math.round(pos(v.odometer.km)), date: v.odometer.date } : null,
      fixedCosts: { ...EMPTY_FIXED_COSTS, ...v.fixedCosts },
      wearItems: (v.wearItems ?? DEFAULT_WEAR_ITEMS.map((w, i) => ({ ...w, id: `w-${i}` })))
        .filter((w) => w.label && n(w.lifespanKm) > 0)
        .map((w) => ({ ...w, label: w.label.slice(0, 60), cost: pos(w.cost), lifespanKm: Math.round(w.lifespanKm) })),
    }));

  const trips = alive(read<Legacy<Trip>[]>(KEYS.trips))
    .filter((t) => t.id && isDate(t.date) && n(t.km) > 0)
    .map((t) => ({
      id: String(t.id),
      createdAt: t.createdAt ?? new Date().toISOString(),
      date: t.date as string,
      vehicleId: t.vehicleId ?? null,
      freightRevenue: pos(t.freightRevenue),
      km: n(t.km),
      fuelLiters: pos(t.fuelLiters),
      fuelPricePerLiter: pos(t.fuelPricePerLiter),
      tolls: pos(t.tolls),
      helperPayment: pos(t.helperPayment),
      otherCosts: pos(t.otherCosts),
    }));

  const maintenances = alive(read<Legacy<Maintenance>[]>(KEYS.maintenances))
    .filter((m) => m.id && m.vehicleId && m.type && isDate(m.date))
    .map((m) => ({
      id: String(m.id),
      vehicleId: String(m.vehicleId),
      type: m.type!,
      description: String(m.description ?? "").slice(0, 120),
      status: m.status === "planned" ? ("planned" as const) : ("done" as const),
      date: m.date as string,
      odometerKm: m.odometerKm == null ? null : Math.round(pos(m.odometerKm)),
      cost: pos(m.cost),
    }));

  const goal = read<UserSettings>(KEYS.settings)?.monthlyProfitGoal;
  return { vehicles, trips, maintenances, monthlyProfitGoal: goal && goal > 0 ? goal : null };
}

export const isSnapshotEmpty = (s: LocalSnapshot) => !s.vehicles.length && !s.trips.length && !s.maintenances.length;

/** Já importou ou recusou neste aparelho? */
export function localImportDecision(): "imported" | "dismissed" | null {
  try {
    const value = window.localStorage.getItem(DECISION_KEY);
    return value === "imported" || value === "dismissed" ? value : null;
  } catch {
    return null;
  }
}

export function setLocalImportDecision(decision: "imported" | "dismissed") {
  try {
    window.localStorage.setItem(DECISION_KEY, decision);
    if (decision === "imported") {
      // Mantém uma cópia de segurança, fora das chaves lidas pelo importador.
      for (const key of Object.values(KEYS).flat()) {
        const raw = window.localStorage.getItem(key);
        if (raw === null) continue;
        window.localStorage.setItem(BACKUP_PREFIX + key, raw);
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Sem localStorage: a pergunta pode reaparecer, o servidor impede importação dupla (409).
  }
}

/** Permite perguntar de novo (ex.: o motorista mudou de ideia no Perfil). */
export function clearLocalImportDecision() {
  try {
    window.localStorage.removeItem(DECISION_KEY);
  } catch {
    // ignore
  }
}
