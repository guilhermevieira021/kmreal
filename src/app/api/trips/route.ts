import { authed, listOptions, parseBody } from "@/server/api";
import { trips } from "@/server/repositories";
import { tripInputSchema } from "@/server/validation";

/** GET: lista (?updatedSince, ?includeDeleted) · POST: cria */
export const GET = authed(({ request, userId }) => trips.list(userId, listOptions(request)));

export const POST = authed(async ({ request, userId }) =>
  trips.create(userId, await parseBody(request, tripInputSchema)),
);
