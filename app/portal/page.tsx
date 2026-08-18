"use client";

import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  Plus,
  UserCircle,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  client_id?: string | null;
};

type Client = {
  id: string;
  name?: string | null;
  company_name?: string | null;
  cnpj?: string | null;
};

type Contract = {
  id: string;
  client_id?: string | null;
  value?: number | null;
  amount?: number | null;
  contract_value?: number | null;
  due_date?: string | null;
  next_due_date?: string | null;
  status?: string | null;
  payment_status?: string | null;
};

type ContentItem = {
  id: string;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  stage?: string | null;
  client_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  review_date?: string | null;
  image_url?: string | null;
  cover_url?: string | null;
  format?: string | null;
};

type Activity = {
  id: string;
  title: string;
  description: string;
  date: string;
  type: "review" | "approved" | "published" | "payment";
};

function formatDate(date?: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("pt-BR");
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "R$ 0,00";
  }

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeStatus(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isReviewStatus(value?: string | null) {
  const status = normalizeStatus(value);

  return [
    "revisao",
    "revisão",
    "review",
    "para revisar",
    "a revisar",
    "aguardando aprovacao",
    "aguardando aprovação",
  ].includes(status);
}

function isApprovedStatus(value?: string | null) {
  const status = normalizeStatus(value);

  return [
    "aprovado",
    "aprovada",
    "approved",
    "aprovados",
    "aprovadas",
  ].includes(status);
}

function isPublishedStatus(value?: string | null) {
  const status = normalizeStatus(value);

  return [
    "publicado",
    "publicada",
    "published",
    "publicados",
    "publicadas",
  ].includes(status);
}

function isPaymentOpen(contract?: Contract | null) {
  if (!contract) return false;

  const paymentStatus = normalizeStatus(contract.payment_status);
  const contractStatus = normalizeStatus(contract.status);

  if (
    [
      "pago",
      "paid",
      "quitado",
      "regular",
      "em dia",
      "active",
      "ativo",
    ].includes(paymentStatus)
  ) {
    return false;
  }

  if (
    [
      "aberto",
      "em aberto",
      "pendente",
      "pending",
      "atrasado",
      "vencido",
      "overdue",
      "inadimplente",
    ].includes(paymentStatus)
  ) {
    return true;
  }

  if (
    [
      "aberto",
      "pendente",
      "atrasado",
      "vencido",
      "overdue",
      "inadimplente",
    ].includes(contractStatus)
  ) {
    return true;
  }

  if (contract.due_date || contract.next_due_date) {
    const due = new Date(contract.due_date || contract.next_due_date!);

    if (!Number.isNaN(due.getTime())) {
      return due.getTime() < Date.now();
    }
  }

  return false;
}

async function safeFetchTable(
  supabase: ReturnType<typeof createClient>,
  table: string,
  select = "*"
) {
  try {
    const result = await supabase.from(table).select(select);

    return result;
  } catch {
    return {
      data: null,
      error: null,
    };
  }
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      /*
       * ============================================================
       * PERFIL
       * ============================================================
       */

      const profileResult = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileResult.error) {
        console.error("Erro ao buscar perfil:", profileResult.error);
      }

      const currentProfile =
        (profileResult.data as Profile | null) || {
          id: user.id,
          email: user.email,
        };

      /*
       * Se o usuário for admin, não permanece no portal do cliente.
       */

      if (currentProfile.role === "admin") {
        router.replace("/dashboard");
        return;
      }

      setProfile(currentProfile);

      /*
       * ============================================================
       * CLIENTE
       * ============================================================
       */

      let currentClient: Client | null = null;

      if (currentProfile.client_id) {
        const clientResult = await supabase
          .from("clients")
          .select("*")
          .eq("id", currentProfile.client_id)
          .maybeSingle();

        if (!clientResult.error && clientResult.data) {
          currentClient = clientResult.data as Client;
        }
      }

      /*
       * Fallback:
       * caso o profile tenha email, tentamos encontrar o cliente.
       */

      if (!currentClient && user.email) {
        const clientByEmail = await supabase
          .from("clients")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();

        if (!clientByEmail.error && clientByEmail.data) {
          currentClient = clientByEmail.data as Client;
        }
      }

      setClient(currentClient);

      const clientId = currentClient?.id || currentProfile.client_id;

      /*
       * ============================================================
       * CONTRATO
       * ============================================================
       */

      if (clientId) {
        const contractResult = await supabase
          .from("contracts")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (contractResult.error) {
          console.error(
            "Erro ao buscar contrato:",
            contractResult.error
          );
        }

        setContract(
          (contractResult.data as Contract | null) || null
        );
      }

      /*
       * ============================================================
       * CONTEÚDOS
       * ============================================================
       *
       * O portal tenta carregar a tabela de conteúdos.
       * Caso a tabela ainda não esteja disponível, o dashboard
       * continua funcionando normalmente.
       */

      let contentRows: ContentItem[] = [];

      if (clientId) {
        const possibleTables = [
          "contents",
          "content",
          "marketing_contents",
        ];

        for (const tableName of possibleTables) {
          const result = await safeFetchTable(
            supabase,
            tableName,
            "*"
          );

          if (!result.error && result.data) {
           const rows = result.data as unknown as ContentItem[];
            const filteredRows = rows.filter((item) => {
              if (!item.client_id) return true;
              return item.client_id === clientId;
            });

            contentRows = filteredRows;
            break;
          }
        }
      }

      setContents(contentRows);
    } catch (err) {
      console.error("Erro no dashboard do portal:", err);
      setError(
        "Não foi possível carregar alguns dados do seu portal."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const userName = useMemo(() => {
    return (
      profile?.full_name ||
      profile?.name ||
      client?.name ||
      client?.company_name ||
      "Cliente"
    );
  }, [profile, client]);

  const firstName = useMemo(() => {
    return userName.split(" ")[0] || "Cliente";
  }, [userName]);

  const reviewCount = useMemo(() => {
    return contents.filter((item) =>
      isReviewStatus(item.status || item.stage)
    ).length;
  }, [contents]);

  const approvedCount = useMemo(() => {
    return contents.filter((item) =>
      isApprovedStatus(item.status || item.stage)
    ).length;
  }, [contents]);

  const publishedThisMonth = useMemo(() => {
    const now = new Date();

    return contents.filter((item) => {
      if (!isPublishedStatus(item.status || item.stage)) {
        return false;
      }

      const dateValue =
        item.published_at ||
        item.updated_at ||
        item.created_at;

      if (!dateValue) return false;

      const date = new Date(dateValue);

      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [contents]);

  const paymentOpen = useMemo(() => {
    return isPaymentOpen(contract);
  }, [contract]);

  const paymentValue = useMemo(() => {
    if (!contract) return 0;

    return (
      contract.value ||
      contract.amount ||
      contract.contract_value ||
      0
    );
  }, [contract]);

  const activities = useMemo<Activity[]>(() => {
    const result: Activity[] = [];

    const sorted = [...contents]
      .sort((a, b) => {
        const dateA = new Date(
          a.updated_at || a.created_at || 0
        ).getTime();

        const dateB = new Date(
          b.updated_at || b.created_at || 0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 5);

    sorted.forEach((item) => {
      const status = item.status || item.stage;

      if (isPublishedStatus(status)) {
        result.push({
          id: `${item.id}-published`,
          title: "Conteúdo publicado",
          description:
            item.title || item.name || "Conteúdo publicado",
          date: item.published_at || item.updated_at || "",
          type: "published",
        });
        return;
      }

      if (isApprovedStatus(status)) {
        result.push({
          id: `${item.id}-approved`,
          title: "Conteúdo aprovado",
          description:
            item.title || item.name || "Conteúdo aprovado",
          date: item.updated_at || item.created_at || "",
          type: "approved",
        });
        return;
      }

      if (isReviewStatus(status)) {
        result.push({
          id: `${item.id}-review`,
          title: "Conteúdo aguardando sua revisão",
          description:
            item.title || item.name || "Novo conteúdo para revisar",
          date: item.updated_at || item.created_at || "",
          type: "review",
        });
      }
    });

    if (paymentOpen) {
      result.unshift({
        id: "payment-open",
        title: "Pagamento pendente",
        description: paymentValue
          ? `Existe um pagamento em aberto de ${formatCurrency(
              paymentValue
            )}.`
          : "Existe um pagamento em aberto.",
        date:
          contract?.due_date ||
          contract?.next_due_date ||
          "",
        type: "payment",
      });
    }

    return result.slice(0, 5);
  }, [contents, paymentOpen, paymentValue, contract]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1f232b] text-white">
        <PortalSidebar />

        <main className="ml-[180px] min-h-screen">
          <PortalTopbar
            userName="Cliente"
            avatarUrl={null}
          />

          <div className="p-6 md:p-8">
            <div className="mx-auto max-w-[1400px] space-y-6">
              <div className="h-36 animate-pulse rounded-3xl bg-[#292e38]" />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-36 animate-pulse rounded-2xl bg-[#292e38]"
                  />
                ))}
              </div>

              <div className="h-[420px] animate-pulse rounded-3xl bg-[#292e38]" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1f232b] text-white">
      <PortalSidebar />

      <main className="ml-[180px] min-h-screen">
        <PortalTopbar
          userName={userName}
          avatarUrl={profile?.avatar_url}
        />

        <div className="p-5 md:p-7">
          <div className="mx-auto max-w-[1400px] space-y-6">
            {error && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4">
                <CircleAlert className="h-5 w-5 text-red-400" />

                <p className="text-sm text-red-300">
                  {error}
                </p>
              </div>
            )}

            {/* ======================================================
                HERO
            ====================================================== */}

            <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#272c35]">
              <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#6258ff]/10 blur-3xl" />

              <div className="relative flex flex-col gap-6 p-7 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#776dff]">
                    PORTAL DO CLIENTE
                  </p>

                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                    Olá, {firstName} 👋
                  </h1>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#8f96a5]">
                    Acompanhe seus conteúdos, aprovações e
                    publicações em um só lugar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/portal/conteudo")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6258ff] px-5 text-sm font-semibold text-white transition hover:bg-[#7168ff]"
                >
                  <Megaphone className="h-4 w-4" />
                  Ver meu conteúdo
                </button>
              </div>
            </section>

            {/* ======================================================
                AVISO PAGAMENTO
            ====================================================== */}

            {paymentOpen && (
              <section className="overflow-hidden rounded-2xl border border-orange-400/20 bg-orange-500/[0.08]">
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                      <WalletCards className="h-5 w-5 text-orange-400" />
                    </div>

                    <div>
                      <p className="font-semibold text-orange-200">
                        Pagamento em aberto
                      </p>

                      <p className="mt-1 text-sm text-orange-100/60">
                        {paymentValue
                          ? `Identificamos um pagamento de ${formatCurrency(
                              paymentValue
                            )} em aberto.`
                          : "Identificamos um pagamento em aberto."}
                      </p>

                      {contract?.due_date && (
                        <p className="mt-1 text-xs text-orange-200/50">
                          Vencimento:{" "}
                          {formatDate(contract.due_date)}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/portal/informacoes")
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-orange-300/20 bg-orange-400/10 px-4 text-sm font-semibold text-orange-200 transition hover:bg-orange-400/20"
                  >
                    Ver informações
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}

            {/* ======================================================
                CARDS
            ====================================================== */}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <DashboardStat
                title="Para revisar"
                value={reviewCount}
                description={
                  reviewCount === 1
                    ? "conteúdo aguardando sua aprovação"
                    : "conteúdos aguardando sua aprovação"
                }
                icon={<Clock3 className="h-5 w-5" />}
                iconClass="bg-orange-500/10 text-orange-400"
                onClick={() =>
                  router.push("/portal/conteudo?status=revisao")
                }
              />

              <DashboardStat
                title="Aprovados"
                value={approvedCount}
                description="conteúdos aprovados"
                icon={<CheckCircle2 className="h-5 w-5" />}
                iconClass="bg-emerald-500/10 text-emerald-400"
                onClick={() =>
                  router.push("/portal/conteudo?status=aprovado")
                }
              />

              <DashboardStat
                title="Publicados no mês"
                value={publishedThisMonth}
                description="conteúdos publicados"
                icon={<Megaphone className="h-5 w-5" />}
                iconClass="bg-[#6258ff]/10 text-[#827aff]"
                onClick={() =>
                  router.push("/portal/conteudo?status=publicado")
                }
              />

              <DashboardStat
                title="Contrato"
                value={
                  paymentOpen
                    ? "Em aberto"
                    : contract
                    ? "Em dia"
                    : "—"
                }
                description={
                  contract
                    ? `Vencimento ${
                        contract.due_date
                          ? formatDate(contract.due_date)
                          : "não informado"
                      }`
                    : "Nenhum contrato encontrado"
                }
                icon={<WalletCards className="h-5 w-5" />}
                iconClass={
                  paymentOpen
                    ? "bg-orange-500/10 text-orange-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }
                onClick={() =>
                  router.push("/portal/informacoes")
                }
              />
            </section>

            {/* ======================================================
                CONTEÚDO
            ====================================================== */}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
              <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#272c35]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777d8d]">
                      MARKETING
                    </p>

                    <h2 className="mt-1 text-lg font-semibold">
                      Meu conteúdo
                    </h2>

                    <p className="mt-1 text-xs text-[#777d8d]">
                      Acompanhe os conteúdos que estão em produção.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/portal/conteudo")
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-[#827aff] transition hover:text-white"
                  >
                    Ver tudo
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5">
                  {contents.length === 0 ? (
                    <EmptyContent />
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {contents.slice(0, 4).map((item) => (
                        <ContentPreviewCard
                          key={item.id}
                          item={item}
                          onClick={() =>
                            router.push(
                              `/portal/conteudo?card=${item.id}`
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ====================================================
                  ATIVIDADE
              ==================================================== */}

              <div className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#272c35]">
                <div className="border-b border-white/[0.06] px-6 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777d8d]">
                    ATIVIDADE
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    Atividade recente
                  </h2>
                </div>

                <div className="p-5">
                  {activities.length === 0 ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                        <Bell className="h-5 w-5 text-[#707786]" />
                      </div>

                      <p className="mt-4 text-sm font-medium text-[#a5abb8]">
                        Nenhuma atividade recente
                      </p>

                      <p className="mt-1 max-w-xs text-xs leading-5 text-[#666d7c]">
                        As novidades sobre seus conteúdos aparecerão aqui.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {activities.map((activity) => (
                        <ActivityRow
                          key={activity.id}
                          activity={activity}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ======================================================
                INFORMAÇÕES DO CLIENTE
            ====================================================== */}

            <section className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#272c35]">
              <div className="flex flex-col gap-4 border-b border-white/[0.06] px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777d8d]">
                    MINHA CONTA
                  </p>

                  <h2 className="mt-1 text-lg font-semibold">
                    Informações da empresa
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/portal/informacoes")
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#827aff]"
                >
                  Ver informações
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 divide-y divide-white/[0.06] md:grid-cols-3 md:divide-x md:divide-y-0">
                <InfoItem
                  label="Empresa"
                  value={
                    client?.company_name ||
                    client?.name ||
                    "Não informado"
                  }
                />

                <InfoItem
                  label="CNPJ"
                  value={client?.cnpj || "Não informado"}
                />

                <InfoItem
                  label="Contrato"
                  value={
                    contract
                      ? formatCurrency(paymentValue)
                      : "Não informado"
                  }
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ================================================================
   SIDEBAR
================================================================ */

function PortalSidebar() {
  const router = useRouter();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[180px] flex-col border-r border-white/[0.06] bg-[#22262e]">
      <div className="flex h-[68px] items-center gap-3 border-b border-white/[0.06] px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6258ff] text-sm font-black text-white shadow-lg shadow-[#6258ff]/20">
          L
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            Linko HUB
          </p>

          <p className="truncate text-[9px] text-[#777d8d]">
            Portal do cliente
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-5">
        <SidebarLabel>VISÃO GERAL</SidebarLabel>

        <PortalNavItem
          icon={<LayoutDashboard className="h-4 w-4" />}
          label="Dashboard"
          active
          onClick={() => router.push("/portal")}
        />

        <SidebarLabel>MARKETING</SidebarLabel>

        <PortalNavItem
          icon={<Megaphone className="h-4 w-4" />}
          label="Meu conteúdo"
          onClick={() => router.push("/portal/conteudo")}
        />

        <SidebarLabel>MINHA CONTA</SidebarLabel>

        <PortalNavItem
          icon={<FileText className="h-4 w-4" />}
          label="Informações"
          onClick={() => router.push("/portal/informacoes")}
        />

        <PortalNavItem
          icon={<UserCircle className="h-4 w-4" />}
          label="Meu perfil"
          onClick={() => router.push("/portal/perfil")}
        />
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <button
          type="button"
          onClick={() => router.push("/portal/perfil")}
          className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.04]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6258ff] text-xs font-bold">
            C
          </div>

          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-white">
              Minha conta
            </p>

            <p className="text-[9px] text-[#777d8d]">
              Perfil
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}

/* ================================================================
   TOPBAR
================================================================ */

function PortalTopbar({
  userName,
  avatarUrl,
}: {
  userName: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-end border-b border-white/[0.06] bg-[#1f232b]/95 px-5 backdrop-blur-xl md:px-7">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {}}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-[#8f96a5] transition hover:bg-white/[0.05] hover:text-white"
        >
          <Bell className="h-4 w-4" />

          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-400" />
        </button>

        <button
          type="button"
          onClick={() => router.push("/portal/perfil")}
          className="flex items-center gap-3"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6258ff] text-xs font-bold text-white">
              {initials || "C"}
            </div>
          )}

          <div className="hidden text-left sm:block">
            <p className="max-w-[160px] truncate text-xs font-semibold text-white">
              {userName}
            </p>

            <p className="text-[9px] text-[#777d8d]">
              Cliente
            </p>
          </div>

          <ChevronRight className="hidden h-3.5 w-3.5 text-[#666d7c] sm:block" />
        </button>
      </div>
    </header>
  );
}

/* ================================================================
   STAT
================================================================ */

function DashboardStat({
  title,
  value,
  description,
  icon,
  iconClass,
  onClick,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-white/[0.06] bg-[#272c35] p-5 text-left transition hover:-translate-y-0.5 hover:border-white/[0.1] hover:bg-[#2b3039]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#8b92a1]">
            {title}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-[11px] text-[#686f7d]">
          {description}
        </p>

        <ChevronRight className="h-4 w-4 text-[#565d6b] transition group-hover:translate-x-0.5 group-hover:text-[#827aff]" />
      </div>
    </button>
  );
}

/* ================================================================
   CONTENT CARD
================================================================ */

function ContentPreviewCard({
  item,
  onClick,
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  const title = item.title || item.name || "Sem título";
  const status = item.status || item.stage || "Em produção";

  const review = isReviewStatus(status);
  const approved = isApprovedStatus(status);
  const published = isPublishedStatus(status);

  const statusLabel = published
    ? "Publicado"
    : approved
    ? "Aprovado"
    : review
    ? "Para revisar"
    : "Em produção";

  const statusClass = published
    ? "bg-emerald-500/10 text-emerald-400"
    : approved
    ? "bg-blue-500/10 text-blue-400"
    : review
    ? "bg-orange-500/10 text-orange-400"
    : "bg-[#6258ff]/10 text-[#8a83ff]";

  const image =
    item.image_url ||
    item.cover_url ||
    null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-[#22262e] text-left transition hover:border-white/[0.12] hover:bg-[#292e37]"
    >
      <div className="h-[145px] overflow-hidden bg-[#1c2027]">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-[#444b58]" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#747b8a]">
              {item.format || "Conteúdo"}
            </p>

            <h3 className="mt-1 truncate text-sm font-semibold text-white">
              {title}
            </h3>
          </div>

          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${statusClass}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] text-[#696f7d]">
          <span>
            {formatDate(
              item.updated_at || item.created_at
            )}
          </span>

          <ChevronRight className="h-3.5 w-3.5 text-[#555c69]" />
        </div>
      </div>
    </button>
  );
}

/* ================================================================
   ACTIVITY
================================================================ */

function ActivityRow({
  activity,
}: {
  activity: Activity;
}) {
  const icon =
    activity.type === "payment" ? (
      <WalletCards className="h-4 w-4 text-orange-400" />
    ) : activity.type === "review" ? (
      <Clock3 className="h-4 w-4 text-orange-400" />
    ) : activity.type === "approved" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    ) : (
      <Megaphone className="h-4 w-4 text-[#827aff]" />
    );

  return (
    <div className="flex gap-3 rounded-xl p-3 transition hover:bg-white/[0.025]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#dfe2e8]">
          {activity.title}
        </p>

        <p className="mt-1 truncate text-[11px] text-[#747b89]">
          {activity.description}
        </p>

        <p className="mt-1 text-[9px] text-[#555c69]">
          {formatDate(activity.date)}
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   EMPTY
================================================================ */

function EmptyContent() {
  return (
    <div className="flex min-h-[270px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-[#22262e]/50 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
        <Megaphone className="h-5 w-5 text-[#666d7b]" />
      </div>

      <p className="mt-4 text-sm font-medium text-[#a3a9b5]">
        Nenhum conteúdo ainda
      </p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-[#666d7b]">
        Quando a equipe da Linko criar conteúdos para sua
        empresa, eles aparecerão aqui.
      </p>
    </div>
  );
}

/* ================================================================
   INFO
================================================================ */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="px-6 py-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#686f7d]">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-semibold text-[#e2e5ea]">
        {value}
      </p>
    </div>
  );
}

/* ================================================================
   SIDEBAR LABEL
================================================================ */

function SidebarLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="mb-2 mt-5 px-3 text-[8px] font-bold uppercase tracking-[0.22em] text-[#626977] first:mt-0">
      {children}
    </p>
  );
}

/* ================================================================
   NAV ITEM
================================================================ */

function PortalNavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        active
          ? "bg-[#343a46] text-white"
          : "text-[#858c9a] hover:bg-white/[0.035] hover:text-white"
      }`}
    >
      <span
        className={
          active
            ? "text-[#827aff]"
            : "text-[#707786] group-hover:text-[#a9afba]"
        }
      >
        {icon}
      </span>

      <span className="flex-1 truncate text-[11px] font-medium">
        {label}
      </span>

      {active && (
        <ChevronRight className="h-3.5 w-3.5 text-[#827aff]" />
      )}
    </button>
  );
}