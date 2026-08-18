"use client";

import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  ShieldAlert,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/utils/supabase/client";

type UserRole =
  | "admin"
  | "team"
  | "client";

export type PermissionKey =
  | "dashboard"
  | "finance"
  | "reports"
  | "marketing"
  | "users"
  | "client_management";

type Permissions = Partial<
  Record<
    PermissionKey,
    boolean
  >
>;

type Profile = {
  id: string;
  role: UserRole;
  active: boolean;
  permissions: Permissions | null;
};

type RouteGuardProps = {
  children: ReactNode;

  permission:
    PermissionKey;

  adminOnly?: boolean;

  allowClient?: boolean;
};

export function RouteGuard({
  children,
  permission,
  adminOnly = false,
  allowClient = false,
}: RouteGuardProps) {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    allowed,
    setAllowed,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(
      "Verificando acesso..."
    );

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    setLoading(true);

    /* =========================
       USUÁRIO AUTENTICADO
    ========================= */

    const {
      data: userData,
      error: userError,
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

    /* =========================
       PROFILE
    ========================= */

    const {
      data,
      error,
    } =
      await supabase
        .from("profiles")
        .select(
          `
          id,
          role,
          active,
          permissions
          `
        )
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
        "Erro ao verificar acesso:",
        error
      );

      await supabase.auth.signOut();

      router.replace(
        "/login"
      );

      return;
    }

    const profile =
      data as Profile;

    /* =========================
       INATIVO
    ========================= */

    if (!profile.active) {
      await supabase.auth.signOut();

      router.replace(
        "/login"
      );

      return;
    }

    /* =========================
       ADMIN
    ========================= */

    if (
      profile.role ===
      "admin"
    ) {
      setAllowed(true);
      setLoading(false);

      return;
    }

    /* =========================
       SOMENTE ADMIN
    ========================= */

    if (adminOnly) {
      denyAccess(
        profile
      );

      return;
    }

    /* =========================
       CLIENTE
    ========================= */

    if (
      profile.role ===
      "client"
    ) {
      if (
        allowClient &&
        permission ===
          "marketing"
      ) {
        setAllowed(true);
        setLoading(false);

        return;
      }

      denyAccess(
        profile
      );

      return;
    }

    /* =========================
       EQUIPE
    ========================= */

    if (
      profile.role ===
      "team"
    ) {
      const hasPermission =
        Boolean(
          profile.permissions?.[
            permission
          ]
        );

      if (
        hasPermission
      ) {
        setAllowed(true);
        setLoading(false);

        return;
      }

      denyAccess(
        profile
      );

      return;
    }

    denyAccess(profile);
  }

  function denyAccess(
    profile: Profile
  ) {
    setAllowed(false);

    setMessage(
      "Você não possui acesso a este módulo."
    );

    /*
     * Redirecionamento para uma
     * área permitida.
     */

    if (
      profile.role ===
      "client"
    ) {
      router.replace(
        "/marketing"
      );

      return;
    }

    const permissions =
      profile.permissions ||
      {};

    if (
      permissions.marketing
    ) {
      router.replace(
        "/marketing"
      );

      return;
    }

    if (
      permissions.finance
    ) {
      router.replace(
        "/contas-pagar"
      );

      return;
    }

    if (
      permissions.reports
    ) {
      router.replace(
        "/relatorios"
      );

      return;
    }

    if (
      permissions.dashboard
    ) {
      router.replace(
        "/dashboard"
      );

      return;
    }

    if (
      permissions.client_management
    ) {
      router.replace(
        "/clientes"
      );

      return;
    }

    if (
      permissions.users
    ) {
      router.replace(
        "/usuarios"
      );

      return;
    }

    setLoading(false);
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1f232a]">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#363c46] bg-[#292e36]">
            <Loader2
              size={20}
              className="animate-spin text-[#9ba1ff]"
            />
          </div>

          <p className="mt-4 text-xs text-[#8f96a3]">
            Verificando acesso...
          </p>
        </div>
      </div>
    );
  }

  /* =========================
     BLOQUEADO
  ========================= */

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1f232a] p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#462525] text-[#ff8d8d]">
            <ShieldAlert
              size={23}
            />
          </div>

          <h1 className="mt-5 text-lg font-semibold text-white">
            Acesso não permitido
          </h1>

          <p className="mt-2 text-sm text-[#8f96a3]">
            {message}
          </p>

          <button
            type="button"
            onClick={() =>
              router.replace(
                "/login"
              )
            }
            className="mt-6 rounded-xl bg-[#635bff] px-5 py-3 text-xs font-semibold text-white"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}