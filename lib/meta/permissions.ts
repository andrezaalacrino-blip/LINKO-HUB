/**
 * Regras de acesso à integração Instagram (funções puras, sem I/O,
 * para poderem ser testadas isoladamente). Usadas por lib/meta/authz.ts.
 *
 * - admin: todos os clientes.
 * - team: somente com a permissão existente `client_management`
 *   (a mesma que libera a tela /clientes no proxy).
 * - client: nunca gerencia; vê apenas o status do próprio cadastro.
 */

export type HubProfile = {
  id: string;
  role: "admin" | "team" | "client";
  active: boolean;
  client_id: string | null;
  permissions: {
    client_management?: boolean;
  } | null;
};

/** Conectar, substituir, sincronizar ou desconectar o Instagram de `clientId`. */
export function canManageInstagram(
  profile: HubProfile,
  clientId: string
): boolean {
  if (!clientId || !profile.active) return false;

  switch (profile.role) {
    case "admin":
      return true;
    case "team":
      return profile.permissions?.client_management === true;
    default:
      return false;
  }
}

/** Ver o status (sem token) da conexão de `clientId`. */
export function canViewInstagram(
  profile: HubProfile,
  clientId: string
): boolean {
  if (canManageInstagram(profile, clientId)) return true;

  return (
    profile.active &&
    profile.role === "client" &&
    Boolean(profile.client_id) &&
    profile.client_id === clientId
  );
}
