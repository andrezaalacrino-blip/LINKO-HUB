# Integração Instagram (Meta) — LINKO Hub

Configuração na Meta: **API do Instagram com Login Unificado**, usando
**Login do Facebook para Empresas**, **token de usuário do sistema (SUAT)** e
**seleção de ativos do Instagram**. O fluxo de login direto do Instagram
(`instagram.com/oauth/authorize`) **não** é usado.

## Fluxo

1. Admin/team autorizado clica em "Conectar Instagram" → `GET /auth/meta/start?client_id=<uuid>`.
2. O servidor checa a permissão, gera o `state` (nonce + cookie httpOnly assinado) e redireciona para
   `https://www.facebook.com/<versão>/dialog/oauth` com `config_id`, `response_type=code` e
   `override_default_response_type=true`.
3. Na Meta, a pessoa escolhe o negócio e **uma** conta do Instagram.
4. A Meta volta para `GET /auth/meta/callback?code=...&state=...`.
5. O callback:
   - valida o `state` e confere que é o mesmo usuário, ainda autorizado para o mesmo cliente;
   - troca o `code` pelo SUAT (POST server-side com app secret);
   - valida o token em `/debug_token` (precisa ser válido e emitido para **este** app);
   - lê os ativos selecionados (`granular_scopes.target_ids` de `instagram_*`; fallback via Páginas);
   - exige exatamente uma conta; busca `id`/`username`;
   - criptografa (AES-256-GCM) e salva em `instagram_connections`.
6. Redireciona para `/clientes?instagram=<status>`.

Status: `connected`, `denied`, `invalid_state`, `forbidden`, `no_account`, `multiple_accounts`, `already_linked`, `error`.

## Permissões

| Papel  | Ver status            | Conectar / substituir / desconectar |
|--------|-----------------------|-------------------------------------|
| admin  | todos os clientes     | todos os clientes                   |
| team   | se `client_management`| se `client_management`              |
| client | só o próprio cliente  | **nunca**                           |

Regra em `lib/meta/authz.ts`, aplicada no início, no callback e na desconexão.
Hoje o Hub só tem a permissão global `client_management` para a equipe; se for
preciso restringir team a clientes específicos, a checagem entra em `canManageInstagram`.

## Isolamento e segurança

- `unique(client_id)` → 1 Instagram por cliente; `unique(ig_user_id)` → 1 cliente por Instagram.
- Tabela com RLS ativo e sem policies; `anon`/`authenticated` sem acesso. Só a service role (servidor).
- Nenhuma rota devolve token (nem cifrado). Logs só com códigos de erro.
- Todas as chamadas à Graph API enviam `appsecret_proof`.
- **Não há código de publicação.** Escopos são definidos pela Configuração no painel da Meta.

## Rotas

- `GET /auth/meta/start?client_id=` — inicia conexão/substituição.
- `GET /auth/meta/callback` — URI de redirecionamento OAuth.
- `GET /api/meta/instagram?client_id=` — status (sem token).
- `DELETE /api/meta/instagram?client_id=` — desconecta (apaga o token salvo).
- `POST /api/meta/instagram/sync?client_id=` — sincronização somente leitura: revalida o token,
  atualiza nome, @usuário, permissões e validade, grava `last_synced_at`. Marca `revoked`/`expired`/`error` se falhar.

## Interface (/clientes)

Cada linha da tabela tem o botão **@** (Instagram), que abre a área de integração do cliente
(`InstagramPanel` em `components/instagram-connection.tsx`):

- nome e @perfil conectados (link para o perfil);
- status calculado em `lib/meta/connection-health.ts` (Conectado, Expira em breve, Token expirado,
  Acesso revogado, Falha na sincronização, Sem sincronização recente);
- última sincronização, data da conexão e validade da autorização;
- indicadores de permissões (Perfil e mídias, Métricas, Comentários, Mensagens, Publicação);
- Conectar / Reconectar / Substituir, Sincronizar agora e Desconectar (com confirmação);
- com `META_OAUTH_ENABLED=false`, conectar e sincronizar ficam desabilitados com aviso.

## Testes

```bash
npm test
```

Cobre as regras de acesso (`lib/meta/permissions.ts`) e o cálculo de status/permissões
(`lib/meta/connection-health.ts`).

## Pendências futuras

- Se a Configuração gerar SUAT com expiração, implementar renovação antes do vencimento.
- Endpoint de exclusão de dados (Data Deletion Callback) da Meta, se for exigido no App Review.
