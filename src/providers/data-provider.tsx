"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { buildCostRates, type CostRates } from "@/lib/calculations/real-cost";
import { sortTripsByDateDesc } from "@/lib/calculations/trip";
import {
  ApiError,
  maintenanceRepository,
  settingsRepository,
  tripRepository,
  vehicleRepository,
} from "@/services";
import type {
  Maintenance,
  MaintenanceInput,
  SettingsInput,
  Trip,
  TripInput,
  UserSettings,
  Vehicle,
  VehicleInput,
} from "@/types";

interface DataContextValue {
  isLoading: boolean;
  /** Erro ao carregar (ex.: sem conexão) */
  loadError: string | null;
  vehicles: Vehicle[];
  trips: Trip[];
  maintenances: Maintenance[];
  settings: UserSettings | null;
  /** Taxas R$/km de custos fixos, desgaste e manutenção por veículo (base do custo real) */
  costRates: CostRates;
  createVehicle(input: VehicleInput): Promise<Vehicle>;
  updateVehicle(id: string, changes: Partial<VehicleInput>): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;
  createTrip(input: TripInput): Promise<Trip>;
  updateTrip(id: string, changes: Partial<TripInput>): Promise<Trip>;
  deleteTrip(id: string): Promise<void>;
  createMaintenance(input: MaintenanceInput): Promise<Maintenance>;
  updateMaintenance(id: string, changes: Partial<MaintenanceInput>): Promise<Maintenance>;
  deleteMaintenance(id: string): Promise<void>;
  updateSettings(changes: SettingsInput): Promise<UserSettings>;
  /** Recarrega tudo do servidor (ex.: após importar os dados do aparelho) */
  reload(): Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const byDateDesc = (items: Maintenance[]) => [...items].sort((a, b) => b.date.localeCompare(a.date));

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : "Algo deu errado. Tente de novo.";

/** Mostra o erro ao motorista e repassa para quem chamou (o formulário não fecha nem navega). */
async function notify<R>(action: () => Promise<R>): Promise<R> {
  try {
    return await action();
  } catch (error) {
    toast.error(errorMessage(error));
    throw error;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const reload = useCallback(async () => {
    try {
      const [v, t, m, s] = await Promise.all([
        vehicleRepository.list(),
        tripRepository.list(),
        maintenanceRepository.list(),
        settingsRepository.get(),
      ]);
      setVehicles(v);
      setTrips(sortTripsByDateDesc(t));
      setMaintenances(byDateDesc(m));
      setSettings(s);
      setLoadError(null);
    } catch (error) {
      const message = errorMessage(error);
      setLoadError(message);
      toast.error(message, { action: { label: "Tentar de novo", onClick: () => void reload() }, duration: 10_000 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const costRates = useMemo(() => buildCostRates(vehicles, trips, maintenances), [vehicles, trips, maintenances]);

  const createVehicle = useCallback(
    (input: VehicleInput) =>
      notify(async () => {
        const created = await vehicleRepository.create(input);
        setVehicles((prev) => [created, ...prev]);
        return created;
      }),
    [],
  );

  const updateVehicle = useCallback(
    (id: string, changes: Partial<VehicleInput>) =>
      notify(async () => {
        const updated = await vehicleRepository.update(id, changes);
        setVehicles((prev) => prev.map((v) => (v.id === id ? updated : v)));
        return updated;
      }),
    [],
  );

  const deleteVehicle = useCallback(
    (id: string) =>
      notify(async () => {
        await vehicleRepository.remove(id);
        setVehicles((prev) => prev.filter((v) => v.id !== id));
      }),
    [],
  );

  const createTrip = useCallback(
    (input: TripInput) =>
      notify(async () => {
        const created = await tripRepository.create(input);
        setTrips((prev) => sortTripsByDateDesc([created, ...prev]));
        return created;
      }),
    [],
  );

  const updateTrip = useCallback(
    (id: string, changes: Partial<TripInput>) =>
      notify(async () => {
        const updated = await tripRepository.update(id, changes);
        setTrips((prev) => sortTripsByDateDesc(prev.map((t) => (t.id === id ? updated : t))));
        return updated;
      }),
    [],
  );

  const deleteTrip = useCallback(
    (id: string) =>
      notify(async () => {
        await tripRepository.remove(id);
        setTrips((prev) => prev.filter((t) => t.id !== id));
      }),
    [],
  );

  const createMaintenance = useCallback(
    (input: MaintenanceInput) =>
      notify(async () => {
        const created = await maintenanceRepository.create(input);
        setMaintenances((prev) => byDateDesc([created, ...prev]));
        return created;
      }),
    [],
  );

  const updateMaintenance = useCallback(
    (id: string, changes: Partial<MaintenanceInput>) =>
      notify(async () => {
        const updated = await maintenanceRepository.update(id, changes);
        setMaintenances((prev) => byDateDesc(prev.map((m) => (m.id === id ? updated : m))));
        return updated;
      }),
    [],
  );

  const deleteMaintenance = useCallback(
    (id: string) =>
      notify(async () => {
        await maintenanceRepository.remove(id);
        setMaintenances((prev) => prev.filter((m) => m.id !== id));
      }),
    [],
  );

  const updateSettings = useCallback(
    (changes: SettingsInput) =>
      notify(async () => {
        const updated = await settingsRepository.update(changes);
        setSettings(updated);
        return updated;
      }),
    [],
  );

  const value = useMemo(
    () => ({
      isLoading,
      loadError,
      vehicles,
      trips,
      maintenances,
      settings,
      costRates,
      createVehicle,
      updateVehicle,
      deleteVehicle,
      createTrip,
      updateTrip,
      deleteTrip,
      createMaintenance,
      updateMaintenance,
      deleteMaintenance,
      updateSettings,
      reload,
    }),
    [
      isLoading,
      loadError,
      vehicles,
      trips,
      maintenances,
      settings,
      costRates,
      createVehicle,
      updateVehicle,
      deleteVehicle,
      createTrip,
      updateTrip,
      deleteTrip,
      createMaintenance,
      updateMaintenance,
      deleteMaintenance,
      updateSettings,
      reload,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de <DataProvider>");
  return ctx;
}

export function useVehicle(id: string) {
  const { vehicles, isLoading } = useData();
  return { vehicle: vehicles.find((v) => v.id === id), isLoading };
}

/** Mapa id → nome do veículo, para listas e relatórios. */
export function useVehicleNames(): Map<string, string> {
  const { vehicles } = useData();
  return useMemo(() => new Map(vehicles.map((v) => [v.id, v.name])), [vehicles]);
}

export function useTrip(id: string) {
  const { trips, isLoading } = useData();
  return { trip: trips.find((t) => t.id === id), isLoading };
}
