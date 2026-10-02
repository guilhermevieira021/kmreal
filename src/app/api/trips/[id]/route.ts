import { authed, parseBody } from "@/server/api";
import { notFound } from "@/server/errors";
import { trips } from "@/server/repositories";
import { tripInputSchema } from "@/server/validation";

type Params = { id: string };

export const GET = authed<Params>(async ({ userId, params }) => {
  const found = await trips.get(userId, params.id);
  if (!found) throw notFound("Viagem");
  return found;
});

export const PATCH = authed<Params>(async ({ request, userId, params }) =>
  trips.update(userId, params.id, await parseBody(request, tripInputSchema.partial())),
);

export const DELETE = authed<Params>(({ userId, params }) => trips.remove(userId, params.id));
