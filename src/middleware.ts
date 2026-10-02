import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/** Protege as rotas privadas e redireciona quem já está logado (regras em auth.config.ts). */
export default NextAuth(authConfig).auth;

export const config = {
  // Ignora API, assets do Next, ícones, manifest e service worker.
  matcher: ["/((?!api|_next/static|_next/image|icons|icon.svg|manifest.webmanifest|sw.js|favicon.ico).*)"],
};
