import { authed, listOptions, parseBody } from "@/server/api";
import { maintenances } from "@/server/repositories";
import { maintenanceInputSchema } from "@/server/validation";

/** GET: lista (?updatedSince, ?includeDeleted) · POST: cria */
export const GET = authed(({ request, userId }) => maintenances.list(userId, listOptions(request)));

export const POST = authed(async ({ request, userId }) =>
  maintenances.create(userId, await parseBody(request, maintenanceInputSchema)),
);
