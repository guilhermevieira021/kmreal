import type { Metadata } from "next";
import { NewTrip } from "@/features/trips/new-trip";
import { initialFromParams } from "@/features/trips/trip-wizard/prefill";

export const metadata: Metadata = { title: "Nova viagem" };

interface PageProps {
  /** Pré-preenchimento vindo do simulador ou de "Repetir esta viagem" */
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function NewTripPage({ searchParams }: PageProps) {
  return <NewTrip initial={initialFromParams(await searchParams)} />;
}
