import type { PeriodSummary, Trip, TripCosts, TripSummary, UnitMetrics } from "@/types";

export const round2 = (value: number) => Math.round(value * 100) / 100;
const perKm = (value: number, km: number) => (km > 0 ? round2(value / km) : 0);

export function calculateFuelCost({
  fuelLiters,
  fuelPricePerLiter,
}: Pick<TripCosts, "fuelLiters" | "fuelPricePerLiter">): number {
  return round2(fuelLiters * fuelPricePerLiter);
}

export function calculateTotalCosts(costs: TripCosts): number {
  return round2(calculateFuelCost(costs) + costs.tolls + costs.helperPayment + costs.otherCosts);
}

/** Receita/km, custo/km, lucro/km e margem a partir de totais. */
export function calculateUnitMetrics(revenue: number, costs: number, km: number): UnitMetrics {
  const profit = revenue - costs;
  return {
    revenuePerKm: perKm(revenue, km),
    costPerKm: perKm(costs, km),
    profitPerKm: perKm(profit, km),
    margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
  };
}

/** Indicadores de uma viagem. Na v1 a receita total é a receita do frete. */
export function calculateTripSummary(trip: Pick<Trip, "freightRevenue" | "km"> & TripCosts): TripSummary {
  const totalRevenue = round2(trip.freightRevenue);
  const totalCosts = calculateTotalCosts(trip);

  return {
    totalRevenue,
    fuelCost: calculateFuelCost(trip),
    totalCosts,
    netProfit: round2(totalRevenue - totalCosts),
    ...calculateUnitMetrics(totalRevenue, totalCosts, trip.km),
  };
}

export function isInMonth(isoDate: string, reference: Date): boolean {
  const [year, month] = isoDate.split("-").map(Number);
  return year === reference.getFullYear() && month === reference.getMonth() + 1;
}

export function summarizeTrips(trips: Trip[]): PeriodSummary {
  return trips.reduce<PeriodSummary>(
    (acc, trip) => {
      const s = calculateTripSummary(trip);
      return {
        revenue: round2(acc.revenue + s.totalRevenue),
        costs: round2(acc.costs + s.totalCosts),
        profit: round2(acc.profit + s.netProfit),
        km: round2(acc.km + trip.km),
        tripCount: acc.tripCount + 1,
      };
    },
    { revenue: 0, costs: 0, profit: 0, km: 0, tripCount: 0 },
  );
}

export function summarizeMonth(trips: Trip[], reference: Date = new Date()): PeriodSummary {
  return summarizeTrips(trips.filter((t) => isInMonth(t.date, reference)));
}

export function sortTripsByDateDesc(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
