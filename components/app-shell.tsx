"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  Bell,
  Building2,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  FileBarChart2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  ReceiptText,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";

import {
  createClient,
} from "@/utils/supabase/client";

/* =========================================================
   TIPOS
========================================================= */

type UserRole =
  | "admin"
  | "team"
  | "client";

type PermissionKey =
  | "dashboard"
  | "finance"
  | "reports"
  | "marketing"
  | "users"
  | "client_management";

type Permissions = {
  dashboard: boolean;
  finance: boolean;
  reports: boolean;
  marketing: boolean;
  users: boolean;
  client_management: boolean;
};

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean;
  job_title: string | null;
  avatar_url: string | null;
  permissions: Permissions | null;
};

type MenuItem = {
  label: string;
  href: string;
  permission: PermissionKey;
  icon: React.ElementType;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

type ClientMenuItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type ClientMenuSection = {
  label: string;
  items: ClientMenuItem[];
};

type AppShellProps = {
  children: ReactNode;

  eyebrow?: string;

  title?: string;

  description?: string;

  actions?: ReactNode;

  compactHeader?: boolean;
};

type NotificationItem = {
  id: string;

  title: string;

  description: string;

  time: string;

  type:
    | "purple"
    | "green"
    | "orange"
    | "red";

  read: boolean;

  link?: string;
};

/* =========================================================
   PERMISSÕES
========================================================= */

const ADMIN_PERMISSIONS: Permissions = {
  dashboard: true,
  finance: true,
  reports: true,
  marketing: true,
  users: true,
  client_management: true,
};

const TEAM_PERMISSIONS: Permissions = {
  dashboard: false,
  finance: false,
  reports: false,
  marketing: true,
  users: false,
  client_management: false,
};

/* =========================================================
   MENU ADMIN / EQUIPE
========================================================= */

const MENU_SECTIONS: MenuSection[] = [
  {
    label: "VISÃO GERAL",

    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission:
          "dashboard",
      },
    ],
  },

  {
    label: "FINANCEIRO",

    items: [
      {
        label: "Contas a pagar",
        href: "/contas-pagar",
        icon: ReceiptText,
        permission:
          "finance",
      },

      {
        label:
          "Relatório financeiro",
        href: "/relatorios",
        icon: FileBarChart2,
        permission:
          "reports",
      },
    ],
  },

  {
    label: "MARKETING",

    items: [
      {
        label:
          "Produção de conteúdo",
        href: "/marketing",
        icon: Megaphone,
        permission:
          "marketing",
      },
    ],
  },

  {
    label: "ADMINISTRAÇÃO",

    items: [
      {
        label: "Clientes",
        href: "/clientes",
        icon: UsersRound,
        permission:
          "client_management",
      },

      {
        label: "Usuários",
        href: "/usuarios",
        icon: UserCog,
        permission:
          "users",
      },
    ],
  },
];

/* =========================================================
   MENU CLIENTE
========================================================= */

const CLIENT_MENU_SECTIONS: ClientMenuSection[] = [
  {
    label: "VISÃO GERAL",

    items: [
      {
        label: "Dashboard",
        href: "/portal",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    label: "MARKETING",

    items: [
      {
        label: "Meu conteúdo",
        href: "/portal/conteudo",
        icon: Megaphone,
      },
    ],
  },

  {
    label: "MINHA CONTA",

    items: [
      {
        label: "Informações",
        href: "/portal/informacoes",
        icon: Building2,
      },

      {
        label: "Meu perfil",
        href: "/portal/perfil",
        icon: CircleUserRound,
      },
    ],
  },
];

/* =========================================================
   NOTIFICAÇÕES TEMPORÁRIAS
========================================================= */

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",

    title:
      "Conteúdo enviado para revisão",

    description:
      "Existe um conteúdo aguardando sua revisão.",

    time: "5 min",

    type: "purple",

    read: false,

    link:
      "/portal/conteudo",
  },

  {
    id: "2",

    title:
      "Conteúdo aprovado",

    description:
      "Seu conteúdo foi aprovado e seguirá para publicação.",

    time: "20 min",

    type: "green",

    read: false,

    link:
      "/portal/conteudo",
  },

  {
    id: "3",

    title:
      "Pagamento próximo do vencimento",

    description:
      "Confira as informações da sua mensalidade.",

    time: "1 h",

    type: "orange",

    read: false,

    link:
      "/portal/informacoes",
  },
];

