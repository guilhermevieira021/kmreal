import { authed, listOptions, parseBody } from "@/server/api";
import { vehicles } from "@/server/repositories";
import { requirePro } from "@/server/subscription";
import { usesProVehicleData, vehicleInputSchema } from "@/server/validation";

/** GET: lista (?updatedSince, ?includeDeleted) · POST: cria */
export const GET = authed(({ request, userId }) => vehicles.list(userId, listOptions(request)));

export const POST = authed(async ({ request, userId }) => {
  const input = await parseBody(request, vehicleInputSchema);
  // Cadastro é FREE; preencher custos fixos/vida útil já na criação é PRO.
  if (usesProVehicleData(input)) await requirePro(userId);
  return vehicles.create(userId, input);
});
