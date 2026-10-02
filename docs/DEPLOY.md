# Deploy na Vercel + PostgreSQL

Guia passo a passo para colocar o KmReal no ar. Tempo estimado: 20 minutos.

## Visão geral

| Peça | Onde |
|---|---|
| App Next.js | Vercel (região recomendada: **São Paulo — `gru1`**) |
| Banco | PostgreSQL gerenciado com pooler (Neon via Vercel Marketplace, Supabase ou Prisma Postgres) |
| E-mail de recuperação de senha | Resend (opcional, mas recomendado) |

O build da Vercel roda o script `vercel-build`:

```
prisma generate && prisma migrate deploy && next build
```

Ou seja: **a cada deploy, as migrações pendentes são aplicadas antes do build.** Se a migração falhar, o deploy falha e a versão anterior continua no ar.

---

## 1. Subir o código para o GitHub

```bash
git init
git add .
git commit -m "KmReal pronto para produção"
git branch -M main
git remote add origin https://github.com/guilhermevieira021/kmreal.git
git push -u origin main
```

O `.gitignore` já exclui `.env`, `node_modules`, `.next` e o Prisma Client gerado.

## 2. Criar o projeto na Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import** o repositório `kmreal`.
2. Framework: **Next.js** (detectado). Não altere Build/Install Command — o `vercel-build` é usado automaticamente.
3. **Ainda não clique em Deploy**: falta o banco e as variáveis. (Se clicar, o primeiro build falha por falta de `DATABASE_URL`; é só refazer depois.)

## 3. Conectar o PostgreSQL

### Opção A — Neon pela Vercel (mais simples)

1. No projeto da Vercel: **Storage → Create Database → Neon (Postgres)**.
2. Região: **São Paulo (sa-east-1)** se disponível, ou a mais próxima.
3. Conecte ao projeto (ambientes Production, Preview e Development).
4. A Vercel cria as variáveis automaticamente — **não precisa renomear nada**. O app reconhece os nomes das integrações:
   - app (com pooler): `DATABASE_URL`, `POSTGRES_PRISMA_URL` ou `POSTGRES_URL`
   - migrações (direta): `DIRECT_URL`, `DATABASE_URL_UNPOOLED` ou `POSTGRES_URL_NON_POOLING`
5. Confira em **Settings → Environment Variables** que elas estão marcadas para **Production e Preview**.

### Opção B — Supabase

1. Crie o projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. **Project Settings → Database → Connection string**:
   - `DATABASE_URL` = **Transaction pooler** (porta `6543`), com `?sslmode=require` no final
   - `DIRECT_URL` = **Direct connection** / Session pooler (porta `5432`)
3. Use apenas o PostgreSQL do Supabase — autenticação e APIs dele não são usadas.

### Opção C — Qualquer PostgreSQL 14+

Defina `DATABASE_URL` (com pooler, se houver) e `DIRECT_URL` (direta). Exija SSL (`sslmode=require`) em bancos na internet.

> **Por que duas URLs?** Funções serverless abrem muitas conexões curtas: o app usa o pooler. Já as migrações precisam de uma conexão direta, sem pooler.

## 4. Variáveis de ambiente na Vercel

**Settings → Environment Variables** (marque Production e Preview):

| Nome | Valor |
|---|---|
| `DATABASE_URL` | do passo 3 |
| `DIRECT_URL` | do passo 3 |
| `AUTH_SECRET` | saída de `npx auth secret` (um valor diferente por ambiente é o ideal) |
| `CAKTO_WEBHOOK_SECRET` | o secret do webhook da Cakto (passo 6b) |
| `RESEND_API_KEY` | chave da Resend (passo 6) |
| `EMAIL_FROM` | `KmReal <nao-responda@seudominio.com.br>` |
| `AUTH_URL` / `NEXTAUTH_URL` | **só se usar domínio próprio**: `https://app.seudominio.com.br` |

