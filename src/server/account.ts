import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { createResetToken, hashPassword, hashToken } from "./auth/password";
import { appUrl, passwordResetMail, sendMail } from "./auth/mailer";
import { getDb } from "./db";
import { badRequest, conflict } from "./errors";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

export async function registerUser(input: { name: string; email: string; password: string }) {
  try {
    const user = await getDb().user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        goal: { create: {} },
      },
      select: { id: true, name: true, email: true },
    });
    return user;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("Já existe uma conta com este e-mail");
    }
    throw error;
  }
}

/**
 * Gera um token de uso único e envia o link por e-mail.
 * Sempre "sucesso" para quem chama: não revela se o e-mail está cadastrado.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const db = getDb();
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) return;

  const { token, tokenHash } = createResetToken();
  await db.$transaction([
    // Só o link mais recente vale.
    db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    }),
  ]);

  const link = `${appUrl()}/redefinir-senha?token=${encodeURIComponent(token)}`;
  await sendMail(passwordResetMail(user.email, user.name, link));
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const db = getDb();
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest("Link inválido ou expirado. Peça um novo.");
  }
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}
