-- =========================================================
-- Conexões Instagram (Meta) por cliente da LINKO
-- Fluxo: API do Instagram com Login do Facebook para Empresas (SUAT)
--
-- Os tokens ficam CRIPTOGRAFADOS (AES-256-GCM) pela aplicação
-- antes de chegar aqui. Mesmo assim, a tabela é acessível
-- apenas pela service role (rotas de servidor do Next).
-- Usuários anon/authenticated não têm nenhum acesso direto.
-- =========================================================

create table if not exists public.instagram_connections (
  id uuid primary key default gen_random_uuid(),

  -- Isolamento: cada conexão pertence a exatamente um cliente...
  client_id uuid not null unique
    references public.clients (id) on delete cascade,

  -- ...e cada conta Instagram pertence a no máximo um cliente.
  ig_user_id text not null unique,
  ig_username text,
  ig_name text,

  -- Token criptografado (formato: v1.<iv>.<tag>.<ciphertext>, base64url)
  access_token_encrypted text not null,
  -- Ex.: SYSTEM_USER (SUAT) ou USER, conforme /debug_token
  token_type text,
  -- null = token sem expiração (padrão de SUAT)
  token_expires_at timestamptz,

  -- Permissões efetivamente concedidas (nomes apenas).
  granted_scopes text[] not null default '{}',

  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired', 'error')),

  connected_by uuid references auth.users (id) on delete set null,
  connected_at timestamptz not null default now(),
  -- Última verificação bem-sucedida do token/perfil junto à Meta.
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Caso uma versão anterior desta tabela já exista:
alter table public.instagram_connections
  add column if not exists ig_name text,
  add column if not exists last_synced_at timestamptz;

alter table public.instagram_connections enable row level security;

-- Sem policies = nenhum acesso via anon/authenticated.
revoke all on public.instagram_connections from anon, authenticated;
