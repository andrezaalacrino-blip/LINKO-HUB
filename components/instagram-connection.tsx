"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AtSign,
  Check,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
  Unlink,
  X,
} from "lucide-react";
import {
  capabilityStatus,
  connectionHealth,
  type HealthLevel,
} from "@/lib/meta/connection-health";

/**
 * Área de integração Instagram de UM cliente (modal).
 *
 * Só exibe dados reais vindos de /api/meta/instagram — nunca token.
 * Os botões de gestão só aparecem quando o servidor diz `canManage`
 * (admin ou team com client_management); cada ação é revalidada no
 * servidor. Conectar/sincronizar ficam bloqueados enquanto a
 * integração não estiver ativada (`oauthEnabled: false`).
 */

type Connection = {
  ig_user_id: string;
  ig_username: string | null;
  ig_name: string | null;
  status: string;
  token_type: string | null;
  token_expires_at: string | null;
  granted_scopes: string[];
  connected_at: string;
  last_synced_at: string | null;
};

type PanelState = {
  connection: Connection | null;
  canManage: boolean;
  oauthEnabled: boolean;
};

const RESULT_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "Instagram conectado com sucesso.", ok: true },
  denied: { text: "A autorização foi cancelada na Meta.", ok: false },
  invalid_state: { text: "A sessão de conexão expirou. Tente novamente.", ok: false },
  forbidden: { text: "Você não tem permissão para conectar este cliente.", ok: false },
  no_account: { text: "Nenhuma conta do Instagram foi selecionada na Meta.", ok: false },
  multiple_accounts: { text: "Selecione apenas UMA conta do Instagram por cliente.", ok: false },
  already_linked: { text: "Essa conta do Instagram já está vinculada a outro cliente.", ok: false },
  error: { text: "Não foi possível concluir a conexão com o Instagram. Tente novamente.", ok: false },
};

const LEVEL_STYLES: Record<HealthLevel, { badge: string; dot: string }> = {
  none: { badge: "bg-[#343a44] text-[#a0a7b3]", dot: "bg-[#6f7682]" },
  ok: { badge: "bg-[#17382b] text-[#5ee0a3]", dot: "bg-[#2ac97d]" },
  warning: { badge: "bg-[#3a3220] text-[#f3c969]", dot: "bg-[#e0a83a]" },
  error: { badge: "bg-[#3a2323] text-[#ff8d8d]", dot: "bg-[#ff6b6b]" },
};

function formatDateTime(value: string | null) {
  if (!value) return "Nunca";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#363c46] bg-[#23272f] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f96a3]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm text-white">{value}</p>
    </div>
  );
}

