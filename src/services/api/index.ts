import { getSession, signIn, signOut } from "next-auth/react";
import type {
  EntityMeta,
  Maintenance,
  MaintenanceInput,
  Session,
  SettingsInput,
  Trip,
  TripInput,
  UserSettings,
  Vehicle,
  VehicleInput,
} from "@/types";
import type {
  AuthService,
  CrudRepository,
  ListOptions,
  SettingsRepository,
  SyncService,
  SyncState,
} from "../types";
import { api, ApiError } from "./http";

/**
 * Implementação dos contratos de src/services/types.ts sobre a API do próprio app
 * (Route Handlers em src/app/api → Prisma → PostgreSQL).
 */

function crud<T extends EntityMeta, TInput>(resource: string): CrudRepository<T, TInput> {
  return {
    list({ updatedSince, includeDeleted }: ListOptions = {}) {
      const query = new URLSearchParams();
      if (updatedSince) query.set("updatedSince", updatedSince);
      if (includeDeleted) query.set("includeDeleted", "1");
      const qs = query.toString();
      return api<T[]>(`/${resource}${qs ? `?${qs}` : ""}`);
    },
    async get(id) {
      try {
        return await api<T>(`/${resource}/${encodeURIComponent(id)}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    create: (input) => api<T>(`/${resource}`, { method: "POST", json: input }),
    update: (id, changes) => api<T>(`/${resource}/${encodeURIComponent(id)}`, { method: "PATCH", json: changes }),
    remove: (id) => api<void>(`/${resource}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}

export const apiVehicleRepository = crud<Vehicle, VehicleInput>("vehicles");
export const apiTripRepository = crud<Trip, TripInput>("trips");
export const apiMaintenanceRepository = crud<Maintenance, MaintenanceInput>("maintenances");

export const apiSettingsRepository: SettingsRepository = {
  get: () => api<UserSettings>("/settings"),
  update: (changes: SettingsInput) => api<UserSettings>("/settings", { method: "PATCH", json: changes }),
};

/* ---------- Autenticação (Auth.js) ---------- */

async function currentSession(): Promise<Session | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return {
    user: { id: session.user.id, name: session.user.name ?? "", email: session.user.email ?? "" },
    expiresAt: session.expires ?? null,
  };
}

/** Limpa páginas guardadas pelo service worker: o próximo usuário do aparelho não vê nada do anterior. */
async function clearOfflineCache() {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export const apiAuthService: AuthService = {
  getSession: currentSession,

  async signIn(email, password) {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result || result.error) {
      throw new ApiError(401, result?.code === "invalid_credentials" ? "E-mail ou senha incorretos" : "Não foi possível entrar. Tente de novo.");
    }
    const session = await currentSession();
    if (!session) throw new ApiError(401, "Não foi possível iniciar a sessão");
    return session;
  },

  async signUp(name, email, password) {
    await api("/account/register", { method: "POST", json: { name, email, password } });
    return apiAuthService.signIn(email, password);
  },

  requestPasswordReset: (email) => api<void>("/account/password/forgot", { method: "POST", json: { email } }),

  resetPassword: (token, password) =>
    api<void>("/account/password/reset", { method: "POST", json: { token, password } }),

  async signOut() {
    await signOut({ redirect: false });
    await clearOfflineCache();
  },

  // Sessão JWT com Auth.js: mudanças são percebidas na próxima requisição (401 → login).
  onAuthStateChange: () => () => {},
};

/* ---------- Sincronização ---------- */

/** Com o servidor como fonte da verdade, "sync" = estar online. Fila offline fica para uma próxima versão. */
const syncState = (): SyncState => ({
  status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced",
  lastSyncedAt: null,
  pendingChanges: 0,
});

export const apiSyncService: SyncService = {
  getState: syncState,
  sync: async () => syncState(),
  subscribe(listener) {
    const notify = () => listener(syncState());
    window.addEventListener("online", notify);
    window.addEventListener("offline", notify);
    return () => {
      window.removeEventListener("online", notify);
      window.removeEventListener("offline", notify);
    };
  },
};
