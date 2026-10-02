"use client";

import { useMemo } from "react";
import { buildVehicleHealth, type VehicleHealth } from "@/lib/calculations/vehicle-health";
import { useData } from "@/providers/data-provider";

/** Saúde (KM atual, itens de vida útil, planejadas, seguro) de todos os veículos, por id. */
export function useVehiclesHealth(): Map<string, VehicleHealth> {
  const { vehicles, maintenances, trips } = useData();
  return useMemo(
    () => new Map(vehicles.map((v) => [v.id, buildVehicleHealth(v, maintenances, trips)])),
    [vehicles, maintenances, trips],
  );
}

export function useVehicleHealth(id: string): VehicleHealth | undefined {
  return useVehiclesHealth().get(id);
}
