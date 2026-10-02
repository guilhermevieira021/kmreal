"use client";

import { calculateRealTrip } from "@/lib/calculations/real-cost";
import { useData, useVehicleNames } from "@/providers/data-provider";
import type { Trip } from "@/types";
import { TripListItem } from "./trip-list-item";

export function TripList({ trips }: { trips: Trip[] }) {
  const { costRates } = useData();
  const vehicleNames = useVehicleNames();

  return (
    <ul className="grid gap-2">
      {trips.map((trip) => (
        <TripListItem
          key={trip.id}
          trip={trip}
          summary={calculateRealTrip(trip, costRates)}
          vehicleName={trip.vehicleId ? vehicleNames.get(trip.vehicleId) : undefined}
        />
      ))}
    </ul>
  );
}
