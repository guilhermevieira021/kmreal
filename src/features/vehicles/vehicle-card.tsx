import Link from "next/link";
import { ChevronRight, Truck } from "lucide-react";
import { Badge } from "@/components/shared/badge";
import type { HealthStatus } from "@/lib/calculations/vehicle-health";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { formatCurrencyPerKm, formatNumber } from "@/lib/format";
import type { Vehicle } from "@/types";
import { ProBadge } from "@/features/subscription/pro-lock";
import { HealthBadge } from "./health-badge";

interface VehicleCardProps {
  vehicle: Vehicle;
  tripCount: number;
  /** Custo real/km (null = sem viagens) */
  realCostPerKm: number | null;
  health: HealthStatus;
  /** FREE: custo real fica bloqueado */
  pro: boolean;
}

export function VehicleCard({ vehicle, tripCount, realCostPerKm, health, pro }: VehicleCardProps) {
  return (
    <li>
      <Link
        href={`/veiculos/${vehicle.id}`}
        aria-label={`Abrir ${vehicle.name}`}
        className="bg-card active:bg-accent block overflow-hidden rounded-2xl border shadow-xs transition-colors"
      >
        <div className="flex items-center gap-3 p-4">
          <span className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-xl">
            <Truck className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{vehicle.name}</p>
            <p className="text-muted-foreground truncate text-sm">{vehicle.model}</p>
          </div>
          {health !== "ok" && health !== "unknown" ? <HealthBadge status={health} /> : null}
          <ChevronRight className="text-muted-foreground size-5 shrink-0" />
        </div>
        <div className="bg-muted/40 grid grid-cols-2 divide-x border-t">
          <div className="px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">Consumo</p>
            <p className="tabular-nums">
              <span className="text-xl font-bold">{formatNumber(vehicle.kmPerLiter)}</span>{" "}
              <span className="text-muted-foreground text-sm font-semibold">km/l</span>
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">Custo real</p>
            {pro ? (
              <p className="text-xl font-bold tabular-nums">
                {realCostPerKm !== null ? formatCurrencyPerKm(realCostPerKm) : "—"}
              </p>
            ) : (
              <p className="mt-1">
                <ProBadge />
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
          <Badge>{FUEL_TYPE_LABELS[vehicle.fuelType]}</Badge>
          <span className="text-muted-foreground text-xs">
            {tripCount} {tripCount === 1 ? "viagem" : "viagens"}
          </span>
        </div>
      </Link>
    </li>
  );
}
