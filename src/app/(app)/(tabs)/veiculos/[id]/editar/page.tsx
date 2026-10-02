import type { Metadata } from "next";
import { VehicleEditor } from "@/features/vehicles/vehicle-editor";

export const metadata: Metadata = { title: "Editar veículo" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VehicleEditor id={id} />;
}
