import { api } from "./api/http";
import {
  apiAuthService,
  apiMaintenanceRepository,
  apiSettingsRepository,
  apiSyncService,
  apiTripRepository,
  apiVehicleRepository,
} from "./api";
import type { SubscriptionInfo } from "@/lib/subscription";
import type { UserProfile } from "@/types";
import type { LocalSnapshot } from "./local/snapshot";

/**
 * Ponto único de injeção dos serviços de dados. As telas importam daqui e dependem
 * só dos contratos de ./types — a implementação atual fala com a API do app (PostgreSQL).
 */
export const vehicleRepository = apiVehicleRepository;
export const tripRepository = apiTripRepository;
export const maintenanceRepository = apiMaintenanceRepository;
export const settingsRepository = apiSettingsRepository;
export const authService = apiAuthService;
export const syncService = apiSyncService;

export interface MeResponse {
  user: UserProfile;
  subscription: SubscriptionInfo & { isPro: boolean };
}

/** Conta logada + plano (o servidor aplica a expiração automática a cada chamada). */
export const fetchMe = () => api<MeResponse>("/me");

export interface ImportResult {
  vehicles: number;
  trips: number;
  maintenances: number;
  goal: boolean;
}

/** Envia os dados do localStorage (protótipo) para a conta logada. */
export const importLocalData = (snapshot: LocalSnapshot) =>
  api<ImportResult>("/import", { method: "POST", json: snapshot });

export { ApiError } from "./api/http";
export type * from "./types";
