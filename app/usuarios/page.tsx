"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/client";

/* =========================================================
   TIPOS
========================================================= */

type Role =
  | "admin"
  | "team"
  | "client";

type Permissions = {
  dashboard: boolean;
  finance: boolean;
  reports: boolean;
  marketing: boolean;
  users: boolean;
  client_management: boolean;
};

type SystemUser = {
  id: string;

  name:
    | string
    | null;

  email:
    | string
    | null;

  role: Role;

  active: boolean;

  job_title:
    | string
    | null;

  avatar_url:
    | string
    | null;

  permissions:
    Permissions;

  created_at:
    string;

  client_id:
    string | null;
};

type Client = {
  id: string;

  name: string;

  trade_name:
    | string
    | null;

  status:
    | "active"
    | "inactive";
};

type UserForm = {
  name: string;

  email: string;

  password: string;

  job_title: string;

  role: Role;

  client_id: string;

  permissions:
    Permissions;
};

type ConfirmState =
  | {
      type:
        "status";

      user:
        SystemUser;
    }
  | {
      type:
        "delete";

      ids:
        string[];

      label: string;
    }
  | null;

/* =========================================================
   CONSTANTES
========================================================= */

const ITEMS_PER_PAGE =
  10;

const ADMIN_PERMISSIONS: Permissions =
  {
    dashboard: true,
    finance: true,
    reports: true,
    marketing: true,
    users: true,
    client_management:
      true,
  };

const TEAM_PERMISSIONS: Permissions =
  {
    dashboard: true,
    finance: false,
    reports: false,
    marketing: true,
    users: false,
    client_management:
      false,
  };

const CLIENT_PERMISSIONS: Permissions =
  {
    dashboard: false,
    finance: false,
    reports: false,
    marketing: true,
    users: false,
    client_management:
      false,
  };

const EMPTY_FORM: UserForm =
  {
    name: "",
    email: "",
    password: "",

    job_title: "",

    role: "team",

    client_id: "",

    permissions: {
      ...TEAM_PERMISSIONS,
    },
  };

/* =========================================================
   PAGE
========================================================= */

