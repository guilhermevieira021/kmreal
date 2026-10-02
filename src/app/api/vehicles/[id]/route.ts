import { authed, parseBody } from "@/server/api";
import { notFound } from "@/server/errors";
import { vehicles } from "@/server/repositories";
import { vehicleInputSchema } from "@/server/validation";

type Params = { id: string };

export const GET = authed<Params>(async ({ userId, params }) => {
  const found = await vehicles.get(userId, params.id);
  if (!found) throw notFound("Veículo");
  return found;
});

export const PATCH = authed<Params>(async ({ request, userId, params }) =>
  vehicles.update(userId, params.id, await parseBody(request, vehicleInputSchema.partial())),
);

export const DELETE = authed<Params>(({ userId, params }) => vehicles.remove(userId, params.id));
