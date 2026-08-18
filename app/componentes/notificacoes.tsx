"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NotificationType =
  | "revisao"
  | "pagamento"
  | "vencimento"
  | "aprovado"
  | "publicado";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time?: string;
  href?: string;
  read?: boolean;
};

type ApiResponse = {
  notifications?: Notification[];
  error?: string;
};

const notificationConfig: Record<
  NotificationType,
  {
    icon: string;
    color: string;
    background: string;
  }
> = {
  revisao: {
    icon: "✓",
    color: "text-violet-300",
    background: "bg-violet-500/10",
  },
  pagamento: {
    icon: "$",
    color: "text-red-300",
    background: "bg-red-500/10",
  },
  vencimento: {
    icon: "!",
    color: "text-amber-300",
    background: "bg-amber-500/10",
  },
  aprovado: {
    icon: "✓",
    color: "text-emerald-300",
    background: "bg-emerald-500/10",
  },
  publicado: {
    icon: "↗",
    color: "text-blue-300",
    background: "bg-blue-500/10",
  },
};

export default function Notificacoes() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/portal/notificacoes", {
        method: "GET",
        cache: "no-store",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Não foi possível carregar as notificações."
        );
      }

      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as notificações."
      );
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                read: true,
              }
            : notification
        )
      );

      const response = await fetch("/api/portal/notificacoes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
        }),
      });

      if (!response.ok) {
        console.error("Não foi possível marcar a notificação como lida.");
      }
    } catch (err) {
      console.error("Erro ao marcar notificação:", err);
    }
  }

  async function markAllAsRead() {
    try {
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      const response = await fetch("/api/portal/notificacoes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          all: true,
        }),
      });

      if (!response.ok) {
        console.error("Não foi possível marcar as notificações.");
      }
    } catch (err) {
      console.error("Erro ao marcar notificações:", err);
    }
  }

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);

          if (!open) {
            loadNotifications();
          }
        }}
        aria-label="Notificações"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#1f242d] bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-[100] w-[370px] overflow-hidden rounded-2xl border border-slate-700 bg-[#20252e] shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Notificações
              </h3>

              <p className="mt-1 text-[11px] text-slate-500">
                {unreadCount === 0
                  ? "Tudo em dia"
                  : `${unreadCount} ${
                      unreadCount === 1
                        ? "notificação pendente"
                        : "notificações pendentes"
                    }`}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-medium text-violet-300 transition hover:text-violet-200"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[430px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-violet-400" />

                <p className="mt-3 text-xs text-slate-500">
                  Carregando notificações...
                </p>
              </div>
            ) : error ? (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-300">
                  !
                </div>

                <p className="mt-3 text-xs text-red-300">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={loadNotifications}
                  className="mt-4 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
                >
                  Tentar novamente
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>

                <p className="mt-4 text-sm font-medium text-slate-300">
                  Nenhuma notificação
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Você está em dia.
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => {
                  const config =
                    notificationConfig[notification.type] ||
                    notificationConfig.revisao;

                  const content = (
                    <div
                      className={`group flex gap-3 border-b border-slate-800 px-5 py-4 transition ${
                        notification.read
                          ? "bg-transparent"
                          : "bg-slate-800/30"
                      } hover:bg-slate-800/60`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.background} ${config.color}`}
                      >
                        <span className="text-sm font-bold">
                          {config.icon}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-xs leading-5 ${
                              notification.read
                                ? "font-medium text-slate-300"
                                : "font-semibold text-white"
                            }`}
                          >
                            {notification.title}
                          </p>

                          {!notification.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                          )}
                        </div>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          {notification.description}
                        </p>

                        {notification.time && (
                          <p className="mt-2 text-[10px] text-slate-600">
                            {notification.time}
                          </p>
                        )}

                        {!notification.read && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="mt-2 text-[10px] font-medium text-violet-300 opacity-0 transition group-hover:opacity-100 hover:text-violet-200"
                          >
                            Marcar como lida
                          </button>
                        )}
                      </div>
                    </div>
                  );

                  if (notification.href) {
                    return (
                      <Link
                        key={notification.id}
                        href={notification.href}
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id);
                          }

                          setOpen(false);
                        }}
                        className="block"
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div key={notification.id}>
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 bg-slate-900/30 px-5 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}