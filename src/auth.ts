import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { verifyPassword } from "@/server/auth/password";
import { getDb } from "@/server/db";

class InvalidCredentials extends CredentialsSignin {
  code = "invalid_credentials";
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidCredentials();

        const user = await getDb().user.findUnique({ where: { email: parsed.data.email } });
        // Compara mesmo sem usuário para não revelar, pelo tempo de resposta, se o e-mail existe.
        const valid = await verifyPassword(parsed.data.password, user?.passwordHash);
        if (!user || !valid) throw new InvalidCredentials();

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
});