Na URL padrão `*.vercel.app` não é preciso `AUTH_URL`: o Auth.js detecta o host e o link de e-mail usa a URL de produção da Vercel.

## 5. Deploy

**Deployments → Redeploy** (ou um novo `git push`). Ao final, confira:

```
https://SEU-APP.vercel.app/api/health   →   {"status":"ok","database":"ok"}
```

Depois: abra o app no celular → **Cadastre-se** → registre uma viagem.

### Conta de demonstração (opcional, para homologação)

Na sua máquina, com `DATABASE_URL`/`DIRECT_URL` apontando para o banco **de homologação**:

```bash
npm run db:seed     # cria joao@kmreal.app / kmreal123 com ~100 dias de dados
```

e defina `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true` na Vercel para exibir o botão. Não use em produção.

## 6. E-mail de recuperação de senha (Resend)

1. Conta em [resend.com](https://resend.com) → **Domains** → adicione e verifique seu domínio (registros DNS).
2. **API Keys** → crie uma chave → `RESEND_API_KEY` na Vercel.
3. `EMAIL_FROM` com um endereço desse domínio.

Sem `RESEND_API_KEY` o app funciona, mas o link de redefinição só aparece nos **logs da função** (Vercel → Logs) — útil para teste, inviável para usuários reais.

## 6b. Pagamentos (Cakto)

1. Painel da Cakto → produto **KmReal PRO** → **Webhooks** (ou Integrações) → adicionar.
2. URL: `https://SEU-APP.vercel.app/api/webhooks/cakto` — evento: **compra aprovada** (`purchase_approved`).
3. Copie o **secret** que a Cakto envia nas notificações desse webhook e cadastre como `CAKTO_WEBHOOK_SECRET` na Vercel (Production). Redeploy.
4. Confira `/api/health` → `"payments": "configured"`. Faça uma compra de teste com o mesmo e-mail de uma conta: o Perfil deve mostrar **PRO até dd/mm**.

Sem o secret o app funciona, mas todo webhook é recusado (401) e ninguém vira PRO. Fluxos completos em [ASSINATURAS.md](ASSINATURAS.md).

## 7. Domínio próprio (opcional)

**Settings → Domains** → adicione `app.seudominio.com.br` → configure o DNS indicado → defina `AUTH_URL` e `NEXTAUTH_URL` com essa URL → redeploy.

## 8. Região das funções

Para menor latência com banco em São Paulo: **Settings → Functions → Function Region → São Paulo (gru1)**. App e banco na mesma região fazem diferença em cada tela.

---

## Operação

### Novas migrações

```bash
# em desenvolvimento, após alterar prisma/schema.prisma
npm run db:migrate -- --name descricao_da_mudanca
git add prisma/migrations && git commit -m "..." && git push    # a Vercel aplica no deploy
```

Nunca edite uma migração já aplicada em produção; crie outra.

### Backups

Neon e Supabase fazem backup automático (verifique o período de retenção do seu plano). Para cópia manual: `pg_dump "$DIRECT_URL" > backup.sql`.

### Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Build para em "✖ Configuração de ambiente inválida" ou `datasource.url é obrigatória` | Banco ou `AUTH_SECRET` não cadastrados **para o ambiente do build** (Production/Preview). Cadastre e faça Redeploy |
| `P1001: Can't reach database server` no build | URL errada, banco pausado ou `localhost` (valor do .env local copiado para a Vercel) |
| `/api/health` → `unreachable` | URL errada, IP bloqueado ou banco pausado (planos gratuitos hibernam) |
| Login volta sempre para a tela de login | `AUTH_SECRET` ausente ou diferente entre deploys; `AUTH_URL` errado em domínio próprio |
| E-mail de senha não chega | `RESEND_API_KEY` ausente, domínio não verificado ou e-mail no spam |
| "too many connections" | Usando URL direta no app — `DATABASE_URL` deve ser a com pooler; reduza `DATABASE_POOL_MAX` |
