"use client";

import { useRouter } from "next/navigation";
import { SearchX } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useData, useTrip } from "@/providers/data-provider";
import type { TripInput } from "@/types";
import type { TripWizardInitial } from "./trip-wizard/prefill";
import { TripWizard } from "./trip-wizard/trip-wizard";

function WizardSkeleton() {
  return (
    <div className="grid gap-4 p-4 pt-16" aria-busy="true">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-16 rounded-2xl" />
    </div>
  );
}

export function NewTrip({ initial }: { initial?: TripWizardInitial }) {
  const router = useRouter();
  const { vehicles, trips, costRates, isLoading, createTrip } = useData();

  async function handleSubmit(input: TripInput) {
    const trip = await createTrip(input);
    toast.success("Viagem salva");
    router.replace(`/viagens/${trip.id}?salva=1`);
  }

  // O wizard só monta após o carregamento para pré-selecionar veículo e preço do combustível.
  if (isLoading) return <WizardSkeleton />;

  return (
    <TripWizard
      vehicles={vehicles}
      recentTrips={trips}
      costRates={costRates}
      initial={initial}
      closeHref="/dashboard"
      onSubmit={handleSubmit}
    />
  );
}

export function EditTrip({ id }: { id: string }) {
  const router = useRouter();
  const { vehicles, trips, costRates, isLoading, updateTrip } = useData();
  const { trip } = useTrip(id);

  async function handleSubmit(input: TripInput) {
    await updateTrip(id, input);
    toast.success("Viagem atualizada");
    router.replace(`/viagens/${id}`);
  }

  if (isLoading) return <WizardSkeleton />;
  if (!trip) {
    return (
      <div className="p-4 pt-16">
        <EmptyState icon={SearchX} title="Viagem não encontrada" />
      </div>
    );
  }

  return (
    <TripWizard
      vehicles={vehicles}
      recentTrips={trips}
      costRates={costRates}
      editing={trip}
      closeHref={`/viagens/${id}`}
      onSubmit={handleSubmit}
    />
  );
}
