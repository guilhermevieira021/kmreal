# Do protótipo (localStorage) para produção (PostgreSQL)

## 1. Análise do protótipo (v0.4)

### O que dependia só de localStorage

| Ponto | Arquivo (antes) | Situação agora |
|---|---|---|
| Coleções de veículos, viagens e manutenções | `services/mock/local-collection.ts` | Substituído pela API + PostgreSQL |
| Meta mensal (`UserSettings`) | `services/mock/index.ts` (chave `kmreal:v2:settings`) | Tabela `Goal` |
| Normalização de dados antigos (v0.1–v0.3) | `services/mock/index.ts` | Reaproveitada em `services/local/snapshot.ts`, só para a importação |
| "Restaurar dados de exemplo" | Perfil + `resetDemoData` | Removido; os mesmos dados viram a conta demo do seed |
| Status "dados só neste aparelho" | `localSyncService` | `apiSyncService` (online/offline) |

### Serviços simulados

| Serviço | Simulação | Implementação real |
|---|---|---|
| `AuthService` | aceitava qualquer e-mail/senha | Auth.js (credenciais, bcrypt, JWT 30 dias) + `/api/account/*` |
| Recuperação de senha | só exibia "e-mail enviado" | token de uso único (hash SHA-256, 1h) + e-mail via Resend |
| Repositórios | localStorage com latência fake | `services/api` → Route Handlers → `server/repositories.ts` → Prisma |
| `SyncService` | estado fixo `local` | estado online/offline (servidor é a fonte da verdade) |

### Contratos que já estavam prontos (e foram mantidos)

- `CrudRepository<T, TInput>` com `list({ updatedSince, includeDeleted })`, `get`, `create`, `update` parcial e `remove` lógico — **implementado sem mudar a assinatura**.
- `EntityMeta` (`userId`, `createdAt`, `updatedAt`, `deletedAt`) — vira colunas reais; a API já devolve exclusões em sync incremental.
- `SettingsRepository`, `AuthService`, `SyncService` — mesmas interfaces (só `AuthService.resetPassword` foi acrescentado).

Por isso **nenhuma tela de negócio mudou**: dashboard, viagens, veículos, saúde, simulador, ranking e relatórios continuam usando `DataProvider` → contratos.

## 2. Plano de migração (executado)

1. **Banco:** schema Prisma a partir de `src/types` (veja abaixo), migração inicial versionada.
2. **Servidor:** Prisma Client (adaptador `pg`), repositórios escopados por usuário, validação zod, Route Handlers.
3. **Autenticação:** Auth.js com credenciais; middleware protegendo a área logada; cadastro e redefinição de senha.
4. **Cliente:** implementação `services/api` dos mesmos contratos; troca em `services/index.ts`; tratamento de erro de rede no `DataProvider`.
5. **Migração de dados:** importação do localStorage após o login (seção 4).
6. **Deploy:** `vercel-build` com `migrate deploy`; `.env.example`; documentação.

## 3. Mapeamento domínio → banco

| Tipo (`src/types`) | Tabela | Observação |
|---|---|---|
| `UserProfile` | `User` | + `passwordHash`, `localImportAt` |
| `Vehicle` | `Vehicle` | `odometer` → `odometerKm` + `odometerDate` |
| `Vehicle.fixedCosts` | `FixedCost` (1:1) | mesmo formato, reagrupado pelo mapper |
| `Vehicle.wearItems` | `WearItem` (1:N) | lista substituída como um todo ao editar |
| `Trip` | `Trip` | dinheiro em `Decimal`, `date` em `DATE` |
| `Maintenance` | `Maintenance` | |
| `UserSettings.monthlyProfitGoal` | `Goal.monthlyProfitTarget` (1:1) | |
| — | `PasswordResetToken` | recuperação de senha |

A conversão fica em `src/server/mappers.ts`: as telas recebem exatamente os mesmos objetos de antes.

## 4. Importação dos dados de teste

**Objetivo:** quem testou o protótipo não perde nada.

1. Após o login, `LocalImportSheet` lê o localStorage (`services/local/snapshot.ts`), aceitando todos os formatos já usados:
   - v0.1: `kmreal:vehicles`, `kmreal:trips` (sem metadados)
   - v0.2–v0.4: `kmreal:v2:vehicles|trips|maintenances|settings`
2. Normaliza: completa campos que não existiam (custos fixos, vida útil, KM médio), ignora excluídos e descarta registros que o servidor recusaria (ex.: km ≤ 0).
3. Se houver dados, pergunta: **"Importar para minha conta"** ou **"Não importar"** (o Perfil permite importar depois).
4. `POST /api/import` valida tudo e grava **numa transação**:
   - ids locais (`v-hr`, `t-12`...) viram ids novos; viagens e manutenções são religadas aos veículos importados;
   - manutenções de veículos inexistentes são descartadas; a meta só entra se a conta ainda não tiver uma;
   - a conta é marcada (`User.localImportAt`) de forma atômica — **uma importação por conta** (repetir → 409).
5. No aparelho, as chaves originais vão para `kmreal:backup:*` (cópia de segurança) e a pergunta não aparece mais.

## 5. Próximos passos sugeridos

- **Offline de verdade:** a API já suporta `updatedSince`/`includeDeleted`; falta a fila local de alterações pendentes no cliente (`SyncService.pendingChanges`).
- **Limite de tentativas** em login, cadastro e recuperação (ex.: Upstash Ratelimit) — hoje não há.
- **Invalidar sessões ao trocar a senha** (versão de sessão no usuário) — hoje sessões abertas continuam válidas até expirar.
- **Testes automatizados** dos cálculos e de integração da API no CI.
