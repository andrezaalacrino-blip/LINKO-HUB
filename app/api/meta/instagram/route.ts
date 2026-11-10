import { NextRequest } from "next/server";
import { isMetaOAuthEnabled } from "@/lib/meta/config";
import {
  canManageInstagram,
  canViewInstagram,
  getCurrentProfile,
} from "@/lib/meta/authz";
import { isSameOrigin, json, readClientId } from "@/lib/meta/http";
import {
  deleteInstagramConnection,
  getConnectionStatus,
} from "@/lib/meta/store";

/**
 * GET    /api/meta/instagram?client_id=<uuid>  → status da conexão (sem token)
 * DELETE /api/meta/instagram?client_id=<uuid>  → desconecta (admin/team autorizados)
 *
 * Funciona mesmo com META_OAUTH_ENABLED=false, para que seja sempre
 * possível consultar e remover conexões existentes.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clientId = readClientId(request);
  if (!clientId) return json({ error: "client_id inválido." }, 400);

  const profile = await getCurrentProfile();
  if (!profile) return json({ error: "Sessão inválida." }, 401);

  if (!canViewInstagram(profile, clientId)) {
    return json({ error: "Acesso negado." }, 403);
  }

  try {
    const connection = await getConnectionStatus(clientId);

    return json({
      connection,
      canManage: canManageInstagram(profile, clientId),
      oauthEnabled: isMetaOAuthEnabled(),
    });
  } catch (error) {
    console.error("[meta-instagram]", error instanceof Error ? error.message : "falha");
    return json({ error: "Não foi possível consultar a conexão." }, 500);
  }
}

export async function DELETE(request: NextRequest) {
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

  try {
    const removed = await deleteInstagramConnection(clientId);

    console.info("[meta-instagram] desconexão", {
      clientId,
      by: profile.id,
      removed,
    });

    return json({ removed });
  } catch (error) {
    console.error("[meta-instagram]", error instanceof Error ? error.message : "falha");
    return json({ error: "Não foi possível desconectar." }, 500);
  }
}
