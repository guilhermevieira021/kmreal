// Configuração da CLI do Prisma (migrate, generate, seed). O app não usa este arquivo:
// em tempo de execução a conexão é feita em src/server/db.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolveDirectUrl } from "./src/lib/database-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrações usam a conexão direta (sem pooler) quando existir.
    // `generate` não precisa de banco: a URL pode estar ausente nesse caso.
    url: resolveDirectUrl()?.value,
  },
});
