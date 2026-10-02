import type { Metadata } from "next";
import { MonthOverview } from "@/features/dashboard/month-overview";

export const metadata: Metadata = { title: "Início" };

export default function DashboardPage() {
  return <MonthOverview />;
}
