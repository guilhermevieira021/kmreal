import { addDays, fromISODate, toISODate } from "@/lib/dates";
import { formatDayMonth } from "@/lib/format";
import { periodRange, type PeriodId } from "@/lib/periods";
import type { Trip } from "@/types";
import { summarizeReal, type CostRates } from "./real-cost";
import { round2 } from "./trip";

export interface TrendBucket {
  key: string;
  /** Rótulo curto para o eixo */
  label: string;
  /** Rótulo completo para o tooltip */
  fullLabel: string;
  profit: number;
  revenue: number;
  tripCount: number;
}

const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const monthLong = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function bucketOf(trips: Trip[], rates: CostRates, start: string, end: string) {
  const s = summarizeReal(
    trips.filter((t) => t.date >= start && t.date <= end),
    rates,
  );
  return { profit: round2(s.realProfit), revenue: round2(s.revenue), tripCount: s.tripCount };
}

/**
 * Agrupa o lucro real no tempo, com granularidade adequada ao período:
 * 7 e 30 dias → por dia; 90 dias → por semana; todo período → por mês (até 12).
 */
export function buildProfitTrend(trips: Trip[], rates: CostRates, period: PeriodId, now: Date = new Date()): TrendBucket[] {
  const { start, end } = periodRange(period, now);

  if (period === "all") {
    const first = trips.reduce<string | null>((min, t) => (!min || t.date < min ? t.date : min), null);
    if (!first) return [];
    const firstDate = fromISODate(first);
    const months = Math.min(
      12,
      (now.getFullYear() - firstDate.getFullYear()) * 12 + now.getMonth() - firstDate.getMonth() + 1,
    );
    return Array.from({ length: months }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const mStart = toISODate(m);
      const mEnd = toISODate(new Date(m.getFullYear(), m.getMonth() + 1, 0));
      return {
        key: mStart,
        label: monthShort.format(m).replace(".", ""),
        fullLabel: monthLong.format(m),
        ...bucketOf(trips, rates, mStart, mEnd),
      };
    });
  }

  const step = period === "90d" ? 7 : 1;
  const buckets: TrendBucket[] = [];
  for (let cursor = start ?? end; cursor <= end; cursor = addDays(cursor, step)) {
    const last = addDays(cursor, step - 1);
    const bEnd = last > end ? end : last;
    buckets.push({
      key: cursor,
      label: formatDayMonth(cursor),
      fullLabel: step === 1 ? formatDayMonth(cursor) : `${formatDayMonth(cursor)} a ${formatDayMonth(bEnd)}`,
      ...bucketOf(trips, rates, cursor, bEnd),
    });
  }
  return buckets;
}
