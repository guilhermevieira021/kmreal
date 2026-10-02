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

/**
 * Contratos da camada de dados. A UI depende apenas destas interfaces;
 * a implementação (API + PostgreSQL) pode mudar sem alterar telas.
 * Todas as operações já são escopadas ao usuário da sessão atual.
 */

export interface ListOptions {
  /** Sync incremental: só registros alterados depois deste instante (ISO). */
  updatedSince?: string;
  /** Inclui registros com exclusão lógica (necessário para sincronizar remoções). */
  includeDeleted?: boolean;
}

export interface CrudRepository<T extends EntityMeta, TInput> {
  list(options?: ListOptions): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: string, changes: Partial<TInput>): Promise<T>;
  /** Exclusão lógica (preenche `deletedAt`). */
  remove(id: string): Promise<void>;
}

export type VehicleRepository = CrudRepository<Vehicle, VehicleInput>;
export type TripRepository = CrudRepository<Trip, TripInput>;
export type MaintenanceRepository = CrudRepository<Maintenance, MaintenanceInput>;

export interface SettingsRepository {
  get(): Promise<UserSettings>;
  update(changes: SettingsInput): Promise<UserSettings>;
}

export interface AuthService {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<Session>;
  signUp(name: string, email: string, password: string): Promise<Session>;
  requestPasswordReset(email: string): Promise<void>;
  /** Define nova senha a partir do token recebido por e-mail. */
  resetPassword(token: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Notifica login/logout (ex.: sessão expirada em outro dispositivo). Retorna o unsubscribe. */
  onAuthStateChange(listener: (session: Session | null) => void): () => void;
}

/**
 * - `local`: dados só neste aparelho (modo protótipo)
 * - `synced`: dados salvos na conta (servidor é a fonte da verdade)
 * - `syncing` / `pending` / `offline` / `error`: estados do sync com a nuvem
 */
export type SyncStatus = "local" | "synced" | "syncing" | "pending" | "offline" | "error";

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  /** Alterações locais ainda não enviadas (fila offline). */
  pendingChanges: number;
}

export interface SyncService {
  getState(): SyncState;
  /** Envia pendências e baixa alterações remotas desde `lastSyncedAt`. */
  sync(): Promise<SyncState>;
  subscribe(listener: (state: SyncState) => void): () => void;
}
