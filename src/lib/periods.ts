import { addDays, isInRange, startOfMonthISO, toISODate, type DateRange } from "./dates";

export type PeriodId = "today" | "7d" | "30d" | "90d" | "month" | "all";

export const PERIOD_LABELS: Record<PeriodId, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  month: "Este mês",
  all: "Todo período",
};

/** Conjuntos de períodos usados em cada tela. */
export const HEALTH_PERIODS: PeriodId[] = ["7d", "30d", "90d", "all"];
export const HISTORY_PERIODS: PeriodId[] = ["today", "7d", "30d", "month", "all"];
export const RANKING_PERIODS: PeriodId[] = ["30d", "90d", "all"];

const ROLLING_DAYS: Partial<Record<PeriodId, number>> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };

export function periodRange(period: PeriodId, now: Date = new Date()): DateRange {
  const end = toISODate(now);
  if (period === "all") return { start: null, end };
  if (period === "month") return { start: startOfMonthISO(now), end };
  return { start: addDays(end, -((ROLLING_DAYS[period] ?? 1) - 1)), end };
}

export function filterByRange<T extends { date: string }>(items: T[], range: DateRange): T[] {
  return items.filter((item) => isInRange(item.date, range));
}

export function filterByPeriod<T extends { date: string }>(items: T[], period: PeriodId, now: Date = new Date()): T[] {
  return filterByRange(items, periodRange(period, now));
}

/** Janela de N dias terminando hoje e a janela anterior de mesmo tamanho (para comparações). */
export function rollingWindows(days: number, now: Date = new Date()): { current: DateRange; previous: DateRange } {
  const end = toISODate(now);
  const start = addDays(end, -(days - 1));
  return {
    current: { start, end },
    previous: { start: addDays(start, -days), end: addDays(start, -1) },
  };
}
