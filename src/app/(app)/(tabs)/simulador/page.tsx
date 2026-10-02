import type { Metadata } from "next";
import { FreightSimulator } from "@/features/simulator/freight-simulator";

export const metadata: Metadata = { title: "Simulador de frete" };

export default function SimulatorPage() {
  return <FreightSimulator />;
}
