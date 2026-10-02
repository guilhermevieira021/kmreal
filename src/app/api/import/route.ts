import { authed, parseBody } from "@/server/api";
import { importLocalSnapshot } from "@/server/import";
import { importSnapshotSchema } from "@/server/validation";

/** Importa os dados do localStorage (protótipo) para a conta logada. Uma vez por conta. */
export const POST = authed(async ({ request, userId }) =>
  importLocalSnapshot(userId, await parseBody(request, importSnapshotSchema)),
);
