import { addDays, startOfMonthISO, toISODate, type DateRange } from "@/lib/dates";
import { formatPercent, formatSignedPercent } from "@/lib/format";
import { rollingWindows } from "@/lib/periods";
import type { Trip } from "@/types";
import { percentChange, statsForRange } from "./metrics";
import { calculateRealTrip, type CostRates } from "./real-cost";
import { isInMonth } from "./trip";

export type InsightTone = "positive" | "negative" | "neutral";

export interface Insight {
  id: string;
  tone: InsightTone;
  direction: "up" | "down" | "flat";
  text: string;
}

/** Variação abaixo disso é tratada como estável. */
const STABLE_THRESHOLD = 2;

interface ComparisonWindow {
  current: DateRange;
  previous: DateRange;
  /** Complemento da frase: "que no mesmo período do mês passado" */
  label: string;
  /** Complemento para variação estável: "em relação ao mesmo período do mês passado" */
  stableLabel: string;
}

/**
 * Compara o mês corrente com o mesmo trecho do mês anterior. No início do mês
 * (menos de 7 dias) há poucos dados, então compara os últimos 30 dias.
 */
export function comparisonWindow(now: Date = new Date()): ComparisonWindow {
  const day = now.getDate();
  if (day >= 7) {
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevLast = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    return {
      current: { start: startOfMonthISO(now), end: toISODate(now) },
      previous: {
        start: toISODate(prevMonth),
        end: addDays(toISODate(prevMonth), Math.min(day, prevLast) - 1),
      },
      label: "que no mesmo período do mês passado",
      stableLabel: "em relação ao mesmo período do mês passado",
    };
  }
  return {
    ...rollingWindows(30, now),
    label: "que nos 30 dias anteriores",
    stableLabel: "em relação aos 30 dias anteriores",
  };
}

/** Frases do "Resumo rápido", geradas só por regras sobre os dados. */
export function buildInsights(trips: Trip[], rates: CostRates, now: Date = new Date()): Insight[] {
  const window = comparisonWindow(now);
  const current = statsForRange(trips, window.current, rates);
  const previous = statsForRange(trips, window.previous, rates);

  if (!current.tripCount) return [];
  if (!previous.tripCount) {
    return [
      {
        id: "no-baseline",
        tone: "neutral",
        direction: "flat",
        text: "Continue registrando: em breve você verá comparações com o período anterior.",
      },
    ];
  }

  const insights: Insight[] = [];

  const revenue = percentChange(current.revenue, previous.revenue);
  if (revenue !== null) {
    insights.push(
      Math.abs(revenue) < STABLE_THRESHOLD
        ? { id: "revenue", tone: "neutral", direction: "flat", text: `Seu faturamento está estável ${window.stableLabel}.` }
        : {
            id: "revenue",
            tone: revenue > 0 ? "positive" : "negative",
            direction: revenue > 0 ? "up" : "down",
            text: `Você faturou ${formatPercent(Math.abs(revenue))} ${revenue > 0 ? "mais" : "menos"} ${window.label}.`,
          },
    );
  }

  const costPerKm = percentChange(current.realCostPerKm, previous.realCostPerKm);
  if (costPerKm !== null && Math.abs(costPerKm) >= STABLE_THRESHOLD) {
    insights.push({
      id: "cost-per-km",
      tone: costPerKm < 0 ? "positive" : "negative",
      direction: costPerKm < 0 ? "down" : "up",
      text: `Seu custo real por KM ${costPerKm < 0 ? "caiu" : "subiu"} ${formatPercent(Math.abs(costPerKm))}.`,
    });
  }

  const profitPerKm = percentChange(current.realProfitPerKm, previous.realProfitPerKm);
  if (profitPerKm !== null) {
    insights.push(
      Math.abs(profitPerKm) < STABLE_THRESHOLD
        ? { id: "profit-per-km", tone: "neutral", direction: "flat", text: "Seu lucro real por KM se manteve estável." }
        : {
            id: "profit-per-km",
            tone: profitPerKm > 0 ? "positive" : "negative",
            direction: profitPerKm > 0 ? "up" : "down",
            text: `Seu lucro real por KM ${profitPerKm > 0 ? "aumentou" : "diminuiu"} (${formatSignedPercent(profitPerKm)}).`,
          },
    );
  }

  return insights;
}

/** Viagem de maior lucro real no mês corrente. */
export function bestTripOfMonth(trips: Trip[], rates: CostRates, now: Date = new Date()): Trip | null {
  let best: Trip | null = null;
  let bestProfit = -Infinity;
  for (const trip of trips) {
    if (!isInMonth(trip.date, now)) continue;
    const profit = calculateRealTrip(trip, rates).realProfit;
    if (profit > bestProfit) {
      best = trip;
      bestProfit = profit;
    }
  }
  return best;
}
