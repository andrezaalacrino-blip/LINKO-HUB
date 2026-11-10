/**
 * Interpretação da conexão Instagram para a interface
 * (funções puras, sem I/O — testadas em tests/meta.test.mjs).
 */

export type ConnectionSnapshot = {
  status: string;
  token_expires_at: string | null;
  last_synced_at: string | null;
  granted_scopes: string[];
};

export type HealthLevel = "none" | "ok" | "warning" | "error";

export type ConnectionHealth = {
  level: HealthLevel;
  label: string;
  /** Mensagem de ação para a pessoa (renovar, reconectar...). */
  message: string | null;
  needsReconnect: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const EXPIRY_WARNING_DAYS = 7;
export const STALE_SYNC_DAYS = 30;

export function connectionHealth(
  connection: ConnectionSnapshot | null,
  now: Date = new Date()
): ConnectionHealth {
  if (!connection) {
    return {
      level: "none",
      label: "Não conectado",
      message: null,
      needsReconnect: false,
    };
  }

  if (connection.status === "revoked") {
    return {
      level: "error",
      label: "Acesso revogado",
      message:
        "O acesso foi removido na Meta. Reconecte a conta para voltar a sincronizar.",
      needsReconnect: true,
    };
  }

  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at)
    : null;

  if (
    connection.status === "expired" ||
    (expiresAt && expiresAt.getTime() <= now.getTime())
  ) {
    return {
      level: "error",
      label: "Token expirado",
      message: "A autorização expirou. Reconecte a conta para renovar o acesso.",
      needsReconnect: true,
    };
  }

  if (connection.status === "error") {
    return {
      level: "error",
      label: "Falha na sincronização",
      message:
        "A última verificação com a Meta falhou. Tente sincronizar de novo; se persistir, reconecte a conta.",
      needsReconnect: false,
    };
  }

  if (expiresAt) {
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS);

    if (daysLeft <= EXPIRY_WARNING_DAYS) {
      return {
        level: "warning",
        label: "Expira em breve",
        message: `A autorização expira em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}. Reconecte a conta para renovar.`,
        needsReconnect: true,
      };
    }
  }

  const lastSync = connection.last_synced_at
    ? new Date(connection.last_synced_at)
    : null;

  if (!lastSync || now.getTime() - lastSync.getTime() > STALE_SYNC_DAYS * DAY_MS) {
    return {
      level: "warning",
      label: "Sem sincronização recente",
      message: "Sincronize para confirmar que o acesso continua válido.",
      needsReconnect: false,
    };
  }

  return { level: "ok", label: "Conectado", message: null, needsReconnect: false };
}

/**
 * Capacidades exibidas como indicadores. Aceita os nomes de escopo da
 * API com Login do Facebook (instagram_*) e da API com login do
 * Instagram (instagram_business_*).
 */
export const CAPABILITIES = [
  {
    key: "profile",
    label: "Perfil e mídias",
    scopes: ["instagram_basic", "instagram_business_basic"],
  },
  {
    key: "insights",
    label: "Métricas",
    scopes: ["instagram_manage_insights", "instagram_business_manage_insights"],
  },
  {
    key: "comments",
    label: "Comentários",
    scopes: ["instagram_manage_comments", "instagram_business_manage_comments"],
  },
  {
    key: "messages",
    label: "Mensagens",
    scopes: ["instagram_manage_messages", "instagram_business_manage_messages"],
  },
  {
    key: "publish",
    label: "Publicação",
    scopes: ["instagram_content_publish", "instagram_business_content_publish"],
  },
] as const;

export type CapabilityStatus = {
  key: string;
  label: string;
  granted: boolean;
  note: string | null;
};

export function capabilityStatus(grantedScopes: string[]): CapabilityStatus[] {
  const granted = new Set(grantedScopes);

  return CAPABILITIES.map((capability) => {
    const isGranted = capability.scopes.some((scope) => granted.has(scope));

    return {
      key: capability.key,
      label: capability.label,
      granted: isGranted,
      note:
        capability.key === "publish" && isGranted
          ? "Concedida na Meta, mas o Hub não publica automaticamente."
          : null,
    };
  });
}
