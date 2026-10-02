import { NextResponse } from "next/server";
import { errorResponse, parseBody } from "@/server/api";
import { requestPasswordReset } from "@/server/account";
import { passwordResetRequestSchema } from "@/server/validation";

/** Sempre 202: a resposta não revela se o e-mail está cadastrado. */
export async function POST(request: Request) {
  try {
    const { email } = await parseBody(request, passwordResetRequestSchema);
    await requestPasswordReset(email);
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
