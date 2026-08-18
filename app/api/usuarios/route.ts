import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Role = "admin" | "team" | "client";

type Permissions = {
  dashboard: boolean;
  finance: boolean;
  reports: boolean;
  marketing: boolean;
  users: boolean;
  client_management: boolean;
};

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL não configurada."
    );
  }

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada."
    );
  }

  return createClient(
    url,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/* =========================================================
   AUTENTICAÇÃO / ADMIN
========================================================= */

async function requireAdmin(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return {
      ok: false as const,

      response:
        NextResponse.json(
          {
            error:
              "Sessão não encontrada. Faça login novamente.",
          },
          {
            status: 401,
          }
        ),
    };
  }

  const token =
    authorization.replace(
      "Bearer ",
      ""
    );

  const admin =
    getAdminClient();

  /* VALIDA TOKEN */

  const {
    data: userData,
    error: userError,
  } =
    await admin.auth.getUser(
      token
    );

  console.log(
    "AUTH USER:",
    {
      id:
        userData.user?.id,
      email:
        userData.user?.email,
      error:
        userError,
    }
  );

  if (
    userError ||
    !userData.user
  ) {
    return {
      ok: false as const,

      response:
        NextResponse.json(
          {
            error:
              "Sessão inválida ou expirada.",
          },
          {
            status: 401,
          }
        ),
    };
  }

  const currentUser =
    userData.user;

  /* PROCURA PROFILE */

  let {
    data: profile,
    error: profileError,
  } =
    await admin
      .from("profiles")
      .select(
        "id, role, active"
      )
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();

  console.log(
    "PROFILE RESULT:",
    {
      searchedId:
        currentUser.id,
      profile,
      profileError,
    }
  );

  if (
    profileError
  ) {
    console.error(
      "Erro ao buscar profile:",
      profileError
    );
  }

  /* =======================================================
     SE O PROFILE NÃO EXISTE, CRIA O ADMIN AUTOMATICAMENTE
  ======================================================= */

  if (!profile) {
    console.log(
      "Profile não encontrado. Criando automaticamente..."
    );

    const {
      data: createdProfile,
      error: createProfileError,
    } =
      await admin
        .from("profiles")
        .insert({
          id:
            currentUser.id,

          name:
            currentUser
              .user_metadata
              ?.name ||
            currentUser.email
              ?.split("@")[0] ||
            "Administrador",

          email:
            currentUser.email,

          role:
            "admin",

          active:
            true,

          permissions: {
            dashboard:
              true,

            finance:
              true,

            reports:
              true,

            marketing:
              true,

            users:
              true,

            client_management:
              true,
          },
        })
        .select(
          "id, role, active"
        )
        .single();

    if (
      createProfileError
    ) {
      console.error(
        "Erro ao criar profile:",
        createProfileError
      );

      return {
        ok: false as const,

        response:
          NextResponse.json(
            {
              error:
                `Não foi possível criar o perfil administrativo: ${createProfileError.message}`,
            },
            {
              status: 500,
            }
          ),
      };
    }

    profile =
      createdProfile;
  }

  /* CONFERE ADMIN */

  if (
    profile.role !==
    "admin"
  ) {
    return {
      ok: false as const,

      response:
        NextResponse.json(
          {
            error:
              "Você não possui permissão para gerenciar usuários.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  /* CONFERE ATIVO */

  if (
    !profile.active
  ) {
    return {
      ok: false as const,

      response:
        NextResponse.json(
          {
            error:
              "Seu usuário está inativo.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    ok: true as const,

    admin,

    currentUser,

    profile,
  };
}

/* =========================================================
   GET
   LISTAR USUÁRIOS
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (!auth.ok) {
      return auth.response;
    }

    const {
      admin,
    } = auth;

    const {
      data: profiles,
      error: profilesError,
    } =
      await admin
        .from("profiles")
        .select(`
          id,
          name,
          email,
          role,
          active,
          job_title,
          avatar_url,
          permissions,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (
      profilesError
    ) {
      throw profilesError;
    }

    const {
      data: clientLinks,
      error: clientLinksError,
    } =
      await admin
        .from(
          "client_users"
        )
        .select(
          "user_id, client_id"
        );

    if (
      clientLinksError
    ) {
      throw clientLinksError;
    }

    const users =
      (profiles || []).map(
        (profile) => {
          const link =
            (
              clientLinks ||
              []
            ).find(
              (item) =>
                item.user_id ===
                profile.id
            );

          return {
            ...profile,

            client_id:
              link?.client_id ||
              null,
          };
        }
      );

    return NextResponse.json(
      {
        users,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/usuarios",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar usuários.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   CRIAR USUÁRIO
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (!auth.ok) {
      return auth.response;
    }

    const {
      admin,
    } = auth;

    const body =
      await request.json();

    const {
      name,
      email,
      password,
      job_title,
      role,
      permissions,
      client_id,
    } = body as {
      name: string;
      email: string;
      password: string;

      job_title?: string;

      role: Role;

      permissions:
        Permissions;

      client_id?:
        string;
    };

    /* VALIDAÇÕES */

    if (
      !name?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Informe o nome do usuário.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !email?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Informe o e-mail do usuário.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !password ||
      password.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "A senha deve possuir pelo menos 6 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "admin",
        "team",
        "client",
      ].includes(
        role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Perfil de usuário inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      role ===
        "client" &&
      !client_id
    ) {
      return NextResponse.json(
        {
          error:
            "Selecione o cliente que terá acesso.",
        },
        {
          status: 400,
        }
      );
    }

    /* =======================================================
       CRIA USUÁRIO NO AUTH
    ======================================================= */

    const {
      data: createdUser,
      error: createUserError,
    } =
      await admin.auth.admin.createUser(
        {
          email:
            email
              .trim()
              .toLowerCase(),

          password,

          email_confirm:
            true,

          user_metadata: {
            name:
              name.trim(),
          },
        }
      );

    if (
      createUserError
    ) {
      console.error(
        "Erro createUser:",
        createUserError
      );

      return NextResponse.json(
        {
          error:
            createUserError.message,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !createdUser.user
    ) {
      return NextResponse.json(
        {
          error:
            "O usuário não foi criado no Supabase Auth.",
        },
        {
          status: 500,
        }
      );
    }

    const userId =
      createdUser.user.id;

    /* =======================================================
       SALVA/ATUALIZA PROFILE
    ======================================================= */

    const {
      error: profileError,
    } =
      await admin
        .from("profiles")
        .upsert({
          id:
            userId,

          name:
            name.trim(),

          email:
            email
              .trim()
              .toLowerCase(),

          job_title:
            job_title?.trim() ||
            null,

          role,

          /*
           * TODO USUÁRIO NOVO
           * NASCE ATIVO
           */
          active:
            true,

          permissions:
            permissions ||
            (
              role ===
              "admin"
                ? {
                    dashboard:
                      true,
                    finance:
                      true,
                    reports:
                      true,
                    marketing:
                      true,
                    users:
                      true,
                    client_management:
                      true,
                  }
                : role ===
                  "client"
                ? {
                    dashboard:
                      false,
                    finance:
                      false,
                    reports:
                      false,
                    marketing:
                      true,
                    users:
                      false,
                    client_management:
                      false,
                  }
                : {
                    dashboard:
                      true,
                    finance:
                      false,
                    reports:
                      false,
                    marketing:
                      true,
                    users:
                      false,
                    client_management:
                      false,
                  }
            ),
        });

    if (
      profileError
    ) {
      console.error(
        "Erro profile:",
        profileError
      );

      /*
       * ROLLBACK
       */
      await admin.auth.admin.deleteUser(
        userId
      );

      throw profileError;
    }

    /* =======================================================
       VINCULA CLIENTE
    ======================================================= */

    if (
      role ===
        "client" &&
      client_id
    ) {
      const {
        error: linkError,
      } =
        await admin
          .from(
            "client_users"
          )
          .insert({
            user_id:
              userId,

            client_id,
          });

      if (
        linkError
      ) {
        console.error(
          "Erro client_users:",
          linkError
        );

        await admin
          .from(
            "profiles"
          )
          .delete()
          .eq(
            "id",
            userId
          );

        await admin.auth.admin.deleteUser(
          userId
        );

        throw linkError;
      }
    }

    return NextResponse.json(
      {
        success:
          true,

        user_id:
          userId,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/usuarios",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o usuário.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PUT
   EDITAR USUÁRIO
========================================================= */

export async function PUT(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (!auth.ok) {
      return auth.response;
    }

    const {
      admin,
    } = auth;

    const body =
      await request.json();

    const {
      id,
      name,
      email,
      password,
      job_title,
      role,
      permissions,
      client_id,
    } = body as {
      id:
        string;

      name:
        string;

      email:
        string;

      password?:
        string;

      job_title?:
        string;

      role:
        Role;

      permissions:
        Permissions;

      client_id?:
        string;
    };

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Usuário inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !name?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Informe o nome.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !email?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Informe o e-mail.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password &&
      password.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "A nova senha deve possuir pelo menos 6 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      role ===
        "client" &&
      !client_id
    ) {
      return NextResponse.json(
        {
          error:
            "Selecione o cliente vinculado.",
        },
        {
          status: 400,
        }
      );
    }

    /* =======================================================
       ATUALIZA AUTH
    ======================================================= */

    const authPayload: {
      email:
        string;

      password?:
        string;

      user_metadata: {
        name:
          string;
      };
    } = {
      email:
        email
          .trim()
          .toLowerCase(),

      user_metadata: {
        name:
          name.trim(),
      },
    };

    if (
      password?.trim()
    ) {
      authPayload.password =
        password.trim();
    }

    const {
      error: updateAuthError,
    } =
      await admin.auth.admin.updateUserById(
        id,
        authPayload
      );

    if (
      updateAuthError
    ) {
      throw updateAuthError;
    }

    /* =======================================================
       ATUALIZA PROFILE
       NÃO ALTERA ACTIVE
    ======================================================= */

    const {
      error: profileError,
    } =
      await admin
        .from("profiles")
        .update({
          name:
            name.trim(),

          email:
            email
              .trim()
              .toLowerCase(),

          job_title:
            job_title?.trim() ||
            null,

          role,

          permissions,
        })
        .eq(
          "id",
          id
        );

    if (
      profileError
    ) {
      throw profileError;
    }

    /* =======================================================
       REMOVE VÍNCULO ANTIGO
    ======================================================= */

    const {
      error: deleteLinkError,
    } =
      await admin
        .from(
          "client_users"
        )
        .delete()
        .eq(
          "user_id",
          id
        );

    if (
      deleteLinkError
    ) {
      throw deleteLinkError;
    }

    /* =======================================================
       VINCULA NOVAMENTE SE FOR CLIENTE
    ======================================================= */

    if (
      role ===
        "client" &&
      client_id
    ) {
      const {
        error: linkError,
      } =
        await admin
          .from(
            "client_users"
          )
          .insert({
            user_id:
              id,

            client_id,
          });

      if (
        linkError
      ) {
        throw linkError;
      }
    }

    return NextResponse.json(
      {
        success:
          true,
      }
    );
  } catch (error) {
    console.error(
      "PUT /api/usuarios",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o usuário.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH
   ATIVAR / INATIVAR
========================================================= */

export async function PATCH(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (!auth.ok) {
      return auth.response;
    }

    const {
      admin,
      currentUser,
    } = auth;

    const body =
      await request.json();

    const {
      id,
      active,
    } = body as {
      id:
        string;

      active:
        boolean;
    };

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Usuário inválido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * NÃO DEIXA O ADMIN
     * INATIVAR A SI MESMO
     */
    if (
      id ===
        currentUser.id &&
      active ===
        false
    ) {
      return NextResponse.json(
        {
          error:
            "Você não pode inativar seu próprio usuário.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
    } =
      await admin
        .from(
          "profiles"
        )
        .update({
          active,
        })
        .eq(
          "id",
          id
        );

    if (
      error
    ) {
      throw error;
    }

    return NextResponse.json(
      {
        success:
          true,
      }
    );
  } catch (error) {
    console.error(
      "PATCH /api/usuarios",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível alterar o status.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   EXCLUIR UM OU VÁRIOS
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (!auth.ok) {
      return auth.response;
    }

    const {
      admin,
      currentUser,
    } = auth;

    const body =
      await request.json();

    const ids =
      Array.isArray(
        body.ids
      )
        ? (
            body.ids as string[]
          )
        : [];

    if (
      ids.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Nenhum usuário selecionado.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * NÃO DEIXA EXCLUIR
     * O PRÓPRIO ADMIN
     */
    if (
      ids.includes(
        currentUser.id
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Você não pode excluir seu próprio usuário.",
        },
        {
          status: 400,
        }
      );
    }

    const errors: string[] =
      [];

    for (
      const userId of ids
    ) {
      const {
        error,
      } =
        await admin.auth.admin.deleteUser(
          userId
        );

      if (
        error
      ) {
        console.error(
          `Erro ao excluir usuário ${userId}:`,
          error
        );

        errors.push(
          error.message
        );
      }
    }

    if (
      errors.length >
      0
    ) {
      return NextResponse.json(
        {
          error:
            `Alguns usuários não puderam ser excluídos: ${errors.join(
              " | "
            )}`,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        deleted:
          ids.length,
      }
    );
  } catch (error) {
    console.error(
      "DELETE /api/usuarios",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível excluir os usuários.",
      },
      {
        status: 500,
      }
    );
  }
}