"use client";

import { useRouter } from "next/navigation";
import { SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Button } from "@/components/ui/button";
import { DEFAULT_WEAR_ITEMS, EMPTY_FIXED_COSTS } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { generateId } from "@/lib/utils";
import { useData, useVehicle } from "@/providers/data-provider";
import { useVehicleHealth } from "./use-vehicle-health";
import { VehicleForm, type VehicleBasics } from "./vehicle-form";

/** Tela de criação (sem id) ou edição dos dados básicos (com id) de um veículo. */
export function VehicleEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { createVehicle, updateVehicle, deleteVehicle } = useData();
  const { vehicle, isLoading } = useVehicle(id ?? "");
  const currentKm = useVehicleHealth(id ?? "")?.odometer?.km ?? null;
  const isEditing = Boolean(id);
  const title = isEditing ? "Editar veículo" : "Novo veículo";
  const backHref = id ? `/veiculos/${id}` : "/veiculos";

  async function handleSubmit({ odometerKm, ...basics }: VehicleBasics) {
    const odometer = odometerKm !== null ? { km: odometerKm, date: todayISO() } : null;
    if (id) {
      // Só registra nova leitura do hodômetro se o motorista mudou o KM.
      await updateVehicle(id, { ...basics, ...(odometerKm !== null && odometerKm !== currentKm ? { odometer } : {}) });
      toast.success("Veículo atualizado");
      router.push(backHref);
      return;
    }
    const created = await createVehicle({
      ...basics,
      odometer,
      fixedCosts: EMPTY_FIXED_COSTS,
      wearItems: DEFAULT_WEAR_ITEMS.map((item) => ({ ...item, id: generateId() })),
    });
    toast.success("Veículo cadastrado. Agora informe os custos fixos.");
    router.push(`/veiculos/${created.id}`);
  }

  async function handleDelete() {
    if (!id) return;
    router.replace("/veiculos");
    await deleteVehicle(id);
    toast.success("Veículo excluído");
  }

  if (isEditing && isLoading) {
    return (
      <>
        <PageHeader title={title} backHref={backHref} />
        <ListSkeleton rows={4} className="h-16" />
      </>
    );
  }

  if (isEditing && !vehicle) {
    return (
      <>
        <PageHeader title={title} backHref="/veiculos" />
        <EmptyState icon={SearchX} title="Veículo não encontrado" />
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} backHref={backHref} />
      <VehicleForm
        initialValues={vehicle}
        currentKm={currentKm}
        submitLabel={isEditing ? "Salvar alterações" : "Cadastrar veículo"}
        onSubmit={handleSubmit}
      />
      {vehicle && (
        <ConfirmDialog
          title="Excluir veículo?"
          description={`"${vehicle.name}" será removido. As viagens já registradas não serão apagadas.`}
          confirmLabel="Excluir"
          pendingLabel="Excluindo..."
          onConfirm={handleDelete}
          trigger={
            <Button variant="ghost" size="lg" className="text-destructive hover:text-destructive mt-2 w-full">
              <Trash2 /> Excluir veículo
            </Button>
          }
        />
      )}
    </>
  );
}