/* =========================================================
   APP SHELL
========================================================= */

export function AppShell({
  children,
  eyebrow,
  title,
  description,
  actions,
  compactHeader = false,
}: AppShellProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    profile,
    setProfile,
  ] =
    useState<
      Profile | null
    >(null);

  const [
    loadingProfile,
    setLoadingProfile,
  ] =
    useState(true);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] =
    useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    notificationOpen,
    setNotificationOpen,
  ] =
    useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] =
    useState(false);

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      NotificationItem[]
    >(
      INITIAL_NOTIFICATIONS
    );

  const notificationRef =
    useRef<
      HTMLDivElement | null
    >(null);

  const profileRef =
    useRef<
      HTMLDivElement | null
    >(null);

  /* =======================================================
     CARREGA PERFIL
  ======================================================= */

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          target
        )
      ) {
        setNotificationOpen(
          false
        );
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(
          target
        )
      ) {
        setProfileOpen(
          false
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  async function loadProfile() {
    setLoadingProfile(
      true
    );

    const {
      data:
        userData,

      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !userData.user
    ) {
      router.replace(
        "/login"
      );

      return;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from("profiles")
        .select(`
          id,
          name,
          email,
          role,
          active,
          job_title,
          avatar_url,
          permissions
        `)
        .eq(
          "id",
          userData.user.id
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      console.error(
        "Erro ao carregar profile:",
        error
      );

      setLoadingProfile(
        false
      );

      return;
    }

    if (
      !data.active
    ) {
      await supabase.auth.signOut();

      router.replace(
        "/login"
      );

      return;
    }

    setProfile(
      data as Profile
    );

    setLoadingProfile(
      false
    );
  }

  /* =======================================================
     PERMISSÕES
  ======================================================= */

  const permissions =
    useMemo(() => {
      if (
        profile?.role ===
        "admin"
      ) {
        return ADMIN_PERMISSIONS;
      }

      if (
        profile?.permissions
      ) {
        return profile.permissions;
      }

      return TEAM_PERMISSIONS;
    }, [
      profile,
    ]);

  function canAccess(
    permission:
      PermissionKey
  ) {
    if (
      profile?.role ===
      "admin"
    ) {
      return true;
    }

    return Boolean(
      permissions[
        permission
      ]
    );
  }

  const visibleSections =
    useMemo(() => {
      if (
        profile?.role ===
        "client"
      ) {
        return [];
      }

      return MENU_SECTIONS
        .map(
          (section) => ({
            ...section,

            items:
              section.items.filter(
                (item) =>
                  canAccess(
                    item.permission
                  )
              ),
          })
        )
        .filter(
          (section) =>
            section.items.length >
            0
        );
    }, [
      profile,
      permissions,
    ]);

  /* =======================================================
     ROTA ATIVA
  ======================================================= */

  function isActive(
    href: string
  ) {
    if (
      href ===
      "/portal"
    ) {
      return (
        pathname ===
        "/portal"
      );
    }

    if (
      href ===
      "/dashboard"
    ) {
      return (
        pathname ===
        "/dashboard"
      );
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  }

  /* =======================================================
     HOME
  ======================================================= */

  function getHomeRoute() {
    if (
      profile?.role ===
      "client"
    ) {
      return "/portal";
    }

    if (
      profile?.role ===
      "team"
    ) {
      if (
        permissions.marketing
      ) {
        return "/marketing";
      }

      if (
        permissions.finance
      ) {
        return "/contas-pagar";
      }

      if (
        permissions.reports
      ) {
        return "/relatorios";
      }

      if (
        permissions.dashboard
      ) {
        return "/dashboard";
      }
    }

    return "/dashboard";
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {
    setLoggingOut(
      true
    );

    await supabase.auth.signOut();

    router.replace(
      "/login"
    );

    router.refresh();
  }

  /* =======================================================
     NOTIFICAÇÕES
  ======================================================= */

  const unreadCount =
    notifications.filter(
      (item) =>
        !item.read
    ).length;

  function markAllAsRead() {
    setNotifications(
      (current) =>
        current.map(
          (item) => ({
            ...item,
            read: true,
          })
        )
    );
  }

  function openNotification(
    item:
      NotificationItem
  ) {
    setNotifications(
      (current) =>
        current.map(
          (notification) =>
            notification.id ===
            item.id
              ? {
                  ...notification,
                  read:
                    true,
                }
              : notification
        )
    );

    setNotificationOpen(
      false
    );

    if (
      item.link
    ) {
      router.push(
        item.link
      );
    }
  }

  /* =======================================================
     PERFIL
  ======================================================= */

  const initials =
    (
      profile?.name ||
      profile?.email ||
      "U"
    )
      .trim()
      .charAt(0)
      .toUpperCase();

  const profileLabel =
    profile?.role ===
    "admin"
      ? "Administrador"
      : profile?.role ===
          "team"
        ? profile.job_title ||
          "Equipe"
        : "Cliente";

  /* =======================================================
     AVATAR CORRIGIDO
  ======================================================= */

  function Avatar({
    size =
      "normal",
  }: {
    size?:
      | "normal"
      | "large";
  }) {
    const sizeClass =
      size ===
      "large"
        ? "h-10 w-10"
        : "h-8 w-8";

    if (
      profile?.avatar_url
    ) {
      return (
        <div
          className={`${sizeClass} shrink-0 overflow-hidden rounded-full bg-[#1f232a] ring-1 ring-[#454c58]`}
        >
          <img
            src={
              profile.avatar_url
            }
            alt={
              profile.name ||
              "Avatar"
            }
            className="block h-full w-full object-cover object-center"
          />
        </div>
      );
    }

    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#635bff] text-[10px] font-semibold text-white`}
      >
        {
          initials
        }
      </div>
    );
  }

  /* =======================================================
     MENU INTERNO
  ======================================================= */

  function InternalMenu() {
    return (
      <div className="space-y-6">
        {visibleSections.map(
          (section) => (
            <div
              key={
                section.label
              }
            >
              <p className="mb-2 px-2 text-[8px] font-semibold uppercase tracking-[0.19em] text-[#606977]">
                {
                  section.label
                }
              </p>

              <div className="space-y-1">
                {section.items.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    const active =
                      isActive(
                        item.href
                      );

                    return (
                      <Link
                        key={
                          item.href
                        }
                        href={
                          item.href
                        }
                        onClick={() =>
                          setMobileMenuOpen(
                            false
                          )
                        }
                        className={`group flex h-10 items-center gap-3 rounded-xl px-3 text-[11px] font-medium transition ${
                          active
                            ? "bg-[#343a44] text-white"
                            : "text-[#9ba3af] hover:bg-[#2b3038] hover:text-white"
                        }`}
                      >
                        <Icon
                          size={15}
                          strokeWidth={
                            1.8
                          }
                          className={
                            active
                              ? "text-[#aaa5ff]"
                              : "text-[#737c89] group-hover:text-[#aaa5ff]"
                          }
                        />

                        <span className="min-w-0 flex-1 truncate">
                          {
                            item.label
                          }
                        </span>

                        {active && (
                          <ChevronRight
                            size={12}
                            className="text-[#7770ff]"
                          />
                        )}
                      </Link>
                    );
                  }
                )}
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  /* =======================================================
     MENU CLIENTE
  ======================================================= */

  function ClientMenu() {
    return (
      <div className="space-y-6">
        {CLIENT_MENU_SECTIONS.map(
          (section) => (
            <div
              key={
                section.label
              }
            >
              <p className="mb-2 px-2 text-[8px] font-semibold uppercase tracking-[0.19em] text-[#606977]">
                {
                  section.label
                }
              </p>

              <div className="space-y-1">
                {section.items.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    const active =
                      isActive(
                        item.href
                      );

                    return (
                      <Link
                        key={
                          item.href
                        }
                        href={
                          item.href
                        }
                        onClick={() =>
                          setMobileMenuOpen(
                            false
                          )
                        }
                        className={`group flex h-10 items-center gap-3 rounded-xl px-3 text-[11px] font-medium transition ${
                          active
                            ? "bg-[#343a44] text-white"
                            : "text-[#9ba3af] hover:bg-[#2b3038] hover:text-white"
                        }`}
                      >
                        <Icon
                          size={15}
                          strokeWidth={
                            1.8
                          }
                          className={
                            active
                              ? "text-[#aaa5ff]"
                              : "text-[#737c89] group-hover:text-[#aaa5ff]"
                          }
                        />

                        <span className="min-w-0 flex-1 truncate">
                          {
                            item.label
                          }
                        </span>

                        {active && (
                          <ChevronRight
                            size={12}
                            className="text-[#7770ff]"
                          />
                        )}
                      </Link>
                    );
                  }
                )}
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  /* =======================================================
     SIDEBAR
  ======================================================= */

  function SidebarContent() {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-[68px] items-center border-b border-[#343a44] px-4">
          <Link
            href={
              getHomeRoute()
            }
            onClick={() =>
              setMobileMenuOpen(
                false
              )
            }
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#635bff] text-xs font-bold text-white shadow-lg shadow-[#635bff]/20">
              L
            </div>

            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">
                Linko HUB
              </p>

              <p className="mt-0.5 truncate text-[9px] text-[#727b89]">
                {profile?.role ===
                "client"
                  ? "Portal do cliente"
                  : "Gestão inteligente"}
              </p>
            </div>
          </Link>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          {loadingProfile ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2
                size={17}
                className="animate-spin text-[#777f8d]"
              />
            </div>
          ) : profile?.role ===
            "client" ? (
            <ClientMenu />
          ) : (
            <InternalMenu />
          )}
        </nav>

        {!loadingProfile &&
          profile && (
            <div className="border-t border-[#343a44] p-3">
              <button
                type="button"
                onClick={() => {
                  if (
                    profile.role ===
                    "client"
                  ) {
                    router.push(
                      "/portal/perfil"
                    );

                    setMobileMenuOpen(
                      false
                    );
                  }
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition ${
                  profile.role ===
                  "client"
                    ? "hover:bg-[#2b3038]"
                    : ""
                }`}
              >
                <Avatar />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[9px] font-semibold text-white">
                    {profile.name ||
                      "Usuário"}
                  </p>

                  <p className="mt-0.5 truncate text-[7.5px] text-[#727b88]">
                    {
                      profileLabel
                    }
                  </p>
                </div>
              </button>
            </div>
          )}
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#1f232a] text-white">
      {/* SIDEBAR DESKTOP */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[214px] border-r border-[#343a44] bg-[#23272f] lg:block">
        <SidebarContent />
      </aside>

      {/* SIDEBAR MOBILE */}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() =>
              setMobileMenuOpen(
                false
              )
            }
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <aside className="relative h-full w-[280px] border-r border-[#343a44] bg-[#23272f] shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(
                  false
                )
              }
              className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#9da5b1]"
            >
              <X
                size={16}
              />
            </button>

            <SidebarContent />
          </aside>
        </div>
      )}

      {/* CONTEÚDO */}

      <div className="min-h-screen lg:pl-[214px]">
        {/* HEADER */}

        <header
          className={`sticky top-0 z-40 border-b border-[#343a44] bg-[#23272f]/95 backdrop-blur-xl ${
            compactHeader
              ? "h-[56px]"
              : ""
          }`}
        >
          <div
            className={`flex items-center gap-3 px-4 sm:px-5 ${
              compactHeader
                ? "h-[56px]"
                : "min-h-[76px]"
            }`}
          >
            {/* MOBILE */}

            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(
                  true
                )
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb] lg:hidden"
            >
              <Menu
                size={17}
              />
            </button>

            {/* HEADER NORMAL */}

            {!compactHeader && (
              <div className="min-w-0 flex-1">
                {eyebrow && (
                  <p className="mb-1 text-[8px] font-semibold uppercase tracking-[0.19em] text-[#7d76ff]">
                    {
                      eyebrow
                    }
                  </p>
                )}

                {title && (
                  <h1 className="truncate text-lg font-semibold tracking-[-0.025em] text-white sm:text-xl">
                    {
                      title
                    }
                  </h1>
                )}

                {description && (
                  <p className="mt-1 hidden truncate text-[10px] text-[#828b98] sm:block">
                    {
                      description
                    }
                  </p>
                )}
              </div>
            )}

            {compactHeader && (
              <div className="flex-1" />
            )}

            {actions && (
              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                {
                  actions
                }
              </div>
            )}

            {/* NOTIFICAÇÕES */}

            <div
              ref={
                notificationRef
              }
              className="relative"
            >
              <button
                type="button"
                onClick={() => {
                  setNotificationOpen(
                    (current) =>
                      !current
                  );

                  setProfileOpen(
                    false
                  );
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#3b424d] bg-[#292e36] text-[#9ba3af] transition hover:bg-[#343a44] hover:text-white"
              >
                <Bell
                  size={15}
                />

                {unreadCount >
                  0 && (
                  <span className="absolute right-[7px] top-[6px] h-2 w-2 rounded-full border-2 border-[#292e36] bg-[#f0a44b]" />
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-[120] w-[calc(100vw-32px)] max-w-[340px] overflow-hidden rounded-[18px] border border-[#3b424d] bg-[#252a32] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between border-b border-[#343a44] px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Notificações
                      </p>

                      <p className="mt-0.5 text-[9px] text-[#737c89]">
                        {
                          unreadCount
                        }{" "}
                        nova
                        {unreadCount ===
                        1
                          ? ""
                          : "s"}
                      </p>
                    </div>

                    {unreadCount >
                      0 && (
                      <button
                        type="button"
                        onClick={
                          markAllAsRead
                        }
                        className="flex items-center gap-1.5 text-[9px] font-semibold text-[#9ba1ff] hover:text-white"
                      >
                        <CheckCheck
                          size={13}
                        />

                        Marcar lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.map(
                      (item) => (
                        <button
                          key={
                            item.id
                          }
                          type="button"
                          onClick={() =>
                            openNotification(
                              item
                            )
                          }
                          className={`flex w-full gap-3 border-b border-[#343a44] px-4 py-4 text-left transition last:border-0 hover:bg-[#2c3139] ${
                            !item.read
                              ? "bg-[#292e36]"
                              : ""
                          }`}
                        >
                          <span
                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                              item.type ===
                              "purple"
                                ? "bg-[#635bff]"
                                : item.type ===
                                  "green"
                                ? "bg-[#2ac97d]"
                                : item.type ===
                                  "red"
                                ? "bg-[#ff6b6b]"
                                : "bg-[#f0a44b]"
                            }`}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-white">
                              {
                                item.title
                              }
                            </p>

                            <p className="mt-1 text-[9px] leading-4 text-[#838b98]">
                              {
                                item.description
                              }
                            </p>

                            <p className="mt-2 text-[8px] text-[#626b78]">
                              há{" "}
                              {
                                item.time
                              }
                            </p>
                          </div>

                          {!item.read && (
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#635bff]" />
                          )}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PERFIL */}

            <div
              ref={
                profileRef
              }
              className="relative"
            >
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(
                    (current) =>
                      !current
                  );

                  setNotificationOpen(
                    false
                  );
                }}
                className="flex h-9 items-center gap-2 rounded-xl px-1.5 transition hover:bg-[#292e36]"
              >
                <Avatar />

                <div className="hidden min-w-0 text-left xl:block">
                  <p className="max-w-[130px] truncate text-[10px] font-semibold text-white">
                    {profile?.name ||
                      "Usuário"}
                  </p>

                  <p className="mt-0.5 max-w-[130px] truncate text-[8px] text-[#727b88]">
                    {
                      profileLabel
                    }
                  </p>
                </div>

                <ChevronDown
                  size={13}
                  className="hidden text-[#737c89] xl:block"
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-[120] w-[240px] overflow-hidden rounded-[16px] border border-[#3b424d] bg-[#252a32] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
                  <div className="border-b border-[#343a44] p-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        size="large"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">
                          {profile?.name ||
                            "Usuário"}
                        </p>

                        <p className="mt-1 truncate text-[8px] text-[#737c89]">
                          {
                            profile?.email
                          }
                        </p>
                      </div>
                    </div>

                    <span className="mt-3 inline-flex rounded-full bg-[#302f48] px-2.5 py-1 text-[8px] font-semibold text-[#aaa5ff]">
                      {
                        profileLabel
                      }
                    </span>
                  </div>

                  {profile?.role ===
                    "client" && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(
                          false
                        );

                        router.push(
                          "/portal/perfil"
                        );
                      }}
                      className="flex w-full items-center gap-3 border-b border-[#343a44] px-4 py-3 text-left text-[10px] font-medium text-[#b6bdc7] transition hover:bg-[#2c3139] hover:text-white"
                    >
                      <CircleUserRound
                        size={14}
                      />

                      Meu perfil
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    disabled={
                      loggingOut
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[10px] font-medium text-[#b6bdc7] transition hover:bg-[#2c3139] hover:text-white"
                  >
                    {loggingOut ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <LogOut
                        size={14}
                      />
                    )}

                    Sair do sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN */}

        <main
          className={`min-w-0 ${
            compactHeader
              ? "p-3 sm:p-4 lg:p-5"
              : "p-4 sm:p-5 lg:p-6"
          }`}
        >
          {
            children
          }
        </main>
      </div>
    </div>
  );
}