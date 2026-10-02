"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChipGroup } from "@/components/shared/chip-group";
import { NumberField, TextField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { daysFromToday } from "@/lib/calculations/vehicle-health";
import { MAINTENANCE_TYPE_LABELS, MAINTENANCE_TYPES } from "@/lib/constants";
import { formatNumber, parseDecimal, todayISO } from "@/lib/format";
import { useData } from "@/providers/data-provider";
import type { Maintenance, MaintenanceInput, MaintenanceStatus, MaintenanceType } from "@/types";

const toInput = (n: number | null | undefined) => (n ? formatNumber(n).replace(/\./g, "") : "");

export interface MaintenanceSheetState {
  /** Registro em edição; ausente = novo */
  maintenance?: Maintenance;
  /** Valores iniciais para um novo registro */
  defaults?: Partial<MaintenanceInput>;
}

interface MaintenanceSheetProps {
  vehicleId: string;
  /** KM atual estimado, sugerido em manutenções realizadas */
  currentKm: number | null;
  state: MaintenanceSheetState | null;
  onClose: () => void;
}

export function MaintenanceSheet({ vehicleId, currentKm, state, onClose }: MaintenanceSheetProps) {
  const editing = state?.maintenance;
  return (
    <Sheet open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetTitle>{editing ? "Editar manutenção" : "Registrar manutenção"}</SheetTitle>
        {state && <MaintenanceForm vehicleId={vehicleId} currentKm={currentKm} state={state} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function MaintenanceForm({
  vehicleId,
  currentKm,
  state,
  onDone,
}: {
  vehicleId: string;
  currentKm: number | null;
  state: MaintenanceSheetState;
  onDone: () => void;
}) {
  const { createMaintenance, updateMaintenance, deleteMaintenance } = useData();
  const initial = { ...state.defaults, ...state.maintenance };
  const [status, setStatus] = useState<MaintenanceStatus>(initial.status ?? "done");
  const [type, setType] = useState<MaintenanceType>(initial.type ?? "oil");
  const [description, setDescription] = useState(initial.description ?? "");
  const [cost, setCost] = useState(toInput(initial.cost));
  const [date, setDate] = useState(initial.date ?? todayISO());
  const [km, setKm] = useState(toInput(initial.odometerKm ?? (initial.status === "planned" ? null : currentKm)));
  const [errors, setErrors] = useState<{ description?: string; date?: string; km?: string }>({});
  const [pending, setPending] = useState(false);

  function changeStatus(next: MaintenanceStatus) {
    setStatus(next);
    // Ajusta sugestões ao alternar: realizada = hoje e KM atual; planejada = daqui a 30 dias.
    if (next === "planned" && date <= todayISO()) setDate(daysFromToday(30));
    if (next === "done" && date > todayISO()) setDate(todayISO());
    if (next === "done" && !km) setKm(toInput(currentKm));
  }

  async function run(action: () => Promise<unknown>, message: string) {
    setPending(true);
    try {
      await action();
      toast.success(message);
      onDone();
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const kmValue = km.trim() ? parseDecimal(km) : null;
    const nextErrors = {
      description: type === "other" && !description.trim() ? "Descreva a manutenção" : undefined,
      date: !date
        ? "Informe a data"
        : status === "done" && date > todayISO()
          ? "Manutenção realizada não pode ter data futura"
          : undefined,
      km: kmValue !== null && !(kmValue >= 0) ? "KM inválido" : undefined,
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const input: MaintenanceInput = {
      vehicleId,
      type,
      description: description.trim(),
      status,
      date,
      odometerKm: kmValue,
      cost: Math.max(0, parseDecimal(cost) || 0),
    };
    if (state.maintenance) run(() => updateMaintenance(state.maintenance!.id, input), "Manutenção atualizada");
    else run(() => createMaintenance(input), status === "done" ? "Manutenção registrada" : "Manutenção planejada");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <ChipGroup
        label="Situação"
        value={status}
        onChange={changeStatus}
        options={[
          { value: "done", label: "Já realizada" },
          { value: "planned", label: "Planejada" },
        ]}
      />
      <ChipGroup
        label="Tipo"
        value={type}
        onChange={setType}
        options={MAINTENANCE_TYPES.map((t) => ({ value: t, label: MAINTENANCE_TYPE_LABELS[t] }))}
      />
      <TextField
        id="maintenance-description"
        label={type === "other" ? "Descrição" : "Observação (opcional)"}
        value={description}
        placeholder={type === "other" ? "Ex.: Bateria" : "Ex.: Óleo 15W40 + filtros"}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField id="maintenance-cost" label="Valor" prefix="R$" value={cost} onChange={(e) => setCost(e.target.value)} />
        <TextField
          id="maintenance-date"
          label={status === "done" ? "Data" : "Previsto para"}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
      </div>
      <NumberField
        id="maintenance-km"
        label={status === "done" ? "KM do veículo" : "Ou ao atingir (opcional)"}
        suffix="km"
        value={km}
        onChange={(e) => setKm(e.target.value)}
        hint={status === "done" ? "Usado para prever a próxima troca." : "Vence pela data ou pelo KM, o que vier antes."}
        error={errors.km}
      />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando..." : status === "done" ? "Salvar manutenção" : "Salvar planejamento"}
      </Button>

      {state.maintenance?.status === "planned" && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pending}
          onClick={() =>
            run(
              () =>
                updateMaintenance(state.maintenance!.id, {
                  status: "done",
                  date: todayISO(),
                  odometerKm: currentKm,
                }),
              "Manutenção marcada como realizada",
            )
          }
        >
          <CircleCheck /> Marcar como realizada hoje
        </Button>
      )}
      {state.maintenance && (
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={pending}
          onClick={() => run(() => deleteMaintenance(state.maintenance!.id), "Manutenção excluída")}
        >
          <Trash2 /> Excluir
        </Button>
      )}
    </form>
  );
}
