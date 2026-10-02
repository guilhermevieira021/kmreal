import { fromISODate } from "@/lib/dates";
import { normalizeSearch } from "@/lib/format";
import type { Trip, Vehicle } from "@/types";

const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" });
const weekdayName = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });

/** Textos pelos quais uma viagem pode ser encontrada: veículo e várias formas da data. */
function searchableText(trip: Trip, vehicle?: Vehicle): string {
  const [y, m, d] = trip.date.split("-");
  const date = fromISODate(trip.date);
  return normalizeSearch(
    [
      vehicle?.name ?? "sem veiculo",
      vehicle?.model ?? "",
      `${d}/${m}/${y}`,
      `${d}/${m}/${y.slice(2)}`,
      `${Number(d)}/${Number(m)}`,
      monthName.format(date),
      weekdayName.format(date),
      trip.date,
    ].join(" | "),
  );
}

/** Todas as palavras da busca precisam aparecer (ex.: "hr setembro"). */
export function searchTrips(trips: Trip[], vehicles: Vehicle[], query: string): Trip[] {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return trips;
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  return trips.filter((trip) => {
    const text = searchableText(trip, trip.vehicleId ? byId.get(trip.vehicleId) : undefined);
    return terms.every((term) => text.includes(term));
  });
}
