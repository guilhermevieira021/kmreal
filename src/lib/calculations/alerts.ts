import { formatCurrency, formatCurrencyPerKm, formatDate, formatKm, formatPercent } from "@/lib/format";
import { filterByRange, rollingWindows } from "@/lib/periods";
import type { Maintenance, MaintenanceType, Trip, Vehicle } from "@/types";
import { calculateGoalProgress } from "./goal";
import { percentChange, statsForRange } from "./metrics";
import { buildVehicleStats, rankVehicles } from "./ranking";
import { calculateRealTrip, summarizeReal, type CostRates } from "./real-cost";
import { isInMonth } from "./trip";
import { buildVehicleHealth, maintenanceLabel, type WearItemHealth } from "./vehicle-health";

export type AlertSeverity = "critical" | "warning" | "info" | "positive";

export interface OperationalAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  href?: string;
}

/** Variação mínima (%) para disparar alertas de tendência. */
const TREND_THRESHOLD = 5;
/** Mínimo de viagens em cada janela para comparar com segurança. */
const MIN_TRIPS = 2;

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };

interface AlertContext {
  trips: Trip[];
  vehicles: Vehicle[];
  maintenances: Maintenance[];
  rates: CostRates;
  monthlyGoal: number | null;
  now?: Date;
}

/** Títulos dos itens de vida útil, no tom de cada situação. */
const ITEM_TITLES: Partial<Record<MaintenanceType, { soon: string; overdue: string }>> = {
  oil: { soon: "Troca de óleo próxima", overdue: "Troca de óleo atrasada" },
  tires: { soon: "Pneu próximo do limite", overdue: "Pneus passaram do limite" },
  service: { soon: "Revisão próxima", overdue: "Revisão atrasada" },
};

function itemAlert(health: WearItemHealth, vehicle: Vehicle): OperationalAlert | null {
  if (health.status !== "soon" && health.status !== "overdue") return null;
  const overdue = health.status === "overdue";
  const titles = ITEM_TITLES[health.item.type];
  const remaining = Math.abs(health.remainingKm ?? 0);
  return {
    id: `wear-${vehicle.id}-${health.item.id}`,
    severity: overdue ? "critical" : "warning",
    title: titles ? titles[health.status] : `${health.item.label}: ${overdue ? "troca atrasada" : "troca próxima"}`,
    description: `${vehicle.name} · ${overdue ? `passou ${formatKm(remaining)} do previsto` : `faltam ~${formatKm(remaining)}`} (troca aos ${formatKm(health.dueKm ?? 0)}).`,
    href: `/veiculos/${vehicle.id}/saude`,
  };
}

