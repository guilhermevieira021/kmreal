import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

/** Verificação pós-deploy: app no ar e banco acessível. */
export async function GET() {
  try {
    await getDb().$queryRaw`SELECT 1`;
    // "payments" indica só se o webhook está configurado (nunca expõe o segredo).
    const payments = process.env.CAKTO_WEBHOOK_SECRET ? "configured" : "not_configured";
    return NextResponse.json({ status: "ok", database: "ok", payments });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unreachable" }, { status: 503 });
  }
}
