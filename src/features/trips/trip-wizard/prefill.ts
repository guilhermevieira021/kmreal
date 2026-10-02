import type { Trip } from "@/types";

/**
 * Pré-preenchimento do fluxo de nova viagem via URL
 * (vindo do simulador ou de "Repetir esta viagem").
 */
export interface TripWizardInitial {
  vehicleId?: string;
  freightRevenue?: string;
  km?: string;
  tolls?: string;
  helperPayment?: string;
}

export const PREFILL_PARAMS = {
  vehicleId: "veiculo",
  freightRevenue: "frete",
  km: "km",
  tolls: "pedagio",
  helperPayment: "ajudante",
} as const satisfies Record<keyof TripWizardInitial, string>;

type PrefillParams = Partial<Record<(typeof PREFILL_PARAMS)[keyof TripWizardInitial], string>>;

export function initialFromParams(params: PrefillParams): TripWizardInitial {
  return Object.fromEntries(
    Object.entries(PREFILL_PARAMS)
      .map(([field, param]) => [field, params[param]])
      .filter(([, value]) => value),
  );
}

const toParam = (n: number) => String(n).replace(".", ",");

export function repeatTripHref(trip: Trip): string {
  const params = new URLSearchParams();
  if (trip.vehicleId) params.set(PREFILL_PARAMS.vehicleId, trip.vehicleId);
  params.set(PREFILL_PARAMS.freightRevenue, toParam(trip.freightRevenue));
  params.set(PREFILL_PARAMS.km, toParam(trip.km));
  if (trip.tolls) params.set(PREFILL_PARAMS.tolls, toParam(trip.tolls));
  if (trip.helperPayment) params.set(PREFILL_PARAMS.helperPayment, toParam(trip.helperPayment));
  return `/viagens/nova?${params.toString()}`;
}
