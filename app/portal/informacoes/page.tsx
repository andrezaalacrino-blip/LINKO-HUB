"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  WalletCards,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/client";

type Client = {
  id: string;
  name: string;
  trade_name: string | null;
  cnpj: string | null;
};

type Contract = {
  id: string;
  client_id: string;
  monthly_value: number | null;
  due_day: number | null;
  status: string | null;
};

type Invoice = {
  id: string;
  client_id: string;
  description: string;
  amount: number;
  due_date: string;
  status:
    | "pending"
    | "paid"
    | "overdue"
    | "cancelled";
  payment_date: string | null;
};

type CompanySettings = {
  company_name: string;
  legal_name: string | null;
  cnpj: string | null;
  pix_key: string | null;
  payment_instructions: string | null;
  email: string | null;
  phone: string | null;
};

export default function ClientInformationPage() {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    client,
    setClient,
  ] =
    useState<Client | null>(
      null
    );

  const [
    contract,
    setContract,
  ] =
    useState<Contract | null>(
      null
    );

  const [
    invoice,
    setInvoice,
  ] =
    useState<Invoice | null>(
      null
    );

  const [
    company,
    setCompany,
  ] =
    useState<CompanySettings | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    copied,
    setCopied,
  ] =
    useState("");

  useEffect(() => {
    loadInformation();
  }, []);

  async function loadInformation() {
    setLoading(true);
    setError("");

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !userData.user
    ) {
      setError(
        "Não foi possível identificar seu usuário."
      );

      setLoading(false);

      return;
    }

    /* =========================================
       DESCOBRE O CLIENTE VINCULADO
    ========================================= */

    const {
      data: clientLink,
      error: clientLinkError,
    } =
      await supabase
        .from(
          "client_users"
        )
        .select(
          "client_id"
        )
        .eq(
          "user_id",
          userData.user.id
        )
        .maybeSingle();

    if (
      clientLinkError ||
      !clientLink
    ) {
      setError(
        "Seu usuário ainda não está vinculado a uma empresa."
      );

      setLoading(false);

      return;
    }

    const clientId =
      clientLink.client_id;

    /* =========================================
       BUSCA DADOS
    ========================================= */

    const [
      clientResult,
      contractResult,
      invoiceResult,
      companyResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "clients"
          )
          .select(
            `
            id,
            name,
            trade_name,
            cnpj
            `
          )
          .eq(
            "id",
            clientId
          )
          .maybeSingle(),

        supabase
          .from(
            "contracts"
          )
          .select(
            `
            id,
            client_id,
            monthly_value,
            due_day,
            status
            `
          )
          .eq(
            "client_id",
            clientId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle(),

        supabase
          .from(
            "client_invoices"
          )
          .select(
            `
            id,
            client_id,
            description,
            amount,
            due_date,
            status,
            payment_date
            `
          )
          .eq(
            "client_id",
            clientId
          )
          .in(
            "status",
            [
              "pending",
              "overdue",
            ]
          )
          .order(
            "due_date",
            {
              ascending:
                true,
            }
          )
          .limit(1)
          .maybeSingle(),

        supabase
          .from(
            "company_settings"
          )
          .select(
            `
            company_name,
            legal_name,
            cnpj,
            pix_key,
            payment_instructions,
            email,
            phone
            `
          )
          .limit(1)
          .maybeSingle(),
      ]);

    if (
      clientResult.error
    ) {
      console.error(
        clientResult.error
      );
    }

    if (
      contractResult.error
    ) {
      console.error(
        contractResult.error
      );
    }

    if (
      invoiceResult.error
    ) {
      console.error(
        invoiceResult.error
      );
    }

    if (
      companyResult.error
    ) {
      console.error(
        companyResult.error
      );
    }

    if (
      !clientResult.data
    ) {
      setError(
        "Não foi possível carregar os dados da empresa."
      );

      setLoading(false);

      return;
    }

    setClient(
      clientResult.data
    );

    setContract(
      contractResult.data ||
        null
    );

    setInvoice(
      invoiceResult.data ||
        null
    );

    setCompany(
      companyResult.data ||
        null
    );

    setLoading(false);
  }

  function formatCurrency(
    value:
      number | null
  ) {
    return new Intl.NumberFormat(
      "pt-BR",
      {
        style:
          "currency",
        currency:
          "BRL",
      }
    ).format(
      Number(
        value || 0
      )
    );
  }

  function formatDate(
    value:
      string | null
  ) {
    if (
      !value
    ) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "pt-BR"
    ).format(
      new Date(
        `${value}T00:00:00`
      )
    );
  }

  async function copyValue(
    label:
      string,
    value:
      string | null
  ) {
    if (
      !value
    ) {
      return;
    }

    await navigator.clipboard.writeText(
      value
    );

    setCopied(
      label
    );

    window.setTimeout(
      () =>
        setCopied(
          ""
        ),
      1800
    );
  }

  return (
    <AppShell
      compactHeader
    >
      {loading ? (
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-3 text-xs text-[#8f96a3]">
            <Loader2
              size={18}
              className="animate-spin"
            />

            Carregando informações...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[20px] border border-[#5c3a3a] bg-[#352525] p-6">
          <p className="text-sm font-semibold text-[#ff9a9a]">
            {error}
          </p>
        </div>
      ) : (
        <>
          {/* CABEÇALHO */}

          <section className="mb-5 rounded-[20px] border border-[#343a44] bg-[#252a32] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#302f48] text-[#aaa5ff]">
                <Building2
                  size={18}
                />
              </div>

              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#7770ff]">
                  Minha conta
                </p>

                <h1 className="mt-1 text-xl font-semibold text-white">
                  Informações
                </h1>

                <p className="mt-1 text-[10px] text-[#7d8592]">
                  Consulte os dados da sua empresa, contrato e pagamento.
                </p>
              </div>
            </div>
          </section>

          {/* EMPRESA + CONTRATO */}

          <div className="grid gap-5 xl:grid-cols-2">
            <InfoSection
              icon={
                <Building2
                  size={17}
                />
              }
              eyebrow="Empresa"
              title="Dados cadastrais"
            >
              <InfoRow
                label="Razão social / nome"
                value={
                  client?.name ||
                  "—"
                }
              />

              <InfoRow
                label="Nome fantasia"
                value={
                  client?.trade_name ||
                  "—"
                }
              />

              <InfoRow
                label="CNPJ"
                value={
                  client?.cnpj ||
                  "—"
                }
              />
            </InfoSection>

            <InfoSection
              icon={
                <FileText
                  size={17}
                />
              }
              eyebrow="Contrato"
              title="Informações do contrato"
            >
              <InfoRow
                label="Valor mensal"
                value={
                  contract
                    ? formatCurrency(
                        contract.monthly_value
                      )
                    : "—"
                }
                strong
              />

              <InfoRow
                label="Vencimento"
                value={
                  contract?.due_day
                    ? `Todo dia ${contract.due_day}`
                    : "—"
                }
              />

              <InfoRow
                label="Status do contrato"
                value={
                  contract?.status ===
                  "active"
                    ? "Ativo"
                    : contract?.status ||
                      "—"
                }
              />
            </InfoSection>
          </div>

          {/* PAGAMENTO */}

          <section className="mt-5 overflow-hidden rounded-[20px] border border-[#343a44] bg-[#252a32]">
            <div className="border-b border-[#343a44] p-5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    invoice?.status ===
                    "overdue"
                      ? "bg-[#462525] text-[#ff8d8d]"
                      : invoice
                      ? "bg-[#493221] text-[#f0a44b]"
                      : "bg-[#17382b] text-[#5ee0a3]"
                  }`}
                >
                  {invoice?.status ===
                  "overdue" ? (
                    <AlertTriangle
                      size={17}
                    />
                  ) : invoice ? (
                    <WalletCards
                      size={17}
                    />
                  ) : (
                    <CheckCircle2
                      size={17}
                    />
                  )}
                </div>

                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#7770ff]">
                    Pagamento
                  </p>

                  <h2 className="mt-1 text-sm font-semibold text-white">
                    {invoice?.status ===
                    "overdue"
                      ? "Pagamento vencido"
                      : invoice
                      ? "Pagamento em aberto"
                      : "Nenhuma pendência"}
                  </h2>
                </div>
              </div>
            </div>

            {invoice ? (
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <SmallInfoCard
                  label="Valor"
                  value={formatCurrency(
                    invoice.amount
                  )}
                />

                <SmallInfoCard
                  label="Vencimento"
                  value={formatDate(
                    invoice.due_date
                  )}
                />

                <SmallInfoCard
                  label="Situação"
                  value={
                    invoice.status ===
                    "overdue"
                      ? "Vencido"
                      : "Em aberto"
                  }
                  danger={
                    invoice.status ===
                    "overdue"
                  }
                />
              </div>
            ) : (
              <div className="p-5">
                <div className="rounded-[14px] border border-[#2f5141] bg-[#1d3329] px-4 py-4">
                  <p className="text-[10px] font-medium text-[#6fe4aa]">
                    Seus pagamentos estão em dia.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* DADOS DA LINKO */}

          <section className="mt-5 overflow-hidden rounded-[20px] border border-[#343a44] bg-[#252a32]">
            <div className="border-b border-[#343a44] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#302f48] text-[#aaa5ff]">
                  <WalletCards
                    size={17}
                  />
                </div>

                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#7770ff]">
                    Pagamento
                  </p>

                  <h2 className="mt-1 text-sm font-semibold text-white">
                    Dados da Linko
                  </h2>

                  <p className="mt-1 text-[9px] text-[#747c89]">
                    Utilize os dados abaixo para realizar o pagamento.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <div className="space-y-3">
                <CopyRow
                  label="Empresa"
                  value={
                    company?.legal_name ||
                    company?.company_name ||
                    "Linko"
                  }
                />

                <CopyRow
                  label="CNPJ"
                  value={
                    company?.cnpj ||
                    "Não cadastrado"
                  }
                  canCopy={
                    Boolean(
                      company?.cnpj
                    )
                  }
                  copied={
                    copied ===
                    "cnpj"
                  }
                  onCopy={() =>
                    copyValue(
                      "cnpj",
                      company?.cnpj ||
                        null
                    )
                  }
                />

                <CopyRow
                  label="Chave PIX"
                  value={
                    company?.pix_key ||
                    "Não cadastrada"
                  }
                  canCopy={
                    Boolean(
                      company?.pix_key
                    )
                  }
                  copied={
                    copied ===
                    "pix"
                  }
                  onCopy={() =>
                    copyValue(
                      "pix",
                      company?.pix_key ||
                        null
                    )
                  }
                />
              </div>

              <div className="rounded-[16px] border border-[#363c46] bg-[#22262e] p-4">
                <p className="text-[8px] font-semibold uppercase tracking-[0.13em] text-[#7770ff]">
                  Instruções
                </p>

                <p className="mt-3 text-[10px] leading-5 text-[#aab1bc]">
                  {company?.payment_instructions ||
                    "Após realizar o pagamento, envie o comprovante para a Linko."}
                </p>

                {(company?.email ||
                  company?.phone) && (
                  <div className="mt-4 border-t border-[#343a44] pt-4">
                    {company?.email && (
                      <p className="text-[9px] text-[#818a97]">
                        {company.email}
                      </p>
                    )}

                    {company?.phone && (
                      <p className="mt-1 text-[9px] text-[#818a97]">
                        {company.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function InfoSection({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon:
    React.ReactNode;

  eyebrow:
    string;

  title:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-[#343a44] bg-[#252a32]">
      <div className="flex items-center gap-3 border-b border-[#343a44] p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#302f48] text-[#aaa5ff]">
          {icon}
        </div>

        <div>
          <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#7770ff]">
            {eyebrow}
          </p>

          <h2 className="mt-1 text-sm font-semibold text-white">
            {title}
          </h2>
        </div>
      </div>

      <div className="divide-y divide-[#343a44] px-5">
        {children}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label:
    string;

  value:
    string;

  strong?:
    boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-4">
      <p className="text-[9px] text-[#7d8592]">
        {label}
      </p>

      <p
        className={`max-w-[65%] text-right ${
          strong
            ? "text-[12px] font-semibold text-white"
            : "text-[10px] font-medium text-[#d1d6de]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SmallInfoCard({
  label,
  value,
  danger = false,
}: {
  label:
    string;

  value:
    string;

  danger?:
    boolean;
}) {
  return (
    <div className="rounded-[14px] border border-[#363c46] bg-[#22262e] p-4">
      <p className="text-[8px] text-[#7d8592]">
        {label}
      </p>

      <p
        className={`mt-2 text-[12px] font-semibold ${
          danger
            ? "text-[#ff8d8d]"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CopyRow({
  label,
  value,
  canCopy = false,
  copied = false,
  onCopy,
}: {
  label:
    string;

  value:
    string;

  canCopy?:
    boolean;

  copied?:
    boolean;

  onCopy?:
    () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-[#363c46] bg-[#22262e] px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[8px] text-[#747c89]">
          {label}
        </p>

        <p className="mt-1 truncate text-[10px] font-medium text-white">
          {value}
        </p>
      </div>

      {canCopy &&
        onCopy && (
          <button
            type="button"
            onClick={
              onCopy
            }
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#3d444f] bg-[#292e36] px-2.5 text-[8px] font-semibold text-[#aab1bc] transition hover:bg-[#343a44] hover:text-white"
          >
            {copied ? (
              <CheckCircle2
                size={12}
              />
            ) : (
              <Copy
                size={12}
              />
            )}

            {copied
              ? "Copiado"
              : "Copiar"}
          </button>
        )}
    </div>
  );
}