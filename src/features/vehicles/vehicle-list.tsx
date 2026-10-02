"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Medal, Plus, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Button } from "@/components/ui/button";
import { summarizeReal } from "@/lib/calculations/real-cost";
import { useData } from "@/providers/data-provider";
import { ProBadge } from "@/features/subscription/pro-lock";
import { useVehiclesHealth } from "./use-vehicle-health";
import { VehicleCard } from "./vehicle-card";

export function VehicleList() {
  const { vehicles, trips, costRates, isLoading, isPro } = useData();
  const health = useVehiclesHealth();
  const summaries = useMemo(
    () =>
      new Map(
        vehicles.map((v) => [
          v.id,
          summarizeReal(
            trips.filter((t) => t.vehicleId === v.id),
            costRates,
          ),
        ]),
      ),
    [vehicles, trips, costRates],
  );

  return (
    <>
      <PageHeader
        title="Veículos"
        description={isLoading ? undefined : `${vehicles.length} cadastrado${vehicles.length === 1 ? "" : "s"}`}
        action={
          vehicles.length > 1 ? (
            <Button asChild variant="outline" size="sm" className="h-10 rounded-full">
              <Link href="/veiculos/ranking">
                <Medal /> Ranking {!isPro && <ProBadge />}
              </Link>
            </Button>
          ) : undefined
        }
      />
      {isLoading ? (
        <ListSkeleton rows={2} className="h-[190px]" />
      ) : vehicles.length ? (
        <ul className="grid gap-3">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              tripCount={summaries.get(vehicle.id)?.tripCount ?? 0}
              realCostPerKm={summaries.get(vehicle.id)?.tripCount ? summaries.get(vehicle.id)!.realCostPerKm : null}
              health={isPro ? (health.get(vehicle.id)?.overall ?? "unknown") : "unknown"}
              pro={isPro}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Truck}
          title="Nenhum veículo cadastrado"
          description="Cadastre seu veículo para estimar consumo e simular fretes."
        />
      )}

      {!isLoading && (
        <Button asChild size="lg" variant={vehicles.length ? "outline" : "default"} className="mt-4 w-full">
          <Link href="/veiculos/novo">
            <Plus /> Adicionar veículo
          </Link>
        </Button>
      )}
    </>
  );
}
