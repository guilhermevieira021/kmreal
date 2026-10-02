import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 11;
/** Hash real usado quando o usuário não existe: o tempo de resposta não revela o cadastro. */
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("kmreal-dummy-password", BCRYPT_ROUNDS));

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  const ok = await bcrypt.compare(password, hash ?? (await getDummyHash()));
  return Boolean(hash) && ok;
}

/** Token de redefinição: o valor bruto vai no link; no banco fica só o SHA-256. */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
