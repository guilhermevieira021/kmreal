import { requirePro } from "@/server/subscription";
import { authed, parseBody } from "@/server/api";
import { notFound } from "@/server/errors";
import { maintenances } from "@/server/repositories";
import { maintenanceInputSchema } from "@/server/validation";

type Params = { id: string };

export const GET = authed<Params>(async ({ userId, params }) => {
  const found = await maintenances.get(userId, params.id);
  if (!found) throw notFound("Manutenção");
  return found;
});

export const PATCH = authed<Params>(async ({ request, userId, params }) => {
  await requirePro(userId);
  return maintenances.update(userId, params.id, await parseBody(request, maintenanceInputSchema.partial()));
});

export const DELETE = authed<Params>(async ({ userId, params }) => {
  await requirePro(userId);
  return maintenances.remove(userId, params.id);
});
