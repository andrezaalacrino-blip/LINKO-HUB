import { hmac, randomToken, safeEqual } from "./crypto";

/**
 * Proteção CSRF do OAuth.
 *
 * - O parâmetro `state` enviado à Meta é um nonce aleatório.
 * - O mesmo nonce, junto com o cliente e o usuário que iniciaram
 *   o fluxo, fica num cookie httpOnly assinado por HMAC.
 * - No callback, o `state` da URL precisa bater com o cookie, a
 *   assinatura precisa ser válida e o fluxo não pode ter expirado.
 */

export const STATE_COOKIE = "linko_meta_oauth";
export const STATE_TTL_SECONDS = 10 * 60;

export type OAuthStatePayload = {
  nonce: string;
  clientId: string;
  userId: string;
  exp: number;
};

export function createState(
  clientId: string,
  userId: string,
  secret: Buffer
) {
  const payload: OAuthStatePayload = {
    nonce: randomToken(32),
    clientId,
    userId,
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const cookieValue = `${encoded}.${hmac(encoded, secret)}`;

  return { nonce: payload.nonce, cookieValue };
}

export function verifyState(
  stateParam: string | null,
  cookieValue: string | undefined,
  secret: Buffer
): OAuthStatePayload | null {
  if (!stateParam || !cookieValue) return null;

  const [encoded, signature] = cookieValue.split(".");
  if (!encoded || !signature) return null;

  if (!safeEqual(signature, hmac(encoded, secret))) return null;

  let payload: OAuthStatePayload;

  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payload.nonce || !payload.clientId || !payload.userId) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (!safeEqual(stateParam, payload.nonce)) return null;

  return payload;
}
