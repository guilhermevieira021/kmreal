/**
 * Resolve as URLs do PostgreSQL aceitando os nomes de variável usados pelas integrações
 * da Vercel (Neon, Supabase, antigo Vercel Postgres), além dos nomes do projeto.
 * Usado pelo app (src/server/db.ts), pela CLI do Prisma (prisma.config.ts) e pela checagem de build.
 */

/** Conexão usada pelo app — preferencialmente COM pooler. */
export const POOLED_URL_VARS = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"] as const;

/** Conexão direta (SEM pooler) — migrações e seed. Cai para a do app se não houver. */
export const DIRECT_URL_VARS = [
  "DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  ...POOLED_URL_VARS,
] as const;

function firstDefined(names: readonly string[], env: NodeJS.ProcessEnv) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

export const resolvePooledUrl = (env: NodeJS.ProcessEnv = process.env) => firstDefined(POOLED_URL_VARS, env);
export const resolveDirectUrl = (env: NodeJS.ProcessEnv = process.env) => firstDefined(DIRECT_URL_VARS, env);
