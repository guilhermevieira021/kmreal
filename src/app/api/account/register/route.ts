import { NextResponse } from "next/server";
import { errorResponse, parseBody } from "@/server/api";
import { registerUser } from "@/server/account";
import { registerSchema } from "@/server/validation";

/** Cadastro. O login em seguida é feito pelo cliente via Auth.js. */
export async function POST(request: Request) {
  try {
    const user = await registerUser(await parseBody(request, registerSchema));
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
