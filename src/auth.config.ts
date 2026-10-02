import type { NextAuthConfig } from "next-auth";

/** Rotas da área logada (grupo (app)). */
const PRIVATE_PREFIXES = ["/dashboard", "/historico", "/viagens", "/veiculos", "/perfil", "/saude", "/simulador", "/upgrade"];
/** Telas de autenticação: quem já está logado vai direto para o app. */
const AUTH_PAGES = ["/login", "/cadastro", "/recuperar-senha", "/redefinir-senha"];

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias: sessão persistente no celular

/**
 * Parte da configuração do Auth.js que roda no middleware (Edge): sem banco, sem bcrypt.
 * Os provedores ficam em src/auth.ts.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const path = nextUrl.pathname;
      const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

      if (isPrivate && !isLoggedIn) {
        const login = new URL("/login", nextUrl);
        login.searchParams.set("callbackUrl", path + nextUrl.search);
        return Response.redirect(login);
      }
      if (isLoggedIn && (AUTH_PAGES.includes(path) || path === "/")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      if (!isLoggedIn && path === "/") {
        return Response.redirect(new URL("/login", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
