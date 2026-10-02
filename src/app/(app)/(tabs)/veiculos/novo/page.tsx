import type { Metadata } from "next";
import { VehicleEditor } from "@/features/vehicles/vehicle-editor";

export const metadata: Metadata = { title: "Novo veículo" };

export default function NewVehiclePage() {
  return <VehicleEditor />;
}
