import { authed, parseBody } from "@/server/api";
import { settings } from "@/server/repositories";
import { settingsInputSchema } from "@/server/validation";

export const GET = authed(({ userId }) => settings.get(userId));

export const PATCH = authed(async ({ request, userId }) =>
  settings.update(userId, await parseBody(request, settingsInputSchema)),
);
