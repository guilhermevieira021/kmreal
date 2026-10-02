/**
 * Checagem antes do build na Vercel (`npm run vercel-build`): falha cedo, com instruções,
 * se faltar variável obrigatória — em vez de um erro genérico do Prisma ou do Auth.js.
 */
import { DIRECT_URL_VARS, POOLED_URL_VARS, resolveDirectUrl, resolvePooledUrl } from "../src/lib/database-url";

const target = process.env.VERCEL_ENV ?? "local";
const problems: string[] = [];

const pooled = resolvePooledUrl();
const direct = resolveDirectUrl();

if (!pooled) {
  problems.push(
    `Banco não configurado: defina DATABASE_URL (aceitos: ${POOLED_URL_VARS.join(", ")}).\n` +
      `   Vercel → Settings → Environment Variables (marque o ambiente "${target}"),\n` +
      `   ou Storage → conecte o banco ao projeto. Veja docs/DEPLOY.md, passo 3.`,
  );
}
if (!process.env.AUTH_SECRET?.trim()) {
  problems.push(
    `AUTH_SECRET ausente: gere com \`npx auth secret\` e cadastre na Vercel (ambiente "${target}").`,
  );
}

if (problems.length) {
  console.error(`\n✖ Variáveis de ambiente faltando para o build (${target}):\n`);
  for (const p of problems) console.error(` - ${p}\n`);
  console.error("Depois de cadastrar, faça Redeploy (Deployments → ⋯ → Redeploy).\n");
  process.exit(1);
}

const directNote = direct && pooled && direct.name !== pooled.name ? ` · migrações via ${direct.name}` : "";
console.log(`✓ Ambiente ok (${target}): app via ${pooled!.name}${directNote} · AUTH_SECRET definido`);
if (direct?.name === pooled?.name) {
  console.log(`  Dica: sem conexão direta (${DIRECT_URL_VARS.slice(0, 3).join("/")}); migrações usarão ${pooled!.name}.`);
}