export default function UsuariosPage() {
  const supabase =
    createClient();

  const [
    users,
    setUsers,
  ] =
    useState<
      SystemUser[]
    >([]);

  const [
    clients,
    setClients,
  ] =
    useState<
      Client[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    processing,
    setProcessing,
  ] =
    useState(
      false
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      ""
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const [
    roleFilter,
    setRoleFilter,
  ] =
    useState(
      "all"
    );

  const [
    page,
    setPage,
  ] =
    useState(
      1
    );

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<
      string[]
    >([]);

  const [
    showForm,
    setShowForm,
  ] =
    useState(
      false
    );

  const [
    editingUser,
    setEditingUser,
  ] =
    useState<
      SystemUser | null
    >(
      null
    );

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(
      false
    );

  const [
    confirmState,
    setConfirmState,
  ] =
    useState<
      ConfirmState
    >(
      null
    );

  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState(
      ""
    );

  const [
    form,
    setForm,
  ] =
    useState<UserForm>(
      {
        ...EMPTY_FORM,
      }
    );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);

    setSelectedIds(
      []
    );
  }, [
    search,
    roleFilter,
  ]);

  /* =======================================================
     TOKEN / FETCH
  ======================================================= */

  async function getAccessToken() {
    const {
      data,
      error,
    } =
      await supabase.auth.getSession();

    if (error) {
      console.error(
        error
      );

      return null;
    }

    return (
      data.session
        ?.access_token ||
      null
    );
  }

  async function apiFetch(
    url: string,
    options:
      RequestInit = {}
  ) {
    const token =
      await getAccessToken();

    if (!token) {
      throw new Error(
        "Sua sessão expirou. Faça login novamente."
      );
    }

    const response =
      await fetch(
        url,
        {
          ...options,

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,

            ...(options.headers ||
              {}),
          },

          cache:
            "no-store",
        }
      );

    const data =
      await response.json();

    if (
      !response.ok
    ) {
      throw new Error(
        data.error ||
          "Ocorreu um erro."
      );
    }

    return data;
  }

  /* =======================================================
     LOAD
  ======================================================= */

  async function loadData() {
    setLoading(
      true
    );

    try {
      const {
        data:
          authData,
      } =
        await supabase.auth.getUser();

      setCurrentUserId(
        authData.user
          ?.id || ""
      );

      const [
        usersData,
        clientsResult,
      ] =
        await Promise.all([
          apiFetch(
            "/api/usuarios"
          ),

          supabase
            .from(
              "clients"
            )
            .select(
              "id, name, trade_name, status"
            )
            .eq(
              "status",
              "active"
            )
            .order(
              "name"
            ),
        ]);

      if (
        clientsResult.error
      ) {
        console.error(
          clientsResult.error
        );
      }

      setUsers(
        usersData.users ||
          []
      );

      setClients(
        clientsResult.data ||
          []
      );
    } catch (
      error
    ) {
      console.error(
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Não foi possível carregar usuários."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  function roleLabel(
    role: Role
  ) {
    if (
      role ===
      "admin"
    ) {
      return "Admin";
    }

    if (
      role ===
      "team"
    ) {
      return "Equipe";
    }

    return "Cliente";
  }

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "pt-BR"
    ).format(
      new Date(value)
    );
  }

  function applyRole(
    role: Role
  ) {
    let permissions:
      Permissions =
        TEAM_PERMISSIONS;

    if (
      role ===
      "admin"
    ) {
      permissions =
        ADMIN_PERMISSIONS;
    }

    if (
      role ===
      "client"
    ) {
      permissions =
        CLIENT_PERMISSIONS;
    }

    setForm(
      (
        current
      ) => ({
        ...current,

        role,

        client_id:
          role ===
          "client"
            ? current.client_id
            : "",

        permissions: {
          ...permissions,
        },
      })
    );
  }

  function updatePermission(
    permission:
      keyof Permissions
  ) {
    /*
     * ADMIN sempre tudo.
     * CLIENTE permissões fixas.
     */
    if (
      form.role ===
        "admin" ||
      form.role ===
        "client"
    ) {
      return;
    }

    setForm(
      (
        current
      ) => ({
        ...current,

        permissions: {
          ...current.permissions,

          [permission]:
            !current
              .permissions[
              permission
            ],
        },
      })
    );
  }

  /* =======================================================
     MODAL CADASTRO
  ======================================================= */

  function openNewUser() {
    setEditingUser(
      null
    );

    setForm({
      ...EMPTY_FORM,

      permissions: {
        ...TEAM_PERMISSIONS,
      },
    });

    setShowPassword(
      false
    );

    setMessage(
      ""
    );

    setShowForm(
      true
    );
  }

  function openEditUser(
    user:
      SystemUser
  ) {
    setEditingUser(
      user
    );

    let permissions =
      user.permissions;

    if (
      !permissions
    ) {
      if (
        user.role ===
        "admin"
      ) {
        permissions =
          ADMIN_PERMISSIONS;
      } else if (
        user.role ===
        "client"
      ) {
        permissions =
          CLIENT_PERMISSIONS;
      } else {
        permissions =
          TEAM_PERMISSIONS;
      }
    }

    setForm({
      name:
        user.name ||
        "",

      email:
        user.email ||
        "",

      password:
        "",

      job_title:
        user.job_title ||
        "",

      role:
        user.role,

      client_id:
        user.client_id ||
        "",

      permissions: {
        ...permissions,
      },
    });

    setShowPassword(
      false
    );

    setMessage(
      ""
    );

    setShowForm(
      true
    );
  }

  /* =======================================================
     SALVAR
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent
  ) {
    event.preventDefault();

    if (
      !form.name.trim()
    ) {
      setMessage(
        "Informe o nome do usuário."
      );

      return;
    }

    if (
      !form.email.trim()
    ) {
      setMessage(
        "Informe o e-mail."
      );

      return;
    }

    if (
      !editingUser &&
      form.password.length <
        6
    ) {
      setMessage(
        "Informe uma senha inicial com pelo menos 6 caracteres."
      );

      return;
    }

    if (
      editingUser &&
      form.password &&
      form.password.length <
        6
    ) {
      setMessage(
        "A nova senha precisa ter pelo menos 6 caracteres."
      );

      return;
    }

    if (
      form.role ===
        "client" &&
      !form.client_id
    ) {
      setMessage(
        "Selecione o cliente vinculado."
      );

      return;
    }

    setSaving(
      true
    );

    setMessage(
      ""
    );

    try {
      await apiFetch(
        "/api/usuarios",
        {
          method:
            editingUser
              ? "PUT"
              : "POST",

          body:
            JSON.stringify(
              {
                id:
                  editingUser
                    ?.id,

                ...form,
              }
            ),
        }
      );

      setShowForm(
        false
      );

      setMessage(
        editingUser
          ? "Usuário atualizado com sucesso."
          : "Usuário criado com sucesso."
      );

      await loadData();
    } catch (
      error
    ) {
      console.error(
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Não foi possível salvar o usuário."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =======================================================
     ATIVAR / INATIVAR
  ======================================================= */

  function askToggleStatus(
    user:
      SystemUser
  ) {
    setConfirmState({
      type:
        "status",

      user,
    });
  }

  async function confirmToggleStatus() {
    if (
      !confirmState ||
      confirmState.type !==
        "status"
    ) {
      return;
    }

    const user =
      confirmState.user;

    setProcessing(
      true
    );

    try {
      await apiFetch(
        "/api/usuarios",
        {
          method:
            "PATCH",

          body:
            JSON.stringify(
              {
                id:
                  user.id,

                active:
                  !user.active,
              }
            ),
        }
      );

      setMessage(
        user.active
          ? "Usuário inativado com sucesso."
          : "Usuário reativado com sucesso."
      );

      setConfirmState(
        null
      );

      await loadData();
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "Não foi possível alterar o status."
      );
    } finally {
      setProcessing(
        false
      );
    }
  }

  /* =======================================================
     EXCLUSÃO
  ======================================================= */

  function askDeleteUser(
    user:
      SystemUser
  ) {
    setConfirmState({
      type:
        "delete",

      ids: [
        user.id,
      ],

      label:
        user.name ||
        user.email ||
        "este usuário",
    });
  }

  function askDeleteSelected() {
    if (
      selectedIds.length ===
      0
    ) {
      return;
    }

    setConfirmState({
      type:
        "delete",

      ids:
        selectedIds,

      label:
        `${selectedIds.length} usuário${
          selectedIds.length ===
          1
            ? ""
            : "s"
        } selecionado${
          selectedIds.length ===
          1
            ? ""
            : "s"
        }`,
    });
  }

  async function confirmDelete() {
    if (
      !confirmState ||
      confirmState.type !==
        "delete"
    ) {
      return;
    }

    setProcessing(
      true
    );

    try {
      const count =
        confirmState.ids
          .length;

      await apiFetch(
        "/api/usuarios",
        {
          method:
            "DELETE",

          body:
            JSON.stringify(
              {
                ids:
                  confirmState.ids,
              }
            ),
        }
      );

      setMessage(
        count === 1
          ? "Usuário excluído com sucesso."
          : `${count} usuários excluídos com sucesso.`
      );

      setSelectedIds(
        []
      );

      setConfirmState(
        null
      );

      await loadData();
    } catch (
      error
    ) {
      setMessage(
        error instanceof
          Error
          ? error.message
          : "Não foi possível excluir."
      );
    } finally {
      setProcessing(
        false
      );
    }
  }

  /* =======================================================
     FILTROS
  ======================================================= */

  const filteredUsers =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return users.filter(
        (user) => {
          const matchesSearch =
            !term ||
            user.name
              ?.toLowerCase()
              .includes(
                term
              ) ||
            user.email
              ?.toLowerCase()
              .includes(
                term
              ) ||
            user.job_title
              ?.toLowerCase()
              .includes(
                term
              );

          const matchesRole =
            roleFilter ===
              "all" ||
            user.role ===
              roleFilter;

          return (
            matchesSearch &&
            matchesRole
          );
        }
      );
    }, [
      users,
      search,
      roleFilter,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredUsers.length /
          ITEMS_PER_PAGE
      )
    );

  const safePage =
    Math.min(
      page,
      totalPages
    );

  const paginatedUsers =
    filteredUsers.slice(
      (safePage -
        1) *
        ITEMS_PER_PAGE,

      safePage *
        ITEMS_PER_PAGE
    );

  /* =======================================================
     CHECKBOX
  ======================================================= */

  const selectablePageIds =
    paginatedUsers
      .filter(
        (user) =>
          user.id !==
          currentUserId
      )
      .map(
        (user) =>
          user.id
      );

  const allPageSelected =
    selectablePageIds.length >
      0 &&
    selectablePageIds.every(
      (id) =>
        selectedIds.includes(
          id
        )
    );

  function toggleUserSelection(
    id: string
  ) {
    if (
      id ===
      currentUserId
    ) {
      return;
    }

    setSelectedIds(
      (
        current
      ) =>
        current.includes(
          id
        )
          ? current.filter(
              (
                item
              ) =>
                item !==
                id
            )
          : [
              ...current,
              id,
            ]
    );
  }

  function toggleSelectPage() {
    if (
      allPageSelected
    ) {
      setSelectedIds(
        (
          current
        ) =>
          current.filter(
            (id) =>
              !selectablePageIds.includes(
                id
              )
          )
      );

      return;
    }

    setSelectedIds(
      (
        current
      ) =>
        Array.from(
          new Set([
            ...current,

            ...selectablePageIds,
          ])
        )
    );
  }

  /* =======================================================
     CONTADORES
  ======================================================= */

  const activeCount =
    users.filter(
      (user) =>
        user.active
    ).length;

  const teamCount =
    users.filter(
      (user) =>
        user.role ===
          "team" &&
        user.active
    ).length;

  const clientCount =
    users.filter(
      (user) =>
        user.role ===
          "client" &&
        user.active
    ).length;

  return (
    <AppShell
      eyebrow="Administração"
      title="Usuários"
      description="Gerencie equipe, clientes e permissões de acesso ao Linko HUB."
      actions={
        <button
          type="button"
          onClick={
            openNewUser
          }
          className="inline-flex items-center gap-2 rounded-xl bg-[#635bff] px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-[#635bff]/10 transition hover:bg-[#716aff]"
        >
          <Plus
            size={16}
          />

          Novo usuário
        </button>
      }
    >
      {/* MENSAGEM */}

      {message && (
        <div className="mb-5 rounded-xl border border-[#424958] bg-[#292e36] px-4 py-3 text-xs text-[#c5cad3]">
          {message}
        </div>
      )}

      {/* CARDS */}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Usuários ativos"
          value={
            activeCount
          }
          icon={
            <UsersRound
              size={18}
            />
          }
        />

        <SummaryCard
          label="Equipe"
          value={
            teamCount
          }
          icon={
            <ShieldCheck
              size={18}
            />
          }
        />

        <SummaryCard
          label="Clientes com acesso"
          value={
            clientCount
          }
          icon={
            <UserRound
              size={18}
            />
          }
        />
      </div>

      {/* BARRA */}

      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747c89]"
          />

          <input
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }
            placeholder="Buscar usuário..."
            className="h-11 w-full rounded-xl border border-[#3d444f] bg-[#292e36] pl-10 pr-4 text-xs text-white outline-none placeholder:text-[#6f7682] focus:border-[#635bff]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedIds.length >
            0 && (
            <button
              type="button"
              onClick={
                askDeleteSelected
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#683838] bg-[#392426] px-4 text-xs font-semibold text-[#ff9292] transition hover:bg-[#47292b]"
            >
              <Trash2
                size={15}
              />

              Excluir selecionados

              <span className="rounded-full bg-[#512e31] px-2 py-0.5 text-[9px]">
                {
                  selectedIds.length
                }
              </span>
            </button>
          )}

          <select
            value={
              roleFilter
            }
            onChange={(
              event
            ) =>
              setRoleFilter(
                event.target
                  .value
              )
            }
            className="h-11 rounded-xl border border-[#3d444f] bg-[#292e36] px-4 text-xs text-[#c5cad3] outline-none focus:border-[#635bff]"
          >
            <option value="all">
              Todos os perfis
            </option>

            <option value="admin">
              Admin
            </option>

            <option value="team">
              Equipe
            </option>

            <option value="client">
              Cliente
            </option>
          </select>
        </div>
      </div>

      {/* TABELA */}

      <section className="mt-5 overflow-hidden rounded-[22px] border border-[#363c46] bg-[#292e36]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-[#23272f] text-left">
                <th className="w-[58px] px-5 py-4">
                  <Checkbox
                    checked={
                      allPageSelected
                    }
                    onChange={
                      toggleSelectPage
                    }
                  />
                </th>

                <TableHead>
                  Usuário
                </TableHead>

                <TableHead>
                  Cargo
                </TableHead>

                <TableHead>
                  Perfil
                </TableHead>

                <TableHead>
                  Status
                </TableHead>

                <TableHead>
                  Criado em
                </TableHead>

                <TableHead align="right">
                  Ações
                </TableHead>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={
                      7
                    }
                    className="px-6 py-16 text-center"
                  >
                    <Loader2
                      size={20}
                      className="mx-auto animate-spin text-[#8f96a3]"
                    />
                  </td>
                </tr>
              ) : paginatedUsers.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={
                      7
                    }
                    className="px-6 py-16 text-center text-xs text-[#8f96a3]"
                  >
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(
                  (
                    user
                  ) => {
                    const isOwnUser =
                      user.id ===
                      currentUserId;

                    const selected =
                      selectedIds.includes(
                        user.id
                      );

                    return (
                      <tr
                        key={
                          user.id
                        }
                        className={`border-t border-[#363c46] transition ${
                          selected
                            ? "bg-[#635bff]/[0.055]"
                            : "hover:bg-[#2d323a]"
                        }`}
                      >
                        <td className="px-5 py-4">
                          <Checkbox
                            checked={
                              selected
                            }
                            disabled={
                              isOwnUser
                            }
                            onChange={() =>
                              toggleUserSelection(
                                user.id
                              )
                            }
                          />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#37394f] to-[#302f48] text-sm font-semibold text-[#aaa5ff]">
                              {(
                                user.name ||
                                user.email ||
                                "U"
                              )
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-white">
                                  {user.name ||
                                    "Sem nome"}
                                </p>

                                {isOwnUser && (
                                  <span className="rounded-full bg-[#343a44] px-2 py-0.5 text-[8px] font-semibold text-[#9ca3af]">
                                    Você
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 truncate text-[10px] text-[#7d8592]">
                                {
                                  user.email
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-xs text-[#a0a7b3]">
                          {user.job_title ||
                            "—"}
                        </td>

                        <td className="px-6 py-4">
                          <RoleBadge
                            role={
                              user.role
                            }
                            label={roleLabel(
                              user.role
                            )}
                          />
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge
                            active={
                              user.active
                            }
                          />
                        </td>

                        <td className="px-6 py-4 text-xs text-[#a0a7b3]">
                          {formatDate(
                            user.created_at
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* EDITAR */}

                            <ActionButton
                              tooltip="Editar usuário"
                              onClick={() =>
                                openEditUser(
                                  user
                                )
                              }
                            >
                              <Pencil
                                size={14}
                              />
                            </ActionButton>

                            {/* STATUS */}

                            <ActionButton
                              tooltip={
                                user.active
                                  ? "Inativar usuário"
                                  : "Reativar usuário"
                              }
                              disabled={
                                isOwnUser
                              }
                              variant={
                                user.active
                                  ? "success"
                                  : "muted"
                              }
                              onClick={() =>
                                askToggleStatus(
                                  user
                                )
                              }
                            >
                              {user.active ? (
                                <Eye
                                  size={15}
                                />
                              ) : (
                                <EyeOff
                                  size={15}
                                />
                              )}
                            </ActionButton>

                            {/* EXCLUIR */}

                            <ActionButton
                              tooltip="Excluir usuário"
                              variant="danger"
                              disabled={
                                isOwnUser
                              }
                              onClick={() =>
                                askDeleteUser(
                                  user
                                )
                              }
                            >
                              <Trash2
                                size={14}
                              />
                            </ActionButton>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={
            safePage
          }
          totalPages={
            totalPages
          }
          totalItems={
            filteredUsers.length
          }
          onPrevious={() =>
            setPage(
              (
                current
              ) =>
                Math.max(
                  1,
                  current -
                    1
                )
            )
          }
          onNext={() =>
            setPage(
              (
                current
              ) =>
                Math.min(
                  totalPages,
                  current +
                    1
                )
            )
          }
        />
      </section>

      {/* =================================================
          MODAL CADASTRO
      ================================================= */}

      {showForm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-[#363c46] bg-[#252a32] shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between border-b border-[#363c46] px-5 py-5 sm:px-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7c74ff]">
                  Administração
                </p>

                <h2 className="mt-1 text-xl font-semibold text-white">
                  {editingUser
                    ? "Editar usuário"
                    : "Novo usuário"}
                </h2>

                <p className="mt-1 text-xs text-[#8f96a3]">
                  {editingUser
                    ? "Atualize os dados e permissões."
                    : "Novos usuários são criados automaticamente como ativos."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    false
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb] transition hover:bg-[#343a44] hover:text-white"
              >
                <X
                  size={17}
                />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="min-h-0 flex-1 overflow-y-auto"
            >
              <div className="space-y-7 p-5 sm:p-7">
                {/* DADOS */}

                <FormSection
                  title="Dados do usuário"
                  description="Informações utilizadas para identificação e login."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField
                      label="Nome *"
                      value={
                        form.name
                      }
                      onChange={(
                        value
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            name:
                              value,
                          })
                        )
                      }
                      placeholder="Nome completo"
                    />

                    <InputField
                      label="Cargo / Função"
                      value={
                        form.job_title
                      }
                      onChange={(
                        value
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            job_title:
                              value,
                          })
                        )
                      }
                      placeholder="Ex.: Social Media, Designer..."
                    />

                    <InputField
                      label="E-mail *"
                      type="email"
                      value={
                        form.email
                      }
                      onChange={(
                        value
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,

                            email:
                              value,
                          })
                        )
                      }
                      placeholder="usuario@empresa.com"
                    />

                    <div>
                      <label className="mb-2 block text-[11px] font-medium text-[#b6bcc6]">
                        {editingUser
                          ? "Nova senha"
                          : "Senha inicial *"}
                      </label>

                      <div className="relative">
                        <input
                          type={
                            showPassword
                              ? "text"
                              : "password"
                          }
                          value={
                            form.password
                          }
                          onChange={(
                            event
                          ) =>
                            setForm(
                              (
                                current
                              ) => ({
                                ...current,

                                password:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          placeholder={
                            editingUser
                              ? "Deixe vazio para manter a atual"
                              : "Mínimo 6 caracteres"
                          }
                          className="h-11 w-full rounded-xl border border-[#3d444f] bg-[#23272f] px-3.5 pr-11 text-xs text-white outline-none placeholder:text-[#606874] focus:border-[#635bff]"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword(
                              (
                                current
                              ) =>
                                !current
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c8491] transition hover:text-white"
                        >
                          {showPassword ? (
                            <EyeOff
                              size={15}
                            />
                          ) : (
                            <Eye
                              size={15}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </FormSection>

                {/* PERFIL */}

                <FormSection
                  title="Perfil de acesso"
                  description="Escolha como esse usuário utilizará o Linko HUB."
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <RoleCard
                      active={
                        form.role ===
                        "admin"
                      }
                      title="Admin"
                      description="Acesso completo ao sistema."
                      onClick={() =>
                        applyRole(
                          "admin"
                        )
                      }
                    />

                    <RoleCard
                      active={
                        form.role ===
                        "team"
                      }
                      title="Equipe"
                      description="Acesso operacional ao Marketing."
                      onClick={() =>
                        applyRole(
                          "team"
                        )
                      }
                    />

                    <RoleCard
                      active={
                        form.role ===
                        "client"
                      }
                      title="Cliente"
                      description="Visualiza somente o próprio ambiente."
                      onClick={() =>
                        applyRole(
                          "client"
                        )
                      }
                    />
                  </div>

                  {form.role ===
                    "client" && (
                    <div className="mt-5">
                      <SelectField
                        label="Cliente vinculado *"
                        value={
                          form.client_id
                        }
                        onChange={(
                          value
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,

                              client_id:
                                value,
                            })
                          )
                        }
                        options={[
                          {
                            value:
                              "",

                            label:
                              "Selecione o cliente",
                          },

                          ...clients.map(
                            (
                              client
                            ) => ({
                              value:
                                client.id,

                              label:
                                client.trade_name ||
                                client.name,
                            })
                          ),
                        ]}
                      />
                    </div>
                  )}
                </FormSection>

                {/* PERMISSÕES */}

                <FormSection
                  title="Permissões"
                  description={
                    form.role ===
                    "admin"
                      ? "Administradores possuem acesso completo."
                      : form.role ===
                        "client"
                      ? "Clientes acessam somente os próprios conteúdos."
                      : "Escolha quais áreas a equipe poderá utilizar."
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PermissionRow
                      label="Dashboard"
                      description="Visão inicial do sistema"
                      checked={
                        form.permissions
                          .dashboard
                      }
                      disabled={
                        form.role !==
                        "team"
                      }
                      onClick={() =>
                        updatePermission(
                          "dashboard"
                        )
                      }
                    />

                    <PermissionRow
                      label="Marketing"
                      description="Produção de conteúdo e Kanban"
                      checked={
                        form.permissions
                          .marketing
                      }
                      disabled={
                        form.role !==
                        "team"
                      }
                      onClick={() =>
                        updatePermission(
                          "marketing"
                        )
                      }
                    />

                    <PermissionRow
                      label="Financeiro"
                      description="Contas a pagar e indicadores"
                      checked={
                        form.permissions
                          .finance
                      }
                      disabled={
                        form.role !==
                        "team"
                      }
                      onClick={() =>
                        updatePermission(
                          "finance"
                        )
                      }
                    />

                    <PermissionRow
                      label="Relatórios"
                      description="Relatórios financeiros"
                      checked={
                        form.permissions
                          .reports
                      }
                      disabled={
                        form.role !==
                        "team"
                      }
                      onClick={() =>
                        updatePermission(
                          "reports"
                        )
                      }
                    />

                    <PermissionRow
                      label="Usuários"
                      description="Gerenciamento de acessos"
                      checked={
                        form.permissions
                          .users
                      }
                      disabled={
                        form.role !==
                        "team"
                      }
                      onClick={() =>
                        updatePermission(
                          "users"
                        )
                      }
                    />

                    <PermissionRow
                      label="Cadastro de clientes"
                      description="Cadastro, contrato e informações financeiras"
                      checked={
                        form.permissions
                          .client_management
                      }
                      disabled={
                        form.role !==
                        "team"
                      }
                      onClick={() =>
                        updatePermission(
                          "client_management"
                        )
                      }
                    />
                  </div>

                  {form.role ===
                    "team" && (
                    <div className="mt-4 rounded-xl border border-[#3d444f] bg-[#23272f] px-4 py-3">
                      <p className="text-[10px] leading-5 text-[#8f96a3]">
                        A equipe pode selecionar clientes dentro do Marketing sem acessar automaticamente valores de contrato ou informações financeiras.
                      </p>
                    </div>
                  )}
                </FormSection>
              </div>

              {/* FOOTER */}

              <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-[#363c46] bg-[#23272f] px-5 py-4 sm:px-7">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(
                      false
                    )
                  }
                  className="h-11 rounded-xl border border-[#3d444f] bg-[#292e36] px-5 text-xs font-semibold text-[#c5cad3] transition hover:bg-[#343a44]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#635bff] px-5 text-xs font-semibold text-white transition hover:bg-[#716aff] disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <Check
                      size={15}
                    />
                  )}

                  {saving
                    ? "Salvando..."
                    : editingUser
                    ? "Salvar alterações"
                    : "Criar usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          CONFIRMAÇÃO
      ================================================= */}

      {confirmState && (
        <ConfirmModal
          loading={
            processing
          }
          title={
            confirmState.type ===
            "status"
              ? confirmState
                  .user.active
                ? "Inativar usuário?"
                : "Reativar usuário?"
              : "Excluir usuário?"
          }
          description={
            confirmState.type ===
            "status"
              ? confirmState
                  .user.active
                ? `${confirmState.user.name || "Este usuário"} ficará sem acesso às áreas protegidas do Linko HUB.`
                : `${confirmState.user.name || "Este usuário"} voltará a ter acesso conforme suas permissões.`
              : `Deseja excluir ${confirmState.label}? Esta ação remove o acesso do usuário do sistema.`
          }
          confirmLabel={
            confirmState.type ===
            "status"
              ? confirmState
                  .user.active
                ? "Inativar"
                : "Reativar"
              : confirmState.ids
                  .length >
                1
              ? "Excluir usuários"
              : "Excluir"
          }
          danger={
            confirmState.type ===
              "delete" ||
            (confirmState.type ===
              "status" &&
              confirmState
                .user.active)
          }
          onCancel={() =>
            setConfirmState(
              null
            )
          }
          onConfirm={
            confirmState.type ===
            "status"
              ? confirmToggleStatus
              : confirmDelete
          }
        />
      )}
    </AppShell>
  );
}

/* =========================================================
   SUMMARY
========================================================= */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;

  value: number;

  icon:
    React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-[#363c46] bg-[#292e36] p-5 transition hover:border-[#464d59]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#8f96a3]">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#302f48] text-[#9ba1ff]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CHECKBOX
========================================================= */

function Checkbox({
  checked,
  disabled = false,
  onChange,
}: {
  checked: boolean;

  disabled?: boolean;

  onChange:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onChange
      }
      className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition ${
        checked
          ? "border-[#635bff] bg-[#635bff] text-white"
          : "border-[#555e6b] bg-[#23272f]"
      } ${
        disabled
          ? "cursor-not-allowed opacity-25"
          : "hover:border-[#7770ff]"
      }`}
    >
      {checked && (
        <Check
          size={11}
          strokeWidth={3}
        />
      )}
    </button>
  );
}

/* =========================================================
   ACTION BUTTON
========================================================= */

function ActionButton({
  children,
  onClick,
  tooltip,
  disabled = false,
  variant = "default",
}: {
  children:
    React.ReactNode;

  onClick: () => void;

  tooltip: string;

  disabled?:
    boolean;

  variant?:
    | "default"
    | "success"
    | "danger"
    | "muted";
}) {
  const styles = {
    default:
      "border-[#3d444f] bg-[#23272f] text-[#9aa2ae] hover:border-[#635bff] hover:text-white",

    success:
      "border-[#315545] bg-[#18352c] text-[#56d99b] hover:bg-[#204439]",

    danger:
      "border-[#603737] bg-[#352426] text-[#ff8d8d] hover:bg-[#47292b]",

    muted:
      "border-[#3d444f] bg-[#23272f] text-[#6f7682] hover:text-white",
  };

  return (
    <div className="group relative">
      <button
        type="button"
        disabled={
          disabled
        }
        onClick={
          onClick
        }
        aria-label={
          tooltip
        }
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          styles[
            variant
          ]
        } disabled:cursor-not-allowed disabled:opacity-25`}
      >
        {children}
      </button>

      {!disabled && (
        <div className="pointer-events-none absolute bottom-[calc(100%+7px)] right-0 z-30 whitespace-nowrap rounded-lg border border-[#414854] bg-[#1e2228] px-2.5 py-1.5 text-[9px] font-medium text-white opacity-0 shadow-xl transition group-hover:opacity-100">
          {tooltip}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CONFIRM MODAL
========================================================= */

function ConfirmModal({
  title,
  description,
  confirmLabel,
  loading,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;

  description:
    string;

  confirmLabel:
    string;

  loading:
    boolean;

  danger:
    boolean;

  onCancel:
    () => void;

  onConfirm:
    () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[22px] border border-[#3b424d] bg-[#282d35] shadow-2xl shadow-black/50">
        <div className="p-6">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              danger
                ? "bg-[#452629] text-[#ff8d8d]"
                : "bg-[#17382b] text-[#5ee0a3]"
            }`}
          >
            {danger ? (
              <Trash2
                size={18}
              />
            ) : (
              <Eye
                size={18}
              />
            )}
          </div>

          <h3 className="mt-5 text-lg font-semibold text-white">
            {title}
          </h3>

          <p className="mt-2 text-xs leading-5 text-[#8f96a3]">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#363c46] bg-[#23272f] px-5 py-4">
          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              onCancel
            }
            className="h-10 rounded-xl border border-[#3d444f] bg-[#292e36] px-4 text-xs font-semibold text-[#c5cad3]"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={
              loading
            }
            onClick={
              onConfirm
            }
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white disabled:opacity-50 ${
              danger
                ? "bg-[#c94c56] hover:bg-[#db5862]"
                : "bg-[#2aaf77] hover:bg-[#32bd83]"
            }`}
          >
            {loading && (
              <Loader2
                size={14}
                className="animate-spin"
              />
            )}

            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FORM SECTION
========================================================= */

function FormSection({
  title,
  description,
  children,
}: {
  title: string;

  description:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">
          {title}
        </h3>

        <p className="mt-1 text-[11px] text-[#747c89]">
          {description}
        </p>
      </div>

      <div className="rounded-[18px] border border-[#363c46] bg-[#292e36] p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   INPUT
========================================================= */

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;

  value: string;

  onChange: (
    value: string
  ) => void;

  type?: string;

  placeholder?:
    string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium text-[#b6bcc6]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .value
          )
        }
        placeholder={
          placeholder
        }
        className="h-11 w-full rounded-xl border border-[#3d444f] bg-[#23272f] px-3.5 text-xs text-white outline-none placeholder:text-[#606874] focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
      />
    </div>
  );
}

/* =========================================================
   SELECT
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;

  value: string;

  onChange: (
    value: string
  ) => void;

  options: {
    value: string;

    label: string;
  }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium text-[#b6bcc6]">
        {label}
      </label>

      <select
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .value
          )
        }
        className="h-11 w-full rounded-xl border border-[#3d444f] bg-[#23272f] px-3.5 text-xs text-white outline-none focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
      >
        {options.map(
          (
            option
          ) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {
                option.label
              }
            </option>
          )
        )}
      </select>
    </div>
  );
}

/* =========================================================
   ROLE CARD
========================================================= */

function RoleCard({
  active,
  title,
  description,
  onClick,
}: {
  active:
    boolean;

  title: string;

  description:
    string;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-[#635bff] bg-[#635bff]/10"
          : "border-[#3d444f] bg-[#23272f] hover:border-[#555e6b]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white">
          {title}
        </p>

        {active && (
          <Check
            size={14}
            className="text-[#9ba1ff]"
          />
        )}
      </div>

      <p className="mt-2 text-[10px] leading-4 text-[#747c89]">
        {description}
      </p>
    </button>
  );
}

/* =========================================================
   PERMISSION
========================================================= */

function PermissionRow({
  label,
  description,
  checked,
  disabled,
  onClick,
}: {
  label: string;

  description:
    string;

  checked:
    boolean;

  disabled:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      disabled={
        disabled
      }
      onClick={
        onClick
      }
      className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${
        checked
          ? "border-[#4b4778] bg-[#302f48]"
          : "border-[#3d444f] bg-[#23272f]"
      } ${
        disabled
          ? "cursor-default"
          : "hover:border-[#555e6b]"
      }`}
    >
      <div>
        <p className="text-xs font-medium text-white">
          {label}
        </p>

        <p className="mt-1 text-[9px] text-[#747c89]">
          {description}
        </p>
      </div>

      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
          checked
            ? "bg-[#635bff] text-white"
            : "border border-[#555e6b]"
        }`}
      >
        {checked && (
          <Check
            size={12}
          />
        )}
      </span>
    </button>
  );
}

/* =========================================================
   BADGES
========================================================= */

function RoleBadge({
  role,
  label,
}: {
  role: Role;

  label: string;
}) {
  const colors = {
    admin:
      "bg-[#302f48] text-[#aaa5ff]",

    team:
      "bg-[#243749] text-[#70bfff]",

    client:
      "bg-[#17382b] text-[#5ee0a3]",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold ${colors[role]}`}
    >
      {label}
    </span>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold ${
        active
          ? "bg-[#17382b] text-[#5ee0a3]"
          : "bg-[#462525] text-[#ff8d8d]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active
            ? "bg-[#2ac97d]"
            : "bg-[#ef6464]"
        }`}
      />

      {active
        ? "Ativo"
        : "Inativo"}
    </span>
  );
}

/* =========================================================
   TABLE
========================================================= */

function TableHead({
  children,
  align = "left",
}: {
  children:
    React.ReactNode;

  align?:
    | "left"
    | "right";
}) {
  return (
    <th
      className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f96a3] ${
        align ===
        "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

/* =========================================================
   PAGINAÇÃO
========================================================= */

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPrevious,
  onNext,
}: {
  currentPage:
    number;

  totalPages:
    number;

  totalItems:
    number;

  onPrevious:
    () => void;

  onNext:
    () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#363c46] bg-[#23272f] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-[#8f96a3]">
        {totalItems}{" "}
        usuário
        {totalItems ===
        1
          ? ""
          : "s"}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={
            currentPage ===
            1
          }
          onClick={
            onPrevious
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb] transition hover:bg-[#343a44] disabled:opacity-30"
        >
          <ChevronLeft
            size={16}
          />
        </button>

        <div className="flex h-9 min-w-[72px] items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] px-3 text-[11px] font-semibold text-[#c5cad3]">
          {currentPage} /{" "}
          {totalPages}
        </div>

        <button
          type="button"
          disabled={
            currentPage ===
            totalPages
          }
          onClick={
            onNext
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb] transition hover:bg-[#343a44] disabled:opacity-30"
        >
          <ChevronRight
            size={16}
          />
        </button>
      </div>
    </div>
  );
}