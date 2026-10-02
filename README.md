# KmReal

Lucro real por KM para motoristas agregados e pequenos transportadores. Mobile first, PWA.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · PostgreSQL · Prisma 7 · Auth.js (next-auth v5) · Vercel

- [Deploy na Vercel e conexão com PostgreSQL](docs/DEPLOY.md)
- [Análise do protótipo e plano de migração](docs/MIGRACAO.md)

---

## Instalação (desenvolvimento)

Requisitos: **Node.js 20+** (testado no 24) e npm.

```bash
npm install                 # também gera o Prisma Client (postinstall)
cp .env.example .env        # depois preencha os valores (abaixo)
```

### Banco local

Sem Docker nem instalação: o Prisma sobe um PostgreSQL local.

```bash
npm run db:dev              # deixe rodando; copie a URL "TCP" (postgres://...:51214/...) para DATABASE_URL no .env
npm run db:migrate          # cria as tabelas
npm run db:seed             # opcional: conta demo joao@kmreal.app / kmreal123 com ~100 dias de dados
```

Já tem um PostgreSQL (local, Docker, Neon, Supabase...)? Coloque a URL em `DATABASE_URL` e rode `npm run db:migrate`.

### Rodar

```bash
npm run dev                 # http://localhost:3000
```

Gere o `AUTH_SECRET` com `npx auth secret` (ou `openssl rand -base64 32`).

## Scripts

| Script | O que faz |
|---|---|
| `dev` / `build` / `start` | Next.js |
| `lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `db:dev` | PostgreSQL local (Prisma Postgres) |
| `db:migrate` | Cria/aplica migrações em desenvolvimento (`prisma migrate dev`) |
| `db:deploy` | Aplica migrações pendentes em produção (`prisma migrate deploy`) |
| `db:seed` | (Re)cria a conta demo — só mexe nela |
| `db:studio` | Interface para ver os dados |
| `vercel-build` | Usado automaticamente pela Vercel: generate → migrate deploy → build |

## Variáveis de ambiente

Todas documentadas em [`.env.example`](.env.example).

| Variável | Obrigatória | Uso |
|---|---|---|
| `DATABASE_URL` | Sim | PostgreSQL do app (em produção, URL **com pooler**) |
| `DIRECT_URL` | Recomendada c/ pooler | Conexão direta para migrações e seed |
| `AUTH_SECRET` | Sim | Assina as sessões (JWT) |
| `AUTH_URL` / `NEXTAUTH_URL` | Fora da Vercel / domínio próprio | URL pública; base do link de recuperação de senha |
| `RESEND_API_KEY`, `EMAIL_FROM` | Recomendadas | Envio do e-mail de recuperação de senha |
| `DATABASE_POOL_MAX` | Não | Conexões por instância (padrão 5) |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | Não | Botão "conta de demonstração" no login |

## Arquitetura

```
Tela (features/*) ──► DataProvider ──► services/ (contratos) ──► fetch /api/* ──► Route Handlers
                                                                                      │ auth() + zod
                                                                                      ▼
                                                                   server/repositories.ts ──► Prisma ──► PostgreSQL
```

- **Telas e regras de negócio não mudaram** em relação ao protótipo: dependem só dos contratos em `src/services/types.ts`. A implementação passou de localStorage para a API (`src/services/api`).
- **Todo acesso ao banco é escopado ao usuário da sessão** (`src/server/repositories.ts`); a API valida toda entrada com zod (`src/server/validation.ts`).
- **Exclusão lógica + `updatedAt`** em veículos, viagens e manutenções: a API já aceita `?updatedSince=` e `?includeDeleted=1` (base para sync offline futuro).
- **Valores em `Decimal`** no banco; datas de domínio em `DATE` (sem fuso). Conversão em `src/server/mappers.ts`.

```
prisma/
  schema.prisma          modelos (User, Vehicle, FixedCost, WearItem, Trip, Maintenance, Goal, PasswordResetToken)
  migrations/            SQL versionado
  seed.ts                conta demo
src/
  auth.ts, auth.config.ts, middleware.ts   Auth.js (login por e-mail/senha, sessão JWT de 30 dias, rotas protegidas)
  app/api/               Route Handlers (vehicles, trips, maintenances, settings, import, account, auth, health)
  app/(auth)/            login, cadastro, recuperar-senha, redefinir-senha
  app/(app)/             área logada: (tabs) com menu inferior, (focus) fluxos em tela cheia
  server/                db, repositórios, validação, mapeamento, conta/senha, importação (somente servidor)
  services/
    types.ts             contratos (CrudRepository, AuthService, SyncService...)
    api/                 implementação via API do app
    local/snapshot.ts    leitura do localStorage do protótipo (para importação)
    demo/seed.ts         geradores dos dados de demonstração
  features/              telas por domínio
  lib/calculations/      regras puras (custo real, alertas, metas, ranking, simulador...)
```

## Autenticação

- Cadastro (`/cadastro`), login (`/login`), logout (Perfil), recuperação (`/recuperar-senha` → e-mail → `/redefinir-senha`).
- Senhas com bcrypt; tokens de redefinição guardados só como hash SHA-256, uso único, válidos por 1 hora.
- Sessão JWT persistente por 30 dias. O middleware protege `/dashboard`, `/historico`, `/viagens`, `/veiculos`, `/perfil`, `/saude`, `/simulador`; a API responde 401 sem sessão.

## Migração dos dados do protótipo

Quem usou a versão de testes (dados no localStorage) vê, depois do login, a opção **"Importar para minha conta"**. Os dados são lidos e normalizados no aparelho (`services/local/snapshot.ts`) e importados numa única transação (`server/import.ts`), uma vez por conta. Uma cópia de segurança fica no aparelho. Detalhes em [docs/MIGRACAO.md](docs/MIGRACAO.md).

---

## Regras de negócio

### Custo real

Todo "lucro" exibido é **lucro real** (`src/lib/calculations/real-cost.ts`):

- **Custo operacional** = combustível + pedágios + ajudante + outros (o que aparece na viagem)
- **Fixos/km** = (seguro + IPVA + licenciamento) ÷ 12 + parcela + rastreador + internet + outros, ÷ KM médio mensal do veículo (últimos 90 dias com ≥ 30 dias de histórico; senão, a estimativa do cadastro)
- **Desgaste/km** = Σ valor ÷ vida útil dos itens (pneus, óleo, freios, correia, revisão, personalizados)
- **Manutenções/km** = gasto realizado em 12 meses com tipos **sem** item de vida útil (evita contar duas vezes)
- **Custo real/km** = operacional + fixos + desgaste + manutenções · **Lucro real** = receita − custo real

**Saúde do veículo:** KM atual = última leitura (hodômetro ou manutenção) + km das viagens depois dela. 🟢 em dia · 🟡 ≤ 10% da vida útil (mín. 500 km) ou ≤ 15 dias · 🔴 passou do limite.

### Simulador

Custo operacional/km pela média do veículo (ou só combustível sem histórico) + fixos, desgaste e manutenção/km. "Margem baixa" abaixo de 20% de margem real.

### Alertas e resumo rápido (por regras, sem IA)

Comparam os últimos 30 dias com os 30 anteriores (mín. 2 viagens): lucro real/km caiu ≥ 5%, custo real/km ou combustível/km subiu ≥ 5%, melhor veículo mudou, viagens com prejuízo real, troca de óleo/pneus/revisão próxima ou atrasada, seguro a vencer (30 dias), manutenção planejada, meta abaixo do ritmo (a partir do dia 5) e 7 dias sem registros.
