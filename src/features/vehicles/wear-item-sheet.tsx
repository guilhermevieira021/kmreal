"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChipGroup } from "@/components/shared/chip-group";
import { NumberField, TextField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { wearItemPerKm } from "@/lib/calculations/real-cost";
import { MAINTENANCE_TYPE_LABELS } from "@/lib/constants";
import { formatCurrencyPerKm, formatNumber, parseDecimal } from "@/lib/format";
import { generateId } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import type { MaintenanceType, Vehicle, WearItem } from "@/types";

/** Tipos que fazem sentido como item de vida útil ("Outro" = personalizado). */
const WEAR_TYPES: MaintenanceType[] = ["tires", "oil", "brakes", "belt", "clutch", "service", "other"];
const DEFAULT_LABELS: Partial<Record<MaintenanceType, string>> = { oil: "Óleo e filtros", other: "" };

const toInput = (n: number) => (n ? formatNumber(n).replace(/\./g, "") : "");

interface WearItemSheetProps {
  vehicle: Vehicle;
  /** Item em edição; ausente = novo item */
  item?: WearItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WearItemSheet({ vehicle, item, open, onOpenChange }: WearItemSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>{item ? item.label : "Novo item de vida útil"}</SheetTitle>
        <SheetDescription>Quanto custa a troca e quantos km dura. Vira custo de desgaste por km.</SheetDescription>
        {open && <WearItemForm vehicle={vehicle} item={item} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function WearItemForm({ vehicle, item, onDone }: { vehicle: Vehicle; item?: WearItem; onDone: () => void }) {
  const { updateVehicle } = useData();
  const [type, setType] = useState<MaintenanceType>(item?.type ?? "tires");
  const [label, setLabel] = useState(item?.label ?? MAINTENANCE_TYPE_LABELS.tires);
  const [cost, setCost] = useState(item ? toInput(item.cost) : "");
  const [lifespan, setLifespan] = useState(item ? toInput(item.lifespanKm) : "");
  const [errors, setErrors] = useState<{ label?: string; lifespan?: string }>({});
  const [pending, setPending] = useState(false);

  const costValue = Math.max(0, parseDecimal(cost) || 0);
  const lifespanValue = parseDecimal(lifespan) || 0;
  const perKm = wearItemPerKm({ cost: costValue, lifespanKm: lifespanValue });

  function changeType(next: MaintenanceType) {
    // Atualiza o nome só se ainda for o padrão do tipo anterior.
    const previousDefault = DEFAULT_LABELS[type] ?? MAINTENANCE_TYPE_LABELS[type];
    if (label === previousDefault || !label) setLabel(DEFAULT_LABELS[next] ?? MAINTENANCE_TYPE_LABELS[next]);
    setType(next);
  }

  async function save(nextItems: WearItem[], message: string) {
    setPending(true);
    try {
      await updateVehicle(vehicle.id, { wearItems: nextItems });
      toast.success(message);
      onDone();
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      label: label.trim() ? undefined : "Dê um nome ao item",
      lifespan: lifespanValue > 0 ? undefined : "Informe a vida útil em km",
    };
    setErrors(nextErrors);
    if (nextErrors.label || nextErrors.lifespan) return;

    const saved: WearItem = { id: item?.id ?? generateId(), type, label: label.trim(), cost: costValue, lifespanKm: lifespanValue };
    const nextItems = item
      ? vehicle.wearItems.map((i) => (i.id === item.id ? saved : i))
      : [...vehicle.wearItems, saved];
    save(nextItems, item ? "Item atualizado" : "Item adicionado");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <ChipGroup
        label="Tipo"
        value={type}
        onChange={changeType}
        options={WEAR_TYPES.map((t) => ({ value: t, label: t === "other" ? "Personalizado" : MAINTENANCE_TYPE_LABELS[t] }))}
      />
      <TextField
        id="wear-label"
        label="Nome"
        value={label}
        placeholder="Ex.: Bateria"
        onChange={(e) => setLabel(e.target.value)}
        error={errors.label}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField id="wear-cost" label="Valor da troca" prefix="R$" value={cost} onChange={(e) => setCost(e.target.value)} />
        <NumberField
          id="wear-lifespan"
          label="Vida útil"
          suffix="km"
          value={lifespan}
          onChange={(e) => setLifespan(e.target.value)}
          error={errors.lifespan}
        />
      </div>

      <div className="bg-muted/40 flex items-center justify-between rounded-2xl border px-4 py-3">
        <span className="text-muted-foreground text-sm">Custo de desgaste</span>
        <span className="text-lg font-bold tabular-nums">{formatCurrencyPerKm(perKm)}</span>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : "Salvar item"}
      </Button>
      {item && (
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={pending}
          onClick={() => save(vehicle.wearItems.filter((i) => i.id !== item.id), "Item removido")}
        >
          <Trash2 /> Remover item
        </Button>
      )}
    </form>
  );
}
