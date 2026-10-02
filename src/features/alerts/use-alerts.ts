"use client";

import { useMemo } from "react";
import { buildAlerts } from "@/lib/calculations/alerts";
import { useData } from "@/providers/data-provider";

/** Alertas operacionais atuais (financeiros, saúde dos veículos, meta). */
export function useAlerts() {
  const { trips, vehicles, maintenances, costRates, settings } = useData();
  return useMemo(
    () =>
      buildAlerts({
        trips,
        vehicles,
        maintenances,
        rates: costRates,
        monthlyGoal: settings?.monthlyProfitGoal ?? null,
      }),
    [trips, vehicles, maintenances, costRates, settings],
  );
}