/** Alertas operacionais gerados por regras sobre os dados existentes. */
export function buildAlerts({ trips, vehicles, maintenances, rates, monthlyGoal, now = new Date() }: AlertContext): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const windows = rollingWindows(30, now);
  const current = statsForRange(trips, windows.current, rates);
  const previous = statsForRange(trips, windows.previous, rates);
  const comparable = current.tripCount >= MIN_TRIPS && previous.tripCount >= MIN_TRIPS;

  // 1. Viagens com prejuízo real
  const lossTrips = filterByRange(trips, windows.current).filter((t) => calculateRealTrip(t, rates).realProfit < 0);
  if (lossTrips.length) {
    alerts.push({
      id: "loss-trips",
      severity: "critical",
      title: `${lossTrips.length} ${lossTrips.length === 1 ? "viagem deu" : "viagens deram"} prejuízo real`,
      description: "Nos últimos 30 dias, já contando custos fixos e manutenção. Confira no histórico.",
      href: "/historico",
    });
  }

  // 2. Saúde dos veículos: itens de vida útil, manutenções planejadas e seguro
  for (const vehicle of vehicles) {
    const health = buildVehicleHealth(vehicle, maintenances, trips, now);
    for (const item of health.items) {
      const alert = itemAlert(item, vehicle);
      if (alert) alerts.push(alert);
    }
    for (const p of health.planned) {
      if (p.status === "ok") continue;
      const overdue = p.status === "overdue";
      alerts.push({
        id: `planned-${p.maintenance.id}`,
        severity: overdue ? "critical" : "warning",
        title: `Manutenção ${overdue ? "atrasada" : "agendada"}: ${maintenanceLabel(p.maintenance)}`,
        description: `${vehicle.name} · ${overdue ? "prevista para" : p.daysLeft === 0 ? "hoje," : `em ${p.daysLeft} dias,`} ${formatDate(p.maintenance.date)}${p.maintenance.cost ? ` · ${formatCurrency(p.maintenance.cost)}` : ""}.`,
        href: `/veiculos/${vehicle.id}/saude`,
      });
    }
    if (health.insurance && health.insurance.status !== "ok") {
      const { daysLeft, expiresOn } = health.insurance;
      alerts.push({
        id: `insurance-${vehicle.id}`,
        severity: daysLeft < 0 ? "critical" : "warning",
        title: daysLeft < 0 ? "Seguro vencido" : daysLeft === 0 ? "Seguro vence hoje" : `Seguro vence em ${daysLeft} dias`,
        description: `${vehicle.name} · vencimento em ${formatDate(expiresOn)}.`,
        href: `/veiculos/${vehicle.id}`,
      });
    }
  }

  // 3. Custo real por km subiu
  const realCostChange = comparable ? percentChange(current.realCostPerKm, previous.realCostPerKm) : null;
  if (realCostChange !== null && realCostChange >= TREND_THRESHOLD) {
    alerts.push({
      id: "real-cost-up",
      severity: "warning",
      title: "Seu custo real por KM aumentou",
      description: `De ${formatCurrencyPerKm(previous.realCostPerKm)} para ${formatCurrencyPerKm(current.realCostPerKm)} (+${formatPercent(realCostChange)}) nos últimos 30 dias.`,
      href: "/saude",
    });
  }

  // 4. Lucro real por km em queda
  const profitChange = comparable ? percentChange(current.realProfitPerKm, previous.realProfitPerKm) : null;
  if (profitChange !== null && profitChange <= -TREND_THRESHOLD) {
    alerts.push({
      id: "profit-per-km-drop",
      severity: "warning",
      title: "Seu lucro real por KM caiu nos últimos 30 dias",
      description: `De ${formatCurrencyPerKm(previous.realProfitPerKm)} para ${formatCurrencyPerKm(current.realProfitPerKm)} (−${formatPercent(Math.abs(profitChange))}).`,
      href: "/saude",
    });
  }

  // 5. Combustível mais caro por km
  const fuelChange = comparable ? percentChange(current.fuelCostPerKm, previous.fuelCostPerKm) : null;
  if (fuelChange !== null && fuelChange >= TREND_THRESHOLD) {
    alerts.push({
      id: "fuel-up",
      severity: "warning",
      title: "Custos de combustível aumentaram",
      description: `O combustível passou de ${formatCurrencyPerKm(previous.fuelCostPerKm)} para ${formatCurrencyPerKm(current.fuelCostPerKm)} (+${formatPercent(fuelChange)}).`,
      href: "/saude",
    });
  }

  // 6. Meta mensal (sobre o lucro real)
  if (monthlyGoal) {
    const monthProfit = summarizeReal(
      trips.filter((t) => isInMonth(t.date, now)),
      rates,
    ).realProfit;
    const goal = calculateGoalProgress(monthlyGoal, monthProfit, now);
    if (goal.achieved) {
      alerts.push({
        id: "goal-achieved",
        severity: "positive",
        title: "Meta do mês atingida!",
        description: `Você já lucrou ${formatCurrency(goal.current)} de ${formatCurrency(goal.target)}.`,
      });
    } else if (!goal.onTrack) {
      alerts.push({
        id: "goal-behind",
        severity: "warning",
        title: "Você está abaixo da meta mensal",
        description: `Faltam ${formatCurrency(goal.remaining)}: cerca de ${formatCurrency(goal.dailyNeeded)} por dia até o fim do mês.`,
      });
    }
  }

  // 7. Melhor veículo (lucro real/km) mudou
  if (vehicles.length > 1) {
    const best = (from: Trip[]) => rankVehicles(buildVehicleStats(vehicles, from, rates), "profitPerKm").ranked;
    const nowRank = best(filterByRange(trips, windows.current));
    const beforeRank = best(filterByRange(trips, windows.previous));
    if (nowRank.length > 1 && beforeRank.length > 1 && nowRank[0].vehicle.id !== beforeRank[0].vehicle.id) {
      alerts.push({
        id: "best-vehicle-changed",
        severity: "info",
        title: "Seu melhor veículo mudou",
        description: `${nowRank[0].vehicle.name} agora lidera em lucro real por KM (${formatCurrencyPerKm(nowRank[0].summary.realProfitPerKm)}), passando ${beforeRank[0].vehicle.name}.`,
        href: "/veiculos/ranking",
      });
    }
  }

  // 8. Sem registros recentes
  if (trips.length && !filterByRange(trips, rollingWindows(7, now).current).length) {
    alerts.push({
      id: "no-recent-trips",
      severity: "info",
      title: "Nenhuma viagem nos últimos 7 dias",
      description: "Registre suas viagens para manter os indicadores atualizados.",
      href: "/viagens/nova",
    });
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
