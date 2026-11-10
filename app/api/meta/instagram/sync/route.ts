import { NextRequest } from "next/server";
import {
  getMetaConfig,
  isMetaOAuthEnabled,
  type MetaConfig,
} from "@/lib/meta/config";
import { canManageInstagram, getCurrentProfile } from "@/lib/meta/authz";
import { fetchInstagramAccount, inspectToken, MetaApiError } from "@/lib/meta/graph";
import { isSameOrigin, json, readClientId } from "@/lib/meta/http";
import {
  getConnectionStatus,
  readAccessToken,
  recordSyncStatus,
  recordSyncSuccess,
} from "@/lib/meta/store";

/**
 * POST /api/meta/instagram/sync?client_id=<uuid>
 *
 * Sincronização SOMENTE LEITURA: revalida o token na Meta e atualiza
 * nome, @usuário, permissões e validade. Não publica nada.
 * Exige admin/team autorizados e a integração ativada.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return json({ error: "Origem não permitida." }, 403);
  }

  const clientId = readClientId(request);
  if (!clientId) return json({ error: "client_id inválido." }, 400);

  const profile = await getCurrentProfile();
  if (!profile) return json({ error: "Sessão inválida." }, 401);

  if (!canManageInstagram(profile, clientId)) {
    return json({ error: "Acesso negado." }, 403);
  }

  if (!isMetaOAuthEnabled()) {
    return json({ error: "Integração Instagram ainda não ativada." }, 503);
  }

  let config: MetaConfig;
  try {
    config = getMetaConfig();
  } catch {
    console.error("[meta-sync] configuração inválida");
    return json({ error: "Integração Instagram mal configurada." }, 503);
  }

  try {
    const stored = await readAccessToken(clientId, config.encryptionKey);
    if (!stored) return json({ error: "Nenhuma conta conectada." }, 404);

    const inspection = await inspectToken(config, stored.accessToken);

    if (!inspection.valid) {
      const expired =
        inspection.expiresAt !== null && inspection.expiresAt.getTime() <= Date.now();

      await recordSyncStatus(clientId, expired ? "expired" : "revoked");
      return json({ connection: await getConnectionStatus(clientId) });
    }

    const account = await fetchInstagramAccount(config, stored.igUserId, stored.accessToken);

    await recordSyncSuccess(clientId, {
      username: account.username,
      name: account.name,
      tokenType: inspection.type,
      expiresAt: inspection.expiresAt,
      scopes: inspection.scopes,
    });

    return json({ connection: await getConnectionStatus(clientId) });
  } catch (error) {
    console.error("[meta-sync]", error instanceof Error ? error.message : "falha");

    try {
      const invalid = error instanceof MetaApiError && error.isInvalidToken;
      await recordSyncStatus(clientId, invalid ? "revoked" : "error");
      return json({ connection: await getConnectionStatus(clientId) });
    } catch {
      return json({ error: "Não foi possível sincronizar." }, 500);
    }
  }
}
