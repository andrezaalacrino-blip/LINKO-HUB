import { NextRequest, NextResponse } from "next/server";
import {
  getMetaConfig,
  isMetaOAuthEnabled,
  type MetaConfig,
} from "@/lib/meta/config";
import { canManageInstagram, getCurrentProfile } from "@/lib/meta/authz";
import {
  exchangeCodeForToken,
  fetchInstagramAccount,
  inspectToken,
  listInstagramAccountsViaPages,
  MetaApiError,
} from "@/lib/meta/graph";
import { STATE_COOKIE, verifyState } from "@/lib/meta/state";
import { saveInstagramConnection } from "@/lib/meta/store";

/**
 * GET /auth/meta/callback  (URI de redirecionamento OAuth cadastrada na Meta)
 *
 * Recebe ?code&state (sucesso) ou ?error&error_reason (recusa).
 * Nenhum token sai deste handler: ele é trocado, validado no
 * /debug_token, criptografado e salvo no servidor. O navegador recebe
 * só um redirect com um status curto.
 */

export const dynamic = "force-dynamic";

type ResultStatus =
  | "connected"
  | "denied"
  | "invalid_state"
  | "forbidden"
  | "no_account"
  | "multiple_accounts"
  | "already_linked"
  | "error";

function finish(baseUrl: string, status: ResultStatus) {
  // Só admin/team chegam aqui com sucesso; clientes não iniciam o fluxo.
  const target = new URL("/clientes", baseUrl);
  target.searchParams.set("instagram", status);

  const response = NextResponse.redirect(target);

  // O state é de uso único: apaga sempre, com sucesso ou não.
  response.cookies.set(STATE_COOKIE, "", { path: "/auth/meta", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  // Evita que a URL com ?code vaze via Referer.
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}

export async function GET(request: NextRequest) {
  if (!isMetaOAuthEnabled()) {
    return NextResponse.json(
      { error: "Integração Instagram ainda não ativada." },
      { status: 503 }
    );
  }

  let config: MetaConfig;
  try {
    config = getMetaConfig();
  } catch {
    console.error("[meta-oauth] configuração inválida no callback");
    return NextResponse.json(
      { error: "Integração Instagram mal configurada." },
      { status: 503 }
    );
  }

  const params = request.nextUrl.searchParams;

  // 1) State: valida ANTES de qualquer outra coisa (CSRF).
  const state = verifyState(
    params.get("state"),
    request.cookies.get(STATE_COOKIE)?.value,
    config.stateSecret
  );

  if (!state) {
    console.warn("[meta-oauth] state ausente, inválido ou expirado");
    return finish(config.appBaseUrl, "invalid_state");
  }

  // 2) Usuário cancelou ou a Meta devolveu erro.
  if (params.get("error")) {
    console.info("[meta-oauth] autorização não concedida", {
      reason: params.get("error_reason")?.slice(0, 64),
    });
    return finish(config.appBaseUrl, "denied");
  }

  // 3) Mesmo usuário que iniciou, ainda autorizado para o mesmo cliente.
  const profile = await getCurrentProfile();

  if (
    !profile ||
    profile.id !== state.userId ||
    !canManageInstagram(profile, state.clientId)
  ) {
    return finish(config.appBaseUrl, "forbidden");
  }

  // 4) Código: a Meta pode anexar "#_" ao final.
  const code = (params.get("code") ?? "").replace(/#_$/, "");

  if (!code || code.length > 2048) {
    return finish(config.appBaseUrl, "error");
  }

  try {
    const { accessToken } = await exchangeCodeForToken(config, code);

    // 5) Token emitido para ESTE app e ainda válido + ativos selecionados.
    const inspection = await inspectToken(config, accessToken);

    if (!inspection.valid) {
      console.warn("[meta-oauth] token recebido não é válido para este app");
      return finish(config.appBaseUrl, "error");
    }

    let accountIds = inspection.instagramAccountIds;

    if (accountIds.length === 0) {
      accountIds = await listInstagramAccountsViaPages(config, accessToken);
    }

    // 6) Isolamento: um fluxo = um cliente = exatamente uma conta.
    if (accountIds.length === 0) {
      return finish(config.appBaseUrl, "no_account");
    }

    if (accountIds.length > 1) {
      console.warn("[meta-oauth] mais de uma conta Instagram selecionada", {
        clientId: state.clientId,
        count: accountIds.length,
      });
      return finish(config.appBaseUrl, "multiple_accounts");
    }

    const account = await fetchInstagramAccount(config, accountIds[0], accessToken);

    const result = await saveInstagramConnection({
      clientId: state.clientId,
      igUserId: account.igUserId,
      username: account.username,
      name: account.name,
      accessToken,
      tokenType: inspection.type,
      expiresAt: inspection.expiresAt,
      scopes: inspection.scopes,
      connectedBy: profile.id,
      encryptionKey: config.encryptionKey,
    });

    if (result === "already_linked") {
      console.warn("[meta-oauth] conta já vinculada a outro cliente", {
        clientId: state.clientId,
      });
      return finish(config.appBaseUrl, "already_linked");
    }

    console.info("[meta-oauth] conexão salva", {
      clientId: state.clientId,
      tokenType: inspection.type,
    });

    return finish(config.appBaseUrl, "connected");
  } catch (error) {
    // Logs sem token, sem code, sem corpo de resposta.
    console.error(
      "[meta-oauth]",
      error instanceof MetaApiError || error instanceof Error
        ? error.message
        : "falha desconhecida"
    );

    return finish(config.appBaseUrl, "error");
  }
}
