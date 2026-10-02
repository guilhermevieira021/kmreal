import type { Metadata } from "next";
import { VehicleHealthView } from "@/features/vehicles/vehicle-health-view";

export const metadata: Metadata = { title: "Saúde do veículo" };

export default async function VehicleHealthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VehicleHealthView id={id} />;
}
