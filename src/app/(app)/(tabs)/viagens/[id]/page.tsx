import type { Metadata } from "next";
import { TripDetail } from "@/features/trips/trip-detail";

export const metadata: Metadata = { title: "Viagem" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salva?: string }>;
}

export default async function TripDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, { salva }] = await Promise.all([params, searchParams]);
  return <TripDetail id={id} justSaved={salva === "1"} />;
}
