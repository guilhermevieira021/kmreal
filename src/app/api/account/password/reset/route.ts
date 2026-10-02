import { NextResponse } from "next/server";
import { errorResponse, parseBody } from "@/server/api";
import { resetPassword } from "@/server/account";
import { passwordResetSchema } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const { token, password } = await parseBody(request, passwordResetSchema);
    await resetPassword(token, password);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
