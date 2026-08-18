import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Usuário não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Por enquanto a API retorna uma lista vazia.
     *
     * A próxima etapa será conectar estas notificações
     * diretamente aos conteúdos e contratos do cliente.
     *
     * Assim não alteramos o Dashboard atual e também
     * não criamos novas policies no Supabase sem necessidade.
     */

    return NextResponse.json({
      notifications: [],
    });
  } catch (error) {
    console.error("Erro na API de notificações:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar as notificações.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Usuário não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Nesta primeira versão não persistimos a leitura
     * no banco porque ainda não criamos uma tabela própria
     * para notificações.
     *
     * O componente já atualiza visualmente a notificação.
     */

    await request.json().catch(() => null);
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error);

    return NextResponse.json(
      {
        error: "Não foi possível atualizar a notificação.",
      },
      {
        status: 500,
      }
    );
  }
}