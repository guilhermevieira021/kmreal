import type { Metadata } from "next";
import { TripHistory } from "@/features/trips/trip-history";

export const metadata: Metadata = { title: "Histórico" };

export default function HistoryPage() {
  return <TripHistory />;
}
