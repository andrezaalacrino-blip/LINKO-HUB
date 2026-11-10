import { createHmac } from "node:crypto";
import type { MetaConfig } from "./config";

/**
 * Cliente mínimo da Graph API da Meta para o fluxo
 * "API do Instagram com Login do Facebook para Empresas".
 *
 * - Autorização via diálogo do Facebook com `config_id` (a Configuração
 *   do painel define escopos, tipo de token = SUAT e seleção de ativos).
 * - Troca do `code` por token no servidor (com app secret).
 * - Leitura dos ativos Instagram que o usuário selecionou.
 *
 * NÃO há nenhuma função de publicação aqui — de propósito.
 */

const TIMEOUT_MS = 15_000;

/** Erro sanitizado: nunca carrega tokens, só o código/tipo do erro da Meta. */
export class MetaApiError extends Error {
  step: string;
  status: number;
  metaCode?: string;

  constructor(step: string, status: number, metaCode?: string) {
    super(`Meta API falhou em ${step} (HTTP ${status}${metaCode ? `, ${metaCode}` : ""})`);
    this.step = step;
    this.status = status;
    this.metaCode = metaCode;
  }

  /** OAuthException 190 = token inválido, expirado ou revogado. */
  get isInvalidToken() {
    return Boolean(this.metaCode?.startsWith("OAuthException:190"));
  }
}

function graphUrl(config: MetaConfig, path: string) {
  return new URL(`https://graph.facebook.com/${config.graphVersion}/${path}`);
}

/**
 * appsecret_proof prova que a chamada vem do servidor que conhece o
 * app secret. Permite ativar "Exigir chave secreta do app" no painel.
 */
function appSecretProof(config: MetaConfig, accessToken: string) {
  return createHmac("sha256", config.appSecret).update(accessToken).digest("hex");
}

async function readJson(step: string, response: Response) {
  let body: Record<string, unknown> = {};

  try {
    body = await response.json();
  } catch {
    // corpo não-JSON: tratado abaixo pelo status
  }

  if (!response.ok || body.error) {
    const error = body.error as { type?: string; code?: number; error_subcode?: number } | undefined;

    const metaCode = error
      ? `${error.type ?? ""}:${error.code ?? ""}${error.error_subcode ? `/${error.error_subcode}` : ""}`
      : undefined;

    throw new MetaApiError(step, response.status, metaCode);
  }

  return body;
}

async function graphGet(
  config: MetaConfig,
  step: string,
  path: string,
  params: Record<string, string>,
  accessToken: string
) {
  const url = graphUrl(config, path);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("appsecret_proof", appSecretProof(config, accessToken));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  return readJson(step, response);
}

export function buildAuthorizeUrl(config: MetaConfig, state: string) {
  const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);

  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("config_id", config.loginConfigId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  // Obrigatório para configurações SUAT: devolve `code` (não token na URL).
  url.searchParams.set("response_type", "code");
  url.searchParams.set("override_default_response_type", "true");

  return url.toString();
}

export async function exchangeCodeForToken(config: MetaConfig, code: string) {
  const form = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  // POST mantém o app secret e o code fora de query strings/logs de proxy.
  const response = await fetch(graphUrl(config, "oauth/access_token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = await readJson("code_exchange", response);

  if (typeof body.access_token !== "string") {
    throw new MetaApiError("code_exchange", response.status, "missing_access_token");
  }

  return { accessToken: body.access_token };
}

export type TokenInspection = {
  /** Válido e emitido para ESTE app. */
  valid: boolean;
  type: string | null;
  expiresAt: Date | null;
  scopes: string[];
  /** IDs de contas Instagram selecionadas pelo usuário na tela de ativos. */
  instagramAccountIds: string[];
};

/**
 * Valida o token com /debug_token (usando o token do app) e extrai os
 * ativos concedidos. Garante que o token foi emitido para ESTE app.
 */
export async function inspectToken(
  config: MetaConfig,
  accessToken: string
): Promise<TokenInspection> {
  const url = graphUrl(config, "debug_token");
  url.searchParams.set("input_token", accessToken);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.appId}|${config.appSecret}` },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = await readJson("debug_token", response);

  const data = body.data as {
    app_id?: string;
    is_valid?: boolean;
    type?: string;
    expires_at?: number;
    scopes?: string[];
    granular_scopes?: { scope: string; target_ids?: string[] }[];
  } | undefined;

  // Token de OUTRO app nunca é aceito: isso é erro, não "token inválido".
  if (data?.app_id !== undefined && String(data.app_id) !== config.appId) {
    throw new MetaApiError("debug_token", 200, "foreign_app_token");
  }

  const instagramIds = new Set<string>();

  for (const grant of data?.granular_scopes ?? []) {
    if (grant.scope.startsWith("instagram_")) {
      for (const id of grant.target_ids ?? []) instagramIds.add(String(id));
    }
  }

  return {
    valid: Boolean(data?.is_valid) && String(data?.app_id) === config.appId,
    type: data?.type ?? null,
    // expires_at = 0 significa "não expira" (comum em SUAT).
    expiresAt: data?.expires_at ? new Date(data.expires_at * 1000) : null,
    scopes: data?.scopes ?? [],
    instagramAccountIds: [...instagramIds],
  };
}

/**
 * Fallback quando o debug_token não lista target_ids: descobre contas
 * Instagram através das Páginas concedidas.
 */
export async function listInstagramAccountsViaPages(
  config: MetaConfig,
  accessToken: string
) {
  const body = await graphGet(
    config,
    "list_pages",
    "me/accounts",
    { fields: "instagram_business_account{id}", limit: "100" },
    accessToken
  );

  const pages = (body.data ?? []) as { instagram_business_account?: { id?: string } }[];

  return [
    ...new Set(
      pages
        .map((page) => page.instagram_business_account?.id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
}

export async function fetchInstagramAccount(
  config: MetaConfig,
  igUserId: string,
  accessToken: string
) {
  if (!/^\d+$/.test(igUserId)) {
    throw new MetaApiError("ig_account", 400, "invalid_id");
  }

  const body = await graphGet(
    config,
    "ig_account",
    igUserId,
    { fields: "id,username,name" },
    accessToken
  );

  return {
    igUserId: String(body.id ?? igUserId),
    username: typeof body.username === "string" ? body.username : null,
    name: typeof body.name === "string" ? body.name : null,
  };
}
