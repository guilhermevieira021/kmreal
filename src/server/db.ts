import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { POOLED_URL_VARS, resolvePooledUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = resolvePooledUrl()?.value;
  if (!connectionString) throw new Error(`Banco não configurado: defina ${POOLED_URL_VARS.join(" ou ")}. Veja .env.example.`);
  // Em serverless (Vercel), cada instância abre poucas conexões; use a URL com pooler em produção.
  const adapter = new PrismaPg({ connectionString, max: Number(process.env.DATABASE_POOL_MAX ?? 5) });
  return new PrismaClient({ adapter });
}

/**
 * Prisma Client único por processo. Criado sob demanda (e não na importação) para que
 * o build da Vercel funcione mesmo sem DATABASE_URL disponível.
 */
export function getDb(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}
