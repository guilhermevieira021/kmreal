import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { auth } from "@/auth";
import { HttpError } from "./errors";

type RouteContext<P> = { params: Promise<P> };

interface HandlerArgs<P> {
  request: Request;
  userId: string;
  params: P;
}

/** Converte erros em respostas JSON padronizadas: { error, issues? }. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 },
    );
  }
  if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  console.error("[api]", error);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

/**
 * Envolve um route handler que exige login: resolve a sessão, entrega o userId
 * e trata erros. Retornos `undefined` viram 204.
 */
export function authed<P = Record<string, never>>(handler: (args: HandlerArgs<P>) => Promise<unknown>) {
  return async (request: Request, context: RouteContext<P>) => {
    try {
      const session = await auth();
      const userId = session?.user?.id;
      if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      const result = await handler({ request, userId, params: await context.params });
      return result === undefined ? new NextResponse(null, { status: 204 }) : NextResponse.json(result);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await request.json());
}

/** Lê ListOptions da query string (?updatedSince=...&includeDeleted=1). */
export function listOptions(request: Request) {
  const params = new URL(request.url).searchParams;
  return {
    updatedSince: params.get("updatedSince") ?? undefined,
    includeDeleted: params.get("includeDeleted") === "1",
  };
}
