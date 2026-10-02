"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Repeat2, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { Section } from "@/components/shared/section";
import { Button } from "@/components/ui/button";
import { calculateRealTrip } from "@/lib/calculations/real-cost";
import { formatCurrency, formatCurrencyPerKm, formatDate, formatKm, formatNumber } from "@/lib/format";
import { useData, useTrip } from "@/providers/data-provider";
import { TripResults } from "./trip-results";
import { repeatTripHref } from "./trip-wizard/prefill";

interface TripDetailProps {
  id: string;
  justSaved?: boolean;
}

type Row = [label: string, value: string, hint?: string];

function DetailList({ rows }: { rows: Row[] }) {
  return (
    <dl className="bg-card divide-y rounded-2xl border shadow-xs">
      {rows.map(([label, value, hint]) => (
        <div key={label} className="flex justify-between gap-4 px-4 py-3 text-sm">
          <dt className="text-muted-foreground shrink-0">{label}</dt>
          <dd className="text-right font-medium tabular-nums">
            {value}
            {hint && <span className="text-muted-foreground block text-xs font-normal">{hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function TripDetail({ id, justSaved }: TripDetailProps) {
  const router = useRouter();
  const { trip, isLoading } = useTrip(id);
  const { vehicles, costRates, deleteTrip } = useData();

  if (isLoading) {
    return (
      <>
        <PageHeader title="Viagem" backHref="/historico" />
        <ListSkeleton rows={2} className="h-40" />
      </>
    );
  }

  if (!trip) {
    return (
      <>
        <PageHeader title="Viagem" backHref="/historico" />
        <EmptyState icon={SearchX} title="Viagem não encontrada" />
      </>
    );
  }

  const summary = calculateRealTrip(trip, costRates);
  const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
  const rates = vehicle ? costRates.get(vehicle.id) : undefined;

  const operationalRows: Row[] = [
    ["Veículo", vehicle?.name ?? "—"],
    ["KM rodados", formatKm(trip.km)],
    ["Receita do frete", formatCurrency(trip.freightRevenue)],
    [
      "Combustível",
      formatCurrency(summary.fuelCost),
      `${formatNumber(trip.fuelLiters)} L × ${formatCurrency(trip.fuelPricePerLiter)}`,
    ],
    ["Pedágios", formatCurrency(trip.tolls)],
    ["Ajudante", formatCurrency(trip.helperPayment)],
    ["Outros custos", formatCurrency(trip.otherCosts)],
  ];

  const allocatedRows: Row[] = rates
    ? [
        ["Custos fixos", formatCurrency(summary.fixedCosts), formatCurrencyPerKm(rates.fixedPerKm)],
        ["Desgaste (vida útil)", formatCurrency(summary.wearCosts), formatCurrencyPerKm(rates.wearPerKm)],
        ["Manutenções", formatCurrency(summary.maintenanceCosts), formatCurrencyPerKm(rates.maintenancePerKm)],
      ]
    : [];

  return (
    <>
      <PageHeader
        title={`Viagem de ${formatDate(trip.date)}`}
        backHref="/historico"
        action={
          <Button asChild variant="outline" size="sm" className="h-10 rounded-full">
            <Link href={`/viagens/${trip.id}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
        }
      />

      <TripResults summary={summary} />

      <Section title="Custos da viagem" className="mt-6">
        <DetailList rows={operationalRows} />
      </Section>

      {allocatedRows.length > 0 && (
        <Section title="Rateio do veículo" className="mt-6">
          <DetailList rows={allocatedRows} />
          <p className="text-muted-foreground px-1 text-xs">
            Custos que não aparecem na viagem, rateados pelo KM rodado. Ajuste em Veículos → {vehicle?.name}.
          </p>
        </Section>
      )}

      <div className="mt-6 grid gap-2">
        {justSaved && (
          <Button asChild size="lg">
            <Link href="/viagens/nova">
              <Plus /> Registrar outra viagem
            </Link>
          </Button>
        )}
        <Button asChild size="lg" variant="outline">
          <Link href={repeatTripHref(trip)}>
            <Repeat2 /> Repetir esta viagem
          </Link>
        </Button>
        <ConfirmDialog
          title="Excluir viagem?"
          description="Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          pendingLabel="Excluindo..."
          onConfirm={async () => {
            // Navega antes de remover para não exibir o estado "não encontrada".
            router.replace("/historico");
            await deleteTrip(trip.id);
            toast.success("Viagem excluída");
          }}
          trigger={
            <Button variant="ghost" size="lg" className="text-destructive hover:text-destructive">
              <Trash2 /> Excluir viagem
            </Button>
          }
        />
      </div>
    </>
  );
}
