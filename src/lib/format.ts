import { toISODate } from "./dates";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export const formatCurrency = (value: number) => currency.format(value);
export const formatNumber = (value: number) => decimal.format(value);
export const formatKm = (value: number) => `${decimal.format(value)} km`;
export const formatCurrencyPerKm = (value: number) => `${currency.format(value)}/km`;
export const formatPercent = (value: number) => `${decimal.format(value)}%`;

/** "R$ 1.234,56" → { symbol: "R$", amount: "1.234,56" }, para destacar o número. */
export function splitCurrency(value: number) {
  const formatted = currency.format(value).replace(/ /g, " ");
  const match = formatted.match(/^(-?)\s*R\$\s*(.+)$/);
  return match ? { symbol: `${match[1]}R$`, amount: match[2] } : { symbol: "", amount: formatted };
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });

/** Partes de uma data YYYY-MM-DD para exibição em bloco: dia e dia da semana. */
export function dateParts(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return { day: String(date.getUTCDate()).padStart(2, "0"), weekday: weekday.format(date).replace(".", "") };
}

/** Datas de viagem são armazenadas como "YYYY-MM-DD" (sem fuso). */
export const formatDate = (isoDate: string) => shortDate.format(new Date(`${isoDate}T00:00:00Z`));

export const formatMonthYear = (date: Date) => {
  const label = monthYear.format(new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const todayISO = () => toISODate(new Date());

/** "+12%" / "−5%" (sinal sempre visível). */
export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${decimal.format(Math.abs(value))}%`;
}

export const formatDayMonth = (isoDate: string) => formatDate(isoDate).slice(0, 5);

/** Texto normalizado para busca: minúsculo e sem acentos. */
export const normalizeSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Converte texto digitado ("1.234,56" ou "1234.56") em número. Vazio = 0, inválido = NaN. */
export function parseDecimal(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}
