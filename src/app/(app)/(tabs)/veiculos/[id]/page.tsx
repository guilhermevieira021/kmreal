import type { Metadata } from "next";
import { VehicleDetail } from "@/features/vehicles/vehicle-detail";

export const metadata: Metadata = { title: "Veículo" };

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VehicleDetail id={id} />;
}
