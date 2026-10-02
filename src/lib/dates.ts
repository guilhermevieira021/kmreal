/** Datas de domínio são strings "YYYY-MM-DD" no fuso local, sem horário. */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function startOfMonthISO(date: Date): string {
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Intervalo fechado de datas [start, end]. `start` nulo = sem limite inferior. */
export interface DateRange {
  start: string | null;
  end: string;
}

export function isInRange(iso: string, range: DateRange): boolean {
  return (range.start === null || iso >= range.start) && iso <= range.end;
}
