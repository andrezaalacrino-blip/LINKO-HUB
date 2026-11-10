# Implantação na Vercel — checklist (diagnóstico de 10/11/2026)

## Situação encontrada

| Item | Estado |
|---|---|
| Git | Repositório `LINKO-HUB` no GitHub (**público**), `main` sincronizada com `origin/main`. Integração Meta ainda **não commitada**. |
| Vercel | Projeto `linko-hub` já ligado ao repositório. **Todo push na `main` gera deploy de produção automaticamente.** Produção atual: `linko-hub.vercel.app` (código antigo, sem `/auth/meta/*`). |
| Segredos no Git | Nenhum `.env` no histórico; nenhum padrão de chave encontrado no código versionado. |
| Supabase | **Bloqueio:** o host configurado (local e produção) não existe no DNS — projeto excluído, pausado ou URL errada. Migração `instagram_connections` não pôde ser verificada. |
| Domínio | **Bloqueio:** `linko.ag` e `hub.linko.ag` não existem no DNS público (NXDOMAIN). |
| Build / testes | `next build` ok · `npm test` 17/17 · TypeScript ok. Lint: 32 erros antigos em telas existentes (não bloqueiam o build). |

## 1. Supabase (antes de tudo)

- [ ] Abrir o painel do Supabase e confirmar o projeto do Hub: restaurar se pausado, ou criar/identificar o projeto correto.
- [ ] Se a URL mudar: atualizar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` e na Vercel.
- [ ] Conferir que `profiles` tem `role`, `active`, `client_id`, `permissions` e que existe a tabela `clients`.
- [ ] Rodar `supabase/migrations/20261110000000_instagram_connections.sql` no SQL Editor.
- [ ] Cadastrar um cliente **LINKO** em `/clientes` (é a ele que o @linko.ag será vinculado).
- [ ] Authentication → URL Configuration → Site URL: `https://hub.linko.ag`.

## 2. DNS

- [ ] Registrar / ativar o domínio `linko.ag` e definir os nameservers.
- [ ] Na Vercel (Project → Settings → Domains) adicionar `hub.linko.ag`.
- [ ] No DNS de `linko.ag`, criar o registro que a Vercel indicar (normalmente `CNAME hub → cname.vercel-dns.com`).
- [ ] Aguardar “Valid Configuration” e o certificado HTTPS na Vercel.

## 3. Vercel → Settings → Environment Variables

Supabase (Production e Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (marcar **Sensitive**).

Meta — **somente Production** (Preview usa outra URL e ficaria com redirect inválido):

| Variável | Valor |
|---|---|
| `META_OAUTH_ENABLED` | `false` no primeiro deploy |
| `META_APP_ID` | ID do app (Configurações → Básico) |
| `META_APP_SECRET` | Chave secreta do app — **Sensitive** |
| `META_LOGIN_CONFIG_ID` | ID da Configuração do Login do Facebook para Empresas |
| `META_REDIRECT_URI` | `https://hub.linko.ag/auth/meta/callback` |
| `META_GRAPH_VERSION` | `v23.0` (opcional) |
| `META_TOKEN_ENCRYPTION_KEY` | `openssl rand -base64 32` — **Sensitive**, nunca trocar depois de salvar tokens |
| `META_OAUTH_STATE_SECRET` | `openssl rand -base64 32` (outro valor) — **Sensitive** |

Variáveis só valem a partir do **próximo deploy**.

## 4. Publicação (decisão manual)

- [ ] Commitar a integração (de preferência numa branch → a Vercel gera um **Preview** protegido, sem afetar produção).
- [ ] Validar o Preview (build ok, `/clientes` abre).
- [ ] Merge na `main` → deploy de produção.
- [ ] Testar: `https://hub.linko.ag/auth/meta/callback` deve responder **503 "Integração Instagram ainda não ativada."**

## 5. Meta for Developers

- [ ] Configurações do app → Básico: Domínios do app `hub.linko.ag`; URL da Política de Privacidade; URL de exclusão de dados (ou instruções).
- [ ] Login do Facebook para Empresas → Configurações: Login OAuth do cliente **Sim**, Login OAuth da Web **Sim**, Forçar HTTPS **Sim**, Modo estrito **Sim**.
- [ ] URIs de redirecionamento do OAuth válidos: exatamente `https://hub.linko.ag/auth/meta/callback`.
- [ ] Configurações avançadas: “Exigir chave secreta do app” **Sim**.
- [ ] Configuração SUAT: ativos do Instagram, permissões de leitura (sem `instagram_content_publish`).
- [ ] Funções do app: quem fará o login precisa ser Administrador/Desenvolvedor/Testador (app em modo de desenvolvimento).

## 6. Conta @linko.ag

- [ ] @linko.ag é conta **profissional** (Empresa ou Criador).
- [ ] Está vinculada a uma Página do Facebook / portfólio empresarial que a pessoa do login administra.

## 7. Primeiro teste real

1. Vercel: `META_OAUTH_ENABLED=true` (Production) → Redeploy.
2. Entrar no Hub como **admin** → `/clientes` → botão **@** do cliente LINKO → **Conectar Instagram**.
3. Na Meta, escolher o negócio e **somente** o @linko.ag.
4. Voltar ao Hub: aviso “Instagram conectado com sucesso”, painel mostrando @linko.ag, permissões e “Sem expiração”/validade.
5. Clicar em **Sincronizar agora** e conferir a data da última sincronização.
6. Vercel → Logs: devem aparecer só linhas `[meta-oauth]` com códigos — nenhum token.

Para desligar a qualquer momento: `META_OAUTH_ENABLED=false` + redeploy (ou **Desconectar** no painel).
