import { Check, Truck } from "lucide-react";
import { FUEL_TYPE_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Vehicle } from "@/types";

interface VehiclePickerProps {
  vehicles: Vehicle[];
  value: string;
  onSelect: (vehicleId: string) => void;
  /** Mostra a opção "Sem veículo" */
  allowNone?: boolean;
}

/** Lista de veículos como opções grandes, fáceis de tocar. */
export function VehiclePicker({ vehicles, value, onSelect, allowNone = false }: VehiclePickerProps) {
  const options = [
    ...vehicles.map((v) => ({
      id: v.id,
      title: v.name,
      subtitle: `${FUEL_TYPE_LABELS[v.fuelType]} · ${formatNumber(v.kmPerLiter)} km/l`,
    })),
    ...(allowNone ? [{ id: "", title: "Sem veículo", subtitle: "Não vincular a um veículo" }] : []),
  ];

  return (
    <div role="radiogroup" aria-label="Veículo" className="grid gap-2">
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id || "none"}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(option.id)}
            className={cn(
              "bg-card flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all active:scale-[0.99]",
              selected ? "border-primary" : "border-border",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <Truck className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{option.title}</span>
              <span className="text-muted-foreground block truncate text-sm">{option.subtitle}</span>
            </span>
            {selected && <Check className="size-5 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
