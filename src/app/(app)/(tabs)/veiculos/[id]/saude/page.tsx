import type { Metadata } from "next";
import { ProPaywallPage } from "@/features/subscription/pro-paywall-page";
import { VehicleHealthView } from "@/features/vehicles/vehicle-health-view";
import { currentUserHasPro } from "@/server/page-guard";

export const metadata: Metadata = { title: "Saúde do veículo" };

export default async function VehicleHealthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await currentUserHasPro())) return <ProPaywallPage feature="Saúde do veículo" backHref={`/veiculos/${id}`} />;
  return <VehicleHealthView id={id} />;
}
