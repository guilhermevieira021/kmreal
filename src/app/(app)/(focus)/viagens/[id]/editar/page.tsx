import type { Metadata } from "next";
import { EditTrip } from "@/features/trips/new-trip";

export const metadata: Metadata = { title: "Editar viagem" };

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditTrip id={id} />;
}
