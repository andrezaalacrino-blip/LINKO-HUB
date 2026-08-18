import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type UserRole = "admin" | "team" | "client";

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

const protectedRoutes = [
  "/dashboard",
  "/contas-pagar",
  "/relatorios",
  "/marketing",
  "/clientes",
  "/usuarios",
];

function routePermission(pathname: string) {
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  ) {
    return "dashboard";
  }

  if (
    pathname === "/contas-pagar" ||
    pathname.startsWith("/contas-pagar/")
  ) {
    return "finance";
  }

  if (
    pathname === "/relatorios" ||
    pathname.startsWith("/relatorios/")
  ) {
    return "reports";
  }

  if (
    pathname === "/marketing" ||
    pathname.startsWith("/marketing/")
  ) {
    return "marketing";
  }

  if (
    pathname === "/clientes" ||
    pathname.startsWith("/clientes/")
  ) {
    return "client_management";
  }

  if (
    pathname === "/usuarios" ||
    pathname.startsWith("/usuarios/")
  ) {
    return "users";
  }

  return null;
}

function firstAllowedRoute(
  role: UserRole,
  permissions: Permissions | null
) {
  if (role === "admin") {
    return "/dashboard";
  }

  if (role === "client") {
    return "/marketing";
  }

  const p = permissions || {};

  if (p.marketing) {
    return "/marketing";
  }

  if (p.finance) {
    return "/contas-pagar";
  }

  if (p.reports) {
    return "/relatorios";
  }

  if (p.dashboard) {
    return "/dashboard";
  }

  if (p.client_management) {
    return "/clientes";
  }

  if (p.users) {
    return "/usuarios";
  }

  return "/login";
}

export async function proxy(request: NextRequest) {
  const pathname =
    request.nextUrl.pathname;

  const isProtected =
    protectedRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

  if (!isProtected) {
    return NextResponse.next();
  }

  let response =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) =>
                request.cookies.set(
                  name,
                  value
                )
            );

            response =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) =>
                response.cookies.set(
                  name,
                  value,
                  options
                )
            );
          },
        },
      }
    );

  /* ========================================
     USUÁRIO AUTENTICADO
  ======================================== */

  const {
    data: userData,
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !userData.user
  ) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname =
      "/login";

    return NextResponse.redirect(
      loginUrl
    );
  }

  /* ========================================
     PROFILE
  ======================================== */

  const {
    data: profileData,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "id, role, active, permissions"
      )
      .eq(
        "id",
        userData.user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profileData
  ) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname =
      "/login";

    return NextResponse.redirect(
      loginUrl
    );
  }

  const profile =
    profileData as Profile;

  /* ========================================
     INATIVO
  ======================================== */

  if (!profile.active) {
    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname =
      "/login";

    return NextResponse.redirect(
      loginUrl
    );
  }

  /* ========================================
     ADMIN
  ======================================== */

  if (
    profile.role ===
    "admin"
  ) {
    return response;
  }

  const requiredPermission =
    routePermission(
      pathname
    );

  if (!requiredPermission) {
    return response;
  }

  /* ========================================
     CLIENTE
  ======================================== */

  if (
    profile.role ===
    "client"
  ) {
    if (
      requiredPermission ===
      "marketing"
    ) {
      return response;
    }

    const redirectUrl =
      request.nextUrl.clone();

    redirectUrl.pathname =
      "/marketing";

    return NextResponse.redirect(
      redirectUrl
    );
  }

  /* ========================================
     EQUIPE
  ======================================== */

  if (
    profile.role ===
    "team"
  ) {
    const permissions =
      profile.permissions ||
      {};

    const allowed =
      Boolean(
        permissions[
          requiredPermission as keyof Permissions
        ]
      );

    if (allowed) {
      return response;
    }

    const redirectUrl =
      request.nextUrl.clone();

    redirectUrl.pathname =
      firstAllowedRoute(
        profile.role,
        permissions
      );

    return NextResponse.redirect(
      redirectUrl
    );
  }

  const loginUrl =
    request.nextUrl.clone();

  loginUrl.pathname =
    "/login";

  return NextResponse.redirect(
    loginUrl
  );
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/contas-pagar/:path*",
    "/relatorios/:path*",
    "/marketing/:path*",
    "/clientes/:path*",
    "/usuarios/:path*",
    "/portal/:path*",
  ],
};