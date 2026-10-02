import type { Metadata } from "next";
import { VehicleRanking } from "@/features/ranking/vehicle-ranking";
import { ProPaywallPage } from "@/features/subscription/pro-paywall-page";
import { currentUserHasPro } from "@/server/page-guard";

export const metadata: Metadata = { title: "Ranking de veículos" };

export default async function VehicleRankingPage() {
  if (!(await currentUserHasPro())) return <ProPaywallPage feature="Ranking de veículos" backHref="/veiculos" />;
  return <VehicleRanking />;
}