export function InstagramPanel({
  clientId,
  clientName,
  onClose,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<PanelState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  const endpoint = `/api/meta/instagram?client_id=${encodeURIComponent(clientId)}`;

  const load = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setLoadError(body.error ?? "Não foi possível carregar a integração.");
        return;
      }

      setLoadError(null);
      setState({
        connection: body.connection ?? null,
        canManage: Boolean(body.canManage),
        oauthEnabled: Boolean(body.oauthEnabled),
      });
    } catch {
      setLoadError("Não foi possível carregar a integração.");
    }
  }, [endpoint]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    void load();
  }, [load]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function sync() {
    setBusy("sync");
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/meta/instagram/sync?client_id=${encodeURIComponent(clientId)}`,
        { method: "POST" }
      );
      const body = await response.json().catch(() => ({}));
      setFeedback(response.ok ? "Sincronização concluída." : body.error ?? "Falha ao sincronizar.");
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    setFeedback(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      setFeedback(response.ok ? "Instagram desconectado. O token salvo foi apagado." : body.error ?? "Falha ao desconectar.");
      setConfirmingDisconnect(false);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const connection = state?.connection ?? null;
  const health = connectionHealth(connection);
  const capabilities = capabilityStatus(connection?.granted_scopes ?? []);
  const styles = LEVEL_STYLES[health.level];
  const connectHref = `/auth/meta/start?client_id=${encodeURIComponent(clientId)}`;

  const connectLabel = !connection
    ? "Conectar Instagram"
    : health.needsReconnect
      ? "Reconectar"
      : "Substituir conta";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instagram-panel-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-[#363c46] bg-[#252a32] shadow-2xl sm:rounded-[28px]"
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-[#363c46] px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7c74ff]">
              Integração Instagram
            </p>
            <h2
              id="instagram-panel-title"
              className="mt-1 truncate text-xl font-semibold text-white"
            >
              {clientName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#3d444f] text-[#a0a7b3] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
          {!state && !loadError && (
            <div className="flex items-center gap-2 text-sm text-[#8f96a3]">
              <LoaderCircle size={16} className="animate-spin" /> Carregando…
            </div>
          )}

          {loadError && (
            <p className="rounded-xl border border-[#5a3434] bg-[#352323] px-4 py-3 text-sm text-[#ff8d8d]">
              {loadError}
            </p>
          )}

          {state && (
            <>
              {/* Perfil + status */}
              <div className="flex flex-col gap-4 rounded-[20px] border border-[#363c46] bg-[#292e36] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2f2b52] text-[#a59fff]">
                    <AtSign size={20} />
                  </div>

                  <div className="min-w-0">
                    {connection ? (
                      <>
                        <p className="truncate font-semibold text-white">
                          {connection.ig_name || connection.ig_username || "Conta sem nome"}
                        </p>
                        {connection.ig_username ? (
                          <a
                            href={`https://www.instagram.com/${encodeURIComponent(connection.ig_username)}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-1 truncate text-sm text-[#a59fff] hover:underline"
                          >
                            @{connection.ig_username}
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        ) : (
                          <p className="text-sm text-[#8f96a3]">@ indisponível</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-white">Nenhuma conta conectada</p>
                        <p className="text-sm text-[#8f96a3]">
                          Este cliente ainda não tem Instagram vinculado.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <span
                  className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${styles.badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                  {health.label}
                </span>
              </div>

              {/* Aviso de renovação / problema */}
              {health.message && (
                <div
                  role="alert"
                  className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${
                    health.level === "error"
                      ? "border-[#5a3434] bg-[#352323] text-[#ffb3b3]"
                      : "border-[#5a4a2a] bg-[#2f2a1e] text-[#f3d48f]"
                  }`}
                >
                  <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{health.message}</span>
                </div>
              )}

              {/* Datas */}
              {connection && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoItem label="Última sincronização" value={formatDateTime(connection.last_synced_at)} />
                  <InfoItem label="Conectado em" value={formatDateTime(connection.connected_at)} />
                  <InfoItem
                    label="Autorização"
                    value={
                      connection.token_expires_at
                        ? `Até ${formatDateTime(connection.token_expires_at)}`
                        : "Sem expiração"
                    }
                  />
                </div>
              )}

              {/* Permissões */}
              {connection && (
                <div>
                  <p className="mb-3 text-sm font-semibold text-white">Permissões concedidas</p>
                  <ul className="flex flex-wrap gap-2">
                    {capabilities.map((capability) => (
                      <li
                        key={capability.key}
                        title={capability.note ?? undefined}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                          capability.granted
                            ? "border-[#315743] bg-[#17382b] text-[#72e6b0]"
                            : "border-[#3d444f] bg-[#23272f] text-[#8f96a3]"
                        }`}
                      >
                        {capability.granted ? <Check size={12} /> : <X size={12} />}
                        {capability.label}
                      </li>
                    ))}
                  </ul>
                  {capabilities.some((c) => c.note) && (
                    <p className="mt-2 text-xs text-[#8f96a3]">
                      {capabilities.find((c) => c.note)?.note}
                    </p>
                  )}
                </div>
              )}

              {feedback && (
                <p role="status" className="text-sm text-[#c9ced6]">
                  {feedback}
                </p>
              )}

              {!state.canManage && (
                <p className="text-xs text-[#8f96a3]">
                  Você pode ver o status, mas não tem permissão para gerenciar esta conexão.
                </p>
              )}

              {state.canManage && !state.oauthEnabled && (
                <p className="rounded-xl border border-[#3d444f] bg-[#23272f] px-4 py-3 text-xs text-[#a0a7b3]">
                  A integração com a Meta ainda não foi ativada neste ambiente. Conectar e
                  sincronizar ficam disponíveis após a configuração do domínio.
                </p>
              )}
            </>
          )}
        </div>

        {/* Ações */}
        {state?.canManage && (
          <div className="border-t border-[#363c46] px-5 py-4 sm:px-7">
            {confirmingDisconnect ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#ffb3b3]">
                  Desconectar @{connection?.ig_username ?? "conta"}? O token salvo será apagado.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDisconnect(false)}
                    disabled={busy !== null}
                    className="flex-1 rounded-xl border border-[#3d444f] px-4 py-2.5 text-sm sm:flex-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={disconnect}
                    disabled={busy !== null}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#5a3434] bg-[#352323] px-4 py-2.5 text-sm font-semibold text-[#ff8d8d] disabled:opacity-50 sm:flex-none"
                  >
                    {busy === "disconnect" && <LoaderCircle size={14} className="animate-spin" />}
                    Confirmar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {connection && (
                  <button
                    type="button"
                    onClick={() => setConfirmingDisconnect(true)}
                    disabled={busy !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#5a3434] bg-[#352323] px-4 py-2.5 text-sm text-[#ff8d8d] disabled:opacity-50"
                  >
                    <Unlink size={15} /> Desconectar
                  </button>
                )}

                {connection && (
                  <button
                    type="button"
                    onClick={sync}
                    disabled={busy !== null || !state.oauthEnabled}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3d444f] px-4 py-2.5 text-sm disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={busy === "sync" ? "animate-spin" : ""} />
                    Sincronizar agora
                  </button>
                )}

                {state.oauthEnabled ? (
                  <a
                    href={connectHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#635bff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#716aff]"
                  >
                    <AtSign size={15} /> {connectLabel}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Integração ainda não ativada"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#635bff] px-4 py-2.5 text-sm font-semibold text-white opacity-50"
                  >
                    <AtSign size={15} /> {connectLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Aviso exibido em /clientes ao voltar da Meta (?instagram=<status>).
 * Lê o status uma vez e limpa a URL para não repetir no refresh.
 */
export function InstagramResultNotice() {
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("instagram");
    if (!status) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única da URL
    setResult(RESULT_MESSAGES[status] ?? RESULT_MESSAGES.error);

    url.searchParams.delete("instagram");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  if (!result) return null;

  return (
    <div
      role="status"
      className={`mb-5 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
        result.ok
          ? "border-[#315743] bg-[#17382b] text-[#72e6b0]"
          : "border-[#5a3a3a] bg-[#3a2323] text-[#f0a8a8]"
      }`}
    >
      <span>{result.text}</span>
      <button
        type="button"
        onClick={() => setResult(null)}
        className="shrink-0 text-xs opacity-80 hover:opacity-100"
      >
        Fechar
      </button>
    </div>
  );
}
