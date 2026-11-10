import { createClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "./crypto";

/**
 * Persistência das conexões Instagram. Usa a service role porque a
 * tabela não é acessível a anon/authenticated (ver migration).
 * O token é criptografado ANTES de sair do processo. Só
 * `readAccessToken` devolve o token (decifrado) e ela é usada apenas
 * dentro de rotas de servidor para falar com a Meta — nunca em respostas.
 *
 * Isolamento entre clientes (garantido também no banco):
 * - 1 Instagram por cliente   → unique(client_id)
 * - 1 cliente por Instagram   → unique(ig_user_id)
 */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase (service role) não configurado.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const PUBLIC_COLUMNS =
  "client_id, ig_user_id, ig_username, ig_name, token_type, token_expires_at, granted_scopes, status, connected_at, last_synced_at, updated_at";

export type InstagramConnectionStatus = {
  client_id: string;
  ig_user_id: string;
  ig_username: string | null;
  ig_name: string | null;
  token_type: string | null;
  token_expires_at: string | null;
  granted_scopes: string[];
  status: "active" | "revoked" | "expired" | "error";
  connected_at: string;
  last_synced_at: string | null;
  updated_at: string;
};

export async function clientExists(clientId: string) {
  const { data, error } = await getAdminClient()
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function getConnectionStatus(
  clientId: string
): Promise<InstagramConnectionStatus | null> {
  const { data, error } = await getAdminClient()
    .from("instagram_connections")
    .select(PUBLIC_COLUMNS)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao ler conexão Instagram (${error.code}).`);
  }

  return (data as InstagramConnectionStatus | null) ?? null;
}

/** Somente servidor: token decifrado para chamar a Meta. */
export async function readAccessToken(clientId: string, key: Buffer) {
  const { data, error } = await getAdminClient()
    .from("instagram_connections")
    .select("ig_user_id, access_token_encrypted")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao ler conexão Instagram (${error.code}).`);
  }

  if (!data) return null;

  return {
    igUserId: data.ig_user_id as string,
    accessToken: decryptToken(data.access_token_encrypted as string, key),
  };
}

export type SaveResult = "saved" | "already_linked";

/** Conecta ou SUBSTITUI o Instagram do cliente. */
export async function saveInstagramConnection(input: {
  clientId: string;
  igUserId: string;
  username: string | null;
  name: string | null;
  accessToken: string;
  tokenType: string | null;
  expiresAt: Date | null;
  scopes: string[];
  connectedBy: string;
  encryptionKey: Buffer;
}): Promise<SaveResult> {
  const now = new Date().toISOString();

  const { error } = await getAdminClient()
    .from("instagram_connections")
    .upsert(
      {
        client_id: input.clientId,
        ig_user_id: input.igUserId,
        ig_username: input.username,
        ig_name: input.name,
        access_token_encrypted: encryptToken(input.accessToken, input.encryptionKey),
        token_type: input.tokenType,
        token_expires_at: input.expiresAt?.toISOString() ?? null,
        granted_scopes: input.scopes,
        status: "active",
        connected_by: input.connectedBy,
        connected_at: now,
        last_synced_at: now,
        updated_at: now,
      },
      { onConflict: "client_id" }
    );

  if (!error) return "saved";

  // unique(ig_user_id): essa conta já pertence a OUTRO cliente.
  if (error.code === "23505") return "already_linked";

  // Só o código do Postgres — nunca o payload (que contém o token cifrado).
  throw new Error(`Falha ao salvar conexão Instagram (${error.code}).`);
}

/** Resultado de uma sincronização bem-sucedida (sem trocar o token). */
export async function recordSyncSuccess(
  clientId: string,
  input: {
    username: string | null;
    name: string | null;
    tokenType: string | null;
    expiresAt: Date | null;
    scopes: string[];
  }
) {
  const now = new Date().toISOString();

  const { error } = await getAdminClient()
    .from("instagram_connections")
    .update({
      ig_username: input.username,
      ig_name: input.name,
      token_type: input.tokenType,
      token_expires_at: input.expiresAt?.toISOString() ?? null,
      granted_scopes: input.scopes,
      status: "active",
      last_synced_at: now,
      updated_at: now,
    })
    .eq("client_id", clientId);

  if (error) {
    throw new Error(`Falha ao registrar sincronização (${error.code}).`);
  }
}

export async function recordSyncStatus(
  clientId: string,
  status: "revoked" | "expired" | "error"
) {
  const { error } = await getAdminClient()
    .from("instagram_connections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("client_id", clientId);

  if (error) {
    throw new Error(`Falha ao registrar status (${error.code}).`);
  }
}

/** Remove a conexão (e o token cifrado) do cliente. */
export async function deleteInstagramConnection(clientId: string) {
  const { data, error } = await getAdminClient()
    .from("instagram_connections")
    .delete()
    .eq("client_id", clientId)
    .select("client_id");

  if (error) {
    throw new Error(`Falha ao desconectar Instagram (${error.code}).`);
  }

  return (data?.length ?? 0) > 0;
}
