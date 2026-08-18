"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  createClient,
} from "@/utils/supabase/client";

type UserRole =
  | "admin"
  | "team"
  | "client";

type Permissions = {
  dashboard?: boolean;
  finance?: boolean;
  reports?: boolean;
  marketing?: boolean;
  users?: boolean;
  client_management?: boolean;
};

type Profile = {
  id: string;
  role: UserRole;
  active: boolean;
  permissions: Permissions | null;
};

export default function LoginPage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function handleLogin(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(
      true
    );

    setError(
      ""
    );

    try {
      /* =========================================
         LOGIN
      ========================================= */

      const {
        data:
          loginData,

        error:
          loginError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              email
                .trim()
                .toLowerCase(),

            password,
          }
        );

      if (
        loginError ||
        !loginData.user
      ) {
        setError(
          "E-mail ou senha inválidos."
        );

        setLoading(
          false
        );

        return;
      }

      /* =========================================
         USUÁRIO AUTENTICADO
      ========================================= */

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
        await supabase.auth.signOut();

        setError(
          "Não foi possível identificar seu usuário."
        );

        setLoading(
          false
        );

        return;
      }

      /* =========================================
         PROFILE
      ========================================= */

      const {
        data:
          profileData,

        error:
          profileError,
      } =
        await supabase
          .from(
            "profiles"
          )
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
        profileError
      ) {
        console.error(
          "Erro ao buscar perfil:",
          profileError
        );

        await supabase.auth.signOut();

        setError(
          "Não foi possível carregar seu perfil de acesso."
        );

        setLoading(
          false
        );

        return;
      }

      if (
        !profileData
      ) {
        await supabase.auth.signOut();

        setError(
          "Seu perfil de acesso não foi encontrado."
        );

        setLoading(
          false
        );

        return;
      }

      const typedProfile =
        profileData as Profile;

      /* =========================================
         USUÁRIO INATIVO
      ========================================= */

      if (
        !typedProfile.active
      ) {
        await supabase.auth.signOut();

        setError(
          "Seu usuário está inativo. Entre em contato com o administrador."
        );

        setLoading(
          false
        );

        return;
      }

      /* =========================================
         ADMIN
      ========================================= */

      if (
        typedProfile.role ===
        "admin"
      ) {
        router.replace(
          "/dashboard"
        );

        router.refresh();

        return;
      }

      /* =========================================
         CLIENTE
      ========================================= */

      if (
        typedProfile.role ===
        "client"
      ) {
        router.replace(
          "/portal"
        );

        router.refresh();

        return;
      }

      /* =========================================
         EQUIPE
      ========================================= */

      const permissions =
        typedProfile.permissions ||
        {};

      /*
       * ORDEM DE PRIORIDADE
       * DA EQUIPE
       */

      if (
        permissions.marketing
      ) {
        router.replace(
          "/marketing"
        );

        router.refresh();

        return;
      }

      if (
        permissions.finance
      ) {
        router.replace(
          "/contas-pagar"
        );

        router.refresh();

        return;
      }

      if (
        permissions.reports
      ) {
        router.replace(
          "/relatorios"
        );

        router.refresh();

        return;
      }

      if (
        permissions.dashboard
      ) {
        router.replace(
          "/dashboard"
        );

        router.refresh();

        return;
      }

      if (
        permissions.client_management
      ) {
        router.replace(
          "/clientes"
        );

        router.refresh();

        return;
      }

      if (
        permissions.users
      ) {
        router.replace(
          "/usuarios"
        );

        router.refresh();

        return;
      }

      /* =========================================
         SEM PERMISSÃO
      ========================================= */

      await supabase.auth.signOut();

      setError(
        "Seu usuário não possui nenhum módulo liberado."
      );

      setLoading(
        false
      );
    } catch (
      err
    ) {
      console.error(
        "Erro no login:",
        err
      );

      setError(
        "Não foi possível acessar o sistema."
      );

      setLoading(
        false
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* =========================================
            LADO ESQUERDO
        ========================================= */}

        <section className="relative hidden overflow-hidden bg-[#07111f] lg:flex lg:flex-col lg:justify-between">
          {/* FUNDO */}

          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

          <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-3xl" />

          {/* LOGO */}

          <div className="relative z-10 px-14 pt-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <span className="text-lg font-black text-[#07111f]">
                  L
                </span>
              </div>

              <div>
                <p className="text-xl font-semibold tracking-tight text-white">
                  Linko HUB
                </p>

                <p className="text-xs text-slate-400">
                  Gestão inteligente
                </p>
              </div>
            </div>
          </div>

          {/* APRESENTAÇÃO */}

          <div className="relative z-10 max-w-2xl px-14">
            <div className="mb-7 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 backdrop-blur">
              Financeiro • Marketing • Clientes • Gestão
            </div>

            <h1 className="max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-white">
              Tudo o que a Linko precisa em um só lugar.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
              Centralize financeiro, clientes, produção de conteúdo,
              aprovações e equipe em um único ambiente.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">
                  Financeiro
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Controle completo
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">
                  Marketing
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Produção organizada
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">
                  Clientes
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Portal exclusivo
                </p>
              </div>
            </div>
          </div>

          {/* RODAPÉ */}

          <div className="relative z-10 px-14 pb-10">
            <p className="text-xs text-slate-600">
              © 2026 Linko. Ambiente seguro.
            </p>
          </div>
        </section>

        {/* =========================================
            LADO DIREITO
        ========================================= */}

        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-[430px]">
            {/* MOBILE LOGO */}

            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f]">
                <span className="text-lg font-black text-white">
                  L
                </span>
              </div>

              <p className="text-xl font-semibold text-slate-950">
                Linko HUB
              </p>
            </div>

            {/* CABEÇALHO */}

            <div className="mb-9">
              <p className="mb-3 text-sm font-semibold text-blue-600">
                BEM-VINDO
              </p>

              <h2 className="text-[34px] font-semibold tracking-[-0.04em] text-slate-950">
                Acesse sua conta
              </h2>

              <p className="mt-3 text-[15px] leading-6 text-slate-500">
                Entre com seu e-mail e senha para continuar.
              </p>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleLogin
              }
            >
              <div className="space-y-5">
                {/* EMAIL */}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    E-mail
                  </label>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={
                      email
                    }
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event
                          .target
                          .value
                      )
                    }
                    required
                    placeholder="seuemail@linko.com.br"
                    className="h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* SENHA */}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Senha
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={
                        password
                      }
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event
                            .target
                            .value
                        )
                      }
                      required
                      placeholder="Digite sua senha"
                      className="h-13 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                    >
                      {showPassword
                        ? "Ocultar"
                        : "Exibir"}
                    </button>
                  </div>
                </div>
              </div>

              {/* ERRO */}

              {error && (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">
                    {error}
                  </p>
                </div>
              )}

              {/* BOTÃO */}

              <button
                type="submit"
                disabled={
                  loading
                }
                className="mt-7 flex h-13 w-full items-center justify-center rounded-xl bg-[#0b1728] px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#13243b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                    Entrando...
                  </span>
                ) : (
                  "Acessar"
                )}
              </button>
            </form>

            {/* SEGURANÇA */}

            <div className="mt-10 flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

              <p className="text-xs text-slate-400">
                Ambiente seguro Linko
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}