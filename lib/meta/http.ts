import { NextRequest, NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function readClientId(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id") ?? "";
  return UUID_RE.test(clientId) ? clientId : null;
}

/**
 * Defesa extra contra CSRF em ações que mudam estado: só aceita
 * chamadas da própria origem. Compara pelo host, que atrás de
 * proxy/CDN vem em x-forwarded-host.
 */
export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
