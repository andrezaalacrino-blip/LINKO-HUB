/**
 * Configuração da integração Meta / Instagram
 * (API do Instagram com Login do Facebook para Empresas + SUAT).
 *
 * SOMENTE SERVIDOR: este módulo lê segredos de process.env.
 * Nunca importe em componentes "use client".
 *
 * Nenhuma credencial é definida aqui — tudo vem de variáveis de
 * ambiente (ver .env.example). Se algo faltar, a integração fica
 * desativada e as rotas respondem 503.
 *
 * Escopos NÃO são definidos aqui: com Login do Facebook para Empresas
 * eles vêm da "Configuração" criada no painel da Meta (config_id).
 */

export type MetaConfig = {
  appId: string;
  appSecret: string;
  loginConfigId: string;
  redirectUri: string;
  graphVersion: string;
  encryptionKey: Buffer;
  stateSecret: Buffer;
  appBaseUrl: string;
};

export class MetaConfigError extends Error {}

function required(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new MetaConfigError(`${name} não configurada.`);
  }

  return value.trim();
}

function decodeKey(name: string): Buffer {
  const key = Buffer.from(required(name), "base64");

  if (key.length !== 32) {
    throw new MetaConfigError(
      `${name} deve ser 32 bytes em base64 (gere com: openssl rand -base64 32).`
    );
  }

  return key;
}

/**
 * A integração só fica ativa quando META_OAUTH_ENABLED === "true".
 * Mantenha "false" até confirmar que o domínio e a rota de callback
 * respondem corretamente em HTTPS.
 */
export function isMetaOAuthEnabled() {
  return process.env.META_OAUTH_ENABLED === "true";
}

export function getMetaConfig(): MetaConfig {
  const redirectUri = required("META_REDIRECT_URI");
  const parsed = new URL(redirectUri);

  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  if (parsed.protocol !== "https:" && !isLocal) {
    throw new MetaConfigError("META_REDIRECT_URI precisa usar HTTPS.");
  }

  if (parsed.pathname !== "/auth/meta/callback" || parsed.search || parsed.hash) {
    throw new MetaConfigError(
      "META_REDIRECT_URI deve ser exatamente <origem>/auth/meta/callback."
    );
  }

  const graphVersion = process.env.META_GRAPH_VERSION?.trim() || "v23.0";

  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    throw new MetaConfigError("META_GRAPH_VERSION inválida (ex.: v23.0).");
  }

  const loginConfigId = required("META_LOGIN_CONFIG_ID");

  if (!/^\d+$/.test(loginConfigId)) {
    throw new MetaConfigError("META_LOGIN_CONFIG_ID deve ser numérico.");
  }

  return {
    appId: required("META_APP_ID"),
    appSecret: required("META_APP_SECRET"),
    loginConfigId,
    redirectUri,
    graphVersion,
    encryptionKey: decodeKey("META_TOKEN_ENCRYPTION_KEY"),
    stateSecret: decodeKey("META_OAUTH_STATE_SECRET"),
    appBaseUrl: parsed.origin,
  };
}
