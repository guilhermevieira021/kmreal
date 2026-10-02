import { authed, parseBody } from "@/server/api";
import { notFound } from "@/server/errors";
import { vehicles } from "@/server/repositories";
import { requirePro } from "@/server/subscription";
import { vehicleInputSchema } from "@/server/validation";

type Params = { id: string };

export const GET = authed<Params>(async ({ userId, params }) => {
  const found = await vehicles.get(userId, params.id);
  if (!found) throw notFound("Veículo");
  return found;
});

export const PATCH = authed<Params>(async ({ request, userId, params }) => {
  const changes = await parseBody(request, vehicleInputSchema.partial());
  // Custos fixos e vida útil (custo real) são PRO; dados básicos do veículo são FREE.
  if (changes.fixedCosts !== undefined || changes.wearItems !== undefined) await requirePro(userId);
  return vehicles.update(userId, params.id, changes);
});

export const DELETE = authed<Params>(({ userId, params }) => vehicles.remove(userId, params.id));
