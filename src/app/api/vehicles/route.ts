import { authed, listOptions, parseBody } from "@/server/api";
import { vehicles } from "@/server/repositories";
import { vehicleInputSchema } from "@/server/validation";

/** GET: lista (?updatedSince, ?includeDeleted) · POST: cria */
export const GET = authed(({ request, userId }) => vehicles.list(userId, listOptions(request)));

export const POST = authed(async ({ request, userId }) =>
  vehicles.create(userId, await parseBody(request, vehicleInputSchema)),
);
