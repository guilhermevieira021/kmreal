import type { Metadata } from "next";
import { HealthView } from "@/features/health/health-view";

export const metadata: Metadata = { title: "Saúde financeira" };

export default function HealthPage() {
  return <HealthView />;
}
