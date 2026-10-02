import type { Metadata } from "next";
import { VehicleRanking } from "@/features/ranking/vehicle-ranking";

export const metadata: Metadata = { title: "Ranking de veículos" };

export default function VehicleRankingPage() {
  return <VehicleRanking />;
}
