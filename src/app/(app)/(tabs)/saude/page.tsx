import type { Metadata } from "next";
import { HealthView } from "@/features/health/health-view";
import { ProPaywallPage } from "@/features/subscription/pro-paywall-page";
import { currentUserHasPro } from "@/server/page-guard";

export const metadata: Metadata = { title: "Saúde financeira" };

export default async function HealthPage() {
  if (!(await currentUserHasPro())) return <ProPaywallPage feature="Saúde financeira" backHref="/dashboard" />;
  return <HealthView />;
}
