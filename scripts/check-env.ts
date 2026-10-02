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

/** Na Vercel, banco em localhost nunca é alcançável: é o valor do .env de desenvolvimento. */
const isLocalHost = (url: string) => {
  try {
    return ["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

if (process.env.VERCEL) {
  const localVars = [pooled, direct]
    .filter((found) => found && isLocalHost(found.value))
    .map((found) => found!.name);
  const names = [...new Set(localVars)];
  if (names.length) {
    problems.push(
      `${names.join(" e ")} ${names.length > 1 ? "apontam" : "aponta"} para localhost (banco de desenvolvimento), inacessível na Vercel.\n` +
        `   Apague em Settings → Environment Variables e conecte um banco na nuvem:\n` +
        `   Storage → Create Database → Neon. Veja docs/DEPLOY.md, passo 3.`,
    );
  }
}

if (!process.env.AUTH_SECRET?.trim()) {
  problems.push(`AUTH_SECRET ausente: gere com \`npx auth secret\` e cadastre na Vercel (ambiente "${target}").`);
}

if (problems.length) {
  console.error(`\n✖ Configuração de ambiente inválida para o build (${target}):\n`);
  for (const p of problems) console.error(` - ${p}\n`);
  console.error("Depois de corrigir, publique de novo o commit mais recente (Deployments → Create Deployment → main).\n");
  process.exit(1);
}

// Pagamentos: sem o segredo, o webhook recusa tudo (401) e ninguém vira PRO. Avisa, sem bloquear o deploy.
if (!process.env.CAKTO_WEBHOOK_SECRET?.trim()) {
  console.warn(
    `⚠ CAKTO_WEBHOOK_SECRET ausente (${target}): o webhook /api/webhooks/cakto vai recusar os pagamentos até ser configurado.`,
  );
}

const directNote = direct && pooled && direct.name !== pooled.name ? ` · migrações via ${direct.name}` : "";
console.log(`✓ Ambiente ok (${target}): app via ${pooled!.name}${directNote} · AUTH_SECRET definido`);
if (direct?.name === pooled?.name) {
  console.log(`  Dica: sem conexão direta (${DIRECT_URL_VARS.slice(0, 3).join("/")}); migrações usarão ${pooled!.name}.`);
}
