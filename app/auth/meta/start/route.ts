import { NextRequest, NextResponse } from "next/server";
import {
  getMetaConfig,
  isMetaOAuthEnabled,
  MetaConfigError,
} from "@/lib/meta/config";
import { canManageInstagram, getCurrentProfile } from "@/lib/meta/authz";
import { buildAuthorizeUrl } from "@/lib/meta/graph";
import { createState, STATE_COOKIE, STATE_TTL_SECONDS } from "@/lib/meta/state";
import { clientExists } from "@/lib/meta/store";

/**
 * GET /auth/meta/start?client_id=<uuid>
 *
 * Inicia a conexão (ou substituição) do Instagram de UM cliente via
 * Login do Facebook para Empresas. Só admin/team autorizados.
 */

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  if (!isMetaOAuthEnabled()) {
    return NextResponse.json(
      { error: "Integração Instagram ainda não ativada." },
      { status: 503 }
    );
  }

  let config;
  try {
    config = getMetaConfig();
  } catch (error) {
    if (error instanceof MetaConfigError) {
      console.error("[meta-oauth] configuração inválida:", error.message);
    }
    return NextResponse.json(
      { error: "Integração Instagram mal configurada." },
      { status: 503 }
    );
  }

  const clientId = request.nextUrl.searchParams.get("client_id") ?? "";

  if (!UUID_RE.test(clientId)) {
    return NextResponse.json({ error: "client_id inválido." }, { status: 400 });
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.redirect(new URL("/login", config.appBaseUrl));
  }

  if (!canManageInstagram(profile, clientId) || !(await clientExists(clientId))) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { nonce, cookieValue } = createState(
    clientId,
    profile.id,
    config.stateSecret
  );

  const response = NextResponse.redirect(buildAuthorizeUrl(config, nonce));

  response.cookies.set(STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: config.redirectUri.startsWith("https://"),
    // "lax" permite que o cookie volte no redirect top-level da Meta.
    sameSite: "lax",
    path: "/auth/meta",
    maxAge: STATE_TTL_SECONDS,
  });

  response.headers.set("Cache-Control", "no-store");

  return response;
}
