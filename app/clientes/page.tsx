"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AtSign,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  EyeOff,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  InstagramPanel,
  InstagramResultNotice,
} from "@/components/instagram-connection";
import { createClient } from "@/utils/supabase/client";

type ContractStatus =
  | "active"
  | "inactive"
  | "cancelled";

type ClientStatus = "active" | "inactive";

type Contract = {
  id: string;
  client_id: string;
  contract_value: number;
  due_day: number;
  start_date: string;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
};

type Client = {
  id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  responsible_name: string | null;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: ClientStatus;
  notes: string | null;
  created_at: string;
  contract?: Contract | null;
};

type ConfirmAction =
  | {
      type: "toggle";
      client: Client;
    }
  | {
      type: "delete";
      client: Client;
    };

const emptyClientForm = {
  name: "",
  trade_name: "",
  document: "",
  responsible_name: "",
  email: "",
  whatsapp: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  status: "active" as ClientStatus,
  notes: "",
};

const emptyContractForm = {
  contract_value: "",
  due_day: "",
  start_date: "",
  status: "active" as ContractStatus,
  notes: "",
};

const ITEMS_PER_PAGE = 10;

export default function ClientesPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [instagramClient, setInstagramClient] =
    useState<{ id: string; name: string } | null>(null);

  const [
    editingContractId,
    setEditingContractId,
  ] = useState<string | null>(null);

  const [form, setForm] = useState(emptyClientForm);
  const [contractForm, setContractForm] =
    useState(emptyContractForm);

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null);

  const [processingAction, setProcessingAction] =
    useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  async function loadClients() {
    setLoading(true);

    const {
      data: clientsData,
      error: clientsError,
    } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (clientsError) {
      console.error(clientsError);
      setMessage(
        "Não foi possível carregar os clientes."
      );
      setLoading(false);
      return;
    }

    const {
      data: contractsData,
      error: contractsError,
    } = await supabase
      .from("contracts")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (contractsError) {
      console.error(contractsError);
    }

    const clientsWithContracts: Client[] =
      (clientsData || []).map((client) => {
        const clientContracts =
          contractsData?.filter(
            (contract) =>
              contract.client_id === client.id
          ) || [];

        const activeContract =
          clientContracts.find(
            (contract) =>
              contract.status === "active"
          ) ||
          clientContracts[0] ||
          null;

        return {
          ...client,
          contract: activeContract,
        };
      });

    setClients(clientsWithContracts);
    setLoading(false);
  }

  function updateField(
    field: string,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateContractField(
    field: string,
    value: string
  ) {
    setContractForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function formatWhatsapp(value: string) {
    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("55")) {
      digits = digits.slice(2);
    }

    digits = digits.slice(0, 11);

    if (!digits) return "";

    if (digits.length <= 2) {
      return `+55 (${digits}`;
    }

    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);

    if (number.length <= 5) {
      return `+55 (${ddd}) ${number}`;
    }

    return `+55 (${ddd}) ${number.slice(
      0,
      5
    )}-${number.slice(5, 9)}`;
  }

  function formatPhone(value: string) {
    const digits = value
      .replace(/\D/g, "")
      .slice(0, 11);

    if (!digits) return "";

    if (digits.length <= 2) {
      return `(${digits}`;
    }

    const ddd = digits.slice(0, 2);
    const number = digits.slice(2);

    if (digits.length <= 10) {
      if (number.length <= 4) {
        return `(${ddd}) ${number}`;
      }

      return `(${ddd}) ${number.slice(
        0,
        4
      )}-${number.slice(4, 8)}`;
    }

    if (number.length <= 5) {
      return `(${ddd}) ${number}`;
    }

    return `(${ddd}) ${number.slice(
      0,
      5
    )}-${number.slice(5, 9)}`;
  }

  function formatCurrencyInput(value: string) {
    const digits = value.replace(/\D/g, "");

    if (!digits) return "";

    const numberValue = Number(digits) / 100;

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numberValue);
  }

  function currencyToNumber(value: string) {
    if (!value) return 0;

    return Number(
      value
        .replace("R$", "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );
  }

  function formatCurrency(
    value: number | null | undefined
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return "—";
    }

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  }

  async function handleCepChange(value: string) {
    const cleanCep = value
      .replace(/\D/g, "")
      .slice(0, 8);

    const formattedCep = cleanCep.replace(
      /^(\d{5})(\d{0,3})$/,
      (_, first, second) =>
        second ? `${first}-${second}` : first
    );

    updateField("zip_code", formattedCep);

    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`
      );

      const data = await response.json();

      if (data.erro) {
        setMessage("CEP não encontrado.");
        return;
      }

      setForm((current) => ({
        ...current,
        zip_code: data.cep || formattedCep,
        address: data.logradouro || "",
        city: data.localidade || "",
        state: data.uf || "",
      }));

      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage(
        "Não foi possível consultar o CEP."
      );
    }
  }

  function openNewClient() {
    setEditingId(null);
    setEditingContractId(null);
    setForm(emptyClientForm);
    setContractForm(emptyContractForm);
    setFormStep(1);
    setMessage("");
    setShowForm(true);
  }

  function openEditClient(client: Client) {
    setEditingId(client.id);

    setForm({
      name: client.name || "",
      trade_name: client.trade_name || "",
      document: client.document || "",
      responsible_name:
        client.responsible_name || "",
      email: client.email || "",
      whatsapp: client.whatsapp || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      zip_code: client.zip_code || "",
      status: client.status,
      notes: client.notes || "",
    });

    if (client.contract) {
      setEditingContractId(client.contract.id);

      setContractForm({
        contract_value: formatCurrency(
          client.contract.contract_value
        ),
        due_day: String(
          client.contract.due_day
        ),
        start_date:
          client.contract.start_date || "",
        status: client.contract.status,
        notes: client.contract.notes || "",
      });
    } else {
      setEditingContractId(null);
      setContractForm(emptyContractForm);
    }

    setFormStep(1);
    setMessage("");
    setShowForm(true);
  }

  function goToFinancialStep() {
    if (!form.name.trim()) {
      setMessage(
        "Informe a razão social ou nome do cliente."
      );
      return;
    }

    setMessage("");
    setFormStep(2);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (formStep === 1) {
      goToFinancialStep();
      return;
    }

    setSaving(true);
    setMessage("");

    if (!contractForm.contract_value) {
      setMessage(
        "Informe o valor do contrato."
      );
      setSaving(false);
      return;
    }

    if (!contractForm.due_day) {
      setMessage(
        "Informe o dia do vencimento."
      );
      setSaving(false);
      return;
    }

    if (!contractForm.start_date) {
      setMessage(
        "Informe a data de início do contrato."
      );
      setSaving(false);
      return;
    }

    const dueDay = Number(
      contractForm.due_day
    );

    if (dueDay < 1 || dueDay > 31) {
      setMessage(
        "O dia do vencimento deve ser entre 1 e 31."
      );
      setSaving(false);
      return;
    }

    const clientPayload = {
      name: form.name.trim(),
      trade_name:
        form.trade_name || null,
      document:
        form.document || null,
      responsible_name:
        form.responsible_name || null,
      email: form.email || null,
      whatsapp:
        form.whatsapp || null,
      phone: form.phone || null,
      address:
        form.address || null,
      city: form.city || null,
      state: form.state || null,
      zip_code:
        form.zip_code || null,
      status: form.status,
      notes: form.notes || null,
      updated_at:
        new Date().toISOString(),
    };

    let clientId = editingId;
    let createdNewClient = false;

    if (editingId) {
      const { error } = await supabase
        .from("clients")
        .update(clientPayload)
        .eq("id", editingId);

      if (error) {
        console.error(error);
        setMessage(
          "Não foi possível atualizar o cliente."
        );
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("clients")
        .insert(clientPayload)
        .select("id")
        .single();

      if (error || !data) {
        console.error(error);
        setMessage(
          "Não foi possível cadastrar o cliente."
        );
        setSaving(false);
        return;
      }

      clientId = data.id;
      createdNewClient = true;
    }

    if (!clientId) {
      setSaving(false);
      return;
    }

    const contractPayload = {
      client_id: clientId,
      contract_value: currencyToNumber(
        contractForm.contract_value
      ),
      due_day: dueDay,
      start_date:
        contractForm.start_date,
      status: contractForm.status,
      notes:
        contractForm.notes || null,
      updated_at:
        new Date().toISOString(),
    };

    if (editingContractId) {
      const { error } = await supabase
        .from("contracts")
        .update(contractPayload)
        .eq("id", editingContractId);

      if (error) {
        console.error(error);
        setMessage(
          "Cliente salvo, mas não foi possível atualizar o contrato."
        );
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("contracts")
        .insert(contractPayload);

      if (error) {
        console.error(error);

        if (createdNewClient) {
          await supabase
            .from("clients")
            .delete()
            .eq("id", clientId);
        }

        setMessage(
          "Não foi possível salvar o contrato."
        );
        setSaving(false);
        return;
      }
    }

    setMessage(
      editingId
        ? "Cliente e contrato atualizados com sucesso."
        : "Cliente e contrato cadastrados com sucesso."
    );

    setEditingId(null);
    setEditingContractId(null);
    setForm(emptyClientForm);
    setContractForm(emptyContractForm);
    setFormStep(1);
    setShowForm(false);
    setSaving(false);

    await loadClients();
  }

  function requestToggleClient(
    client: Client
  ) {
    setConfirmAction({
      type: "toggle",
      client,
    });
  }

  function requestDeleteClient(
    client: Client
  ) {
    setConfirmAction({
      type: "delete",
      client,
    });
  }

  async function confirmClientAction() {
    if (!confirmAction) return;

    setProcessingAction(true);

    const client = confirmAction.client;

    if (confirmAction.type === "toggle") {
      const newStatus: ClientStatus =
        client.status === "active"
          ? "inactive"
          : "active";

      const { error } = await supabase
        .from("clients")
        .update({
          status: newStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", client.id);

      if (error) {
        console.error(error);
        setMessage(
          "Não foi possível alterar o status do cliente."
        );
        setProcessingAction(false);
        return;
      }

      setMessage(
        newStatus === "inactive"
          ? "Cliente inativado com sucesso."
          : "Cliente reativado com sucesso."
      );
    }

    if (confirmAction.type === "delete") {
      const {
        error: contractsError,
      } = await supabase
        .from("contracts")
        .delete()
        .eq("client_id", client.id);

      if (contractsError) {
        console.error(contractsError);
        setMessage(
          "Não foi possível excluir os contratos deste cliente."
        );
        setProcessingAction(false);
        return;
      }

      const { error: clientError } =
        await supabase
          .from("clients")
          .delete()
          .eq("id", client.id);

      if (clientError) {
        console.error(clientError);
        setMessage(
          "Não foi possível excluir o cliente."
        );
        setProcessingAction(false);
        return;
      }

      setMessage(
        "Cliente excluído com sucesso."
      );
    }

    setConfirmAction(null);
    setProcessingAction(false);

    await loadClients();
  }

  const filteredClients = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();

    return clients.filter((client) => {
      return (
        client.name
          .toLowerCase()
          .includes(term) ||
        client.trade_name
          ?.toLowerCase()
          .includes(term) ||
        client.document
          ?.toLowerCase()
          .includes(term) ||
        client.email
          ?.toLowerCase()
          .includes(term)
      );
    });
  }, [clients, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredClients.length /
        ITEMS_PER_PAGE
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const startIndex =
    (safeCurrentPage - 1) *
    ITEMS_PER_PAGE;

  const paginatedClients =
    filteredClients.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );

  const firstItem =
    filteredClients.length === 0
      ? 0
      : startIndex + 1;

  const lastItem = Math.min(
    startIndex + ITEMS_PER_PAGE,
    filteredClients.length
  );

  const activeCount = clients.filter(
    (client) =>
      client.status === "active"
  ).length;

  const inactiveCount = clients.filter(
    (client) =>
      client.status === "inactive"
  ).length;

  const monthlyRevenue = clients.reduce(
    (total, client) => {
      if (
        client.status === "active" &&
        client.contract?.status === "active"
      ) {
        return (
          total +
          Number(
            client.contract.contract_value ||
              0
          )
        );
      }

      return total;
    },
    0
  );

  return (
    <AppShell
      eyebrow="Relacionamento"
      title="Clientes"
      description="Gerencie sua base de clientes, contratos e vencimentos."
      actions={
        <button
          onClick={openNewClient}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#635bff] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#716aff]"
        >
          <Plus size={17} />
          Novo cliente
        </button>
      }
    >
      <InstagramResultNotice />

      {instagramClient && (
        <InstagramPanel
          clientId={instagramClient.id}
          clientName={instagramClient.name}
          onClose={() =>
            setInstagramClient(null)
          }
        />
      )}

      {message && (
        <div className="mb-6 rounded-2xl border border-[#424958] bg-[#292e36] px-4 py-3 text-sm text-[#c5cad3]">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Users size={20} />}
          label="Total de clientes"
          value={String(clients.length)}
          helper="Base cadastrada"
        />

        <MetricCard
          icon={<UserRound size={20} />}
          label="Clientes ativos"
          value={String(activeCount)}
          helper="Em operação"
        />

        <MetricCard
          icon={<EyeOff size={20} />}
          label="Clientes inativos"
          value={String(inactiveCount)}
          helper="Fora de operação"
        />

        <MetricCard
          icon={
            <CircleDollarSign size={20} />
          }
          label="Receita contratada"
          value={formatCurrency(
            monthlyRevenue
          )}
          helper="Contratos ativos"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-[#363c46] bg-[#292e36] shadow-lg shadow-black/10">
        <div className="flex flex-col gap-4 border-b border-[#363c46] px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-xl">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8f96a3]"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar por cliente, CPF/CNPJ ou e-mail..."
              className="h-12 w-full rounded-2xl border border-[#3d444f] bg-[#23272f] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-[#6f7682] focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
            />
          </div>

          <div className="text-sm text-[#8f96a3]">
            {filteredClients.length}{" "}
            resultado
            {filteredClients.length ===
            1
              ? ""
              : "s"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#363c46] bg-[#23272f]">
                <TableHead>
                  Cliente
                </TableHead>

                <TableHead>
                  Contrato
                </TableHead>

                <TableHead>
                  Vencimento
                </TableHead>

                <TableHead>
                  WhatsApp
                </TableHead>

                <TableHead>
                  Status
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
                    colSpan={6}
                    className="px-6 py-14 text-center text-sm text-[#8f96a3]"
                  >
                    Carregando clientes...
                  </td>
                </tr>
              ) : paginatedClients.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#343a44] text-[#8f96a3]">
                      <Users size={20} />
                    </div>

                    <p className="mt-4 text-sm font-medium text-white">
                      Nenhum cliente encontrado
                    </p>

                    <p className="mt-1 text-sm text-[#8f96a3]">
                      Cadastre seu primeiro cliente.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedClients.map(
                  (client) => (
                    <tr
                      key={client.id}
                      className="border-b border-[#363c46] transition hover:bg-[#2f343d]"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#343a44] text-sm font-semibold text-[#d8dbe2]">
                            {(
                              client.trade_name ||
                              client.name
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-white">
                              {client.trade_name ||
                                client.name}
                            </p>

                            {client.trade_name && (
                              <p className="mt-1 text-xs text-[#8f96a3]">
                                {
                                  client.name
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-white">
                          {client.contract
                            ? formatCurrency(
                                client
                                  .contract
                                  .contract_value
                              )
                            : "Sem contrato"}
                        </p>

                        {client.contract && (
                          <p className="mt-1 text-xs text-[#8f96a3]">
                            {client
                              .contract
                              .status ===
                            "active"
                              ? "Contrato ativo"
                              : client
                                  .contract
                                  .status ===
                                "inactive"
                              ? "Contrato inativo"
                              : "Contrato cancelado"}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-[#c5cad3]">
                          <CalendarDays
                            size={16}
                            className="text-[#8f96a3]"
                          />

                          {client.contract
                            ? `Dia ${client.contract.due_day}`
                            : "—"}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-[#c5cad3]">
                          <Phone
                            size={16}
                            className="text-[#8f96a3]"
                          />

                          {client.whatsapp ||
                            "—"}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            client.status ===
                            "active"
                              ? "bg-[#17382b] text-[#5ee0a3]"
                              : "bg-[#343a44] text-[#a0a7b3]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              client.status ===
                              "active"
                                ? "bg-[#2ac97d]"
                                : "bg-[#6f7682]"
                            }`}
                          />

                          {client.status ===
                          "active"
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title="Instagram"
                            aria-label={`Instagram de ${client.name}`}
                            onClick={() =>
                              setInstagramClient({
                                id: client.id,
                                name: client.name,
                              })
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#23272f] text-[#a0a7b3] hover:text-white"
                          >
                            <AtSign
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            title="Editar cliente"
                            onClick={() =>
                              openEditClient(
                                client
                              )
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#23272f] text-[#a0a7b3] transition hover:border-[#555e6b] hover:bg-[#343a44] hover:text-white"
                          >
                            <Pencil
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            title={
                              client.status ===
                              "active"
                                ? "Inativar cliente"
                                : "Reativar cliente"
                            }
                            onClick={() =>
                              requestToggleClient(
                                client
                              )
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#23272f] text-[#a0a7b3] transition hover:border-[#555e6b] hover:bg-[#343a44] hover:text-white"
                          >
                            {client.status ===
                            "active" ? (
                              <Eye
                                size={17}
                              />
                            ) : (
                              <EyeOff
                                size={17}
                              />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Excluir cliente"
                            onClick={() =>
                              requestDeleteClient(
                                client
                              )
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#5a3434] bg-[#352323] text-[#ff8d8d] transition hover:border-[#7a4242] hover:bg-[#462525] hover:text-[#ffb0b0]"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-[#363c46] bg-[#23272f] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#8f96a3]">
            Mostrando{" "}
            <span className="font-semibold text-[#c5cad3]">
              {firstItem}
            </span>{" "}
            a{" "}
            <span className="font-semibold text-[#c5cad3]">
              {lastItem}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-[#c5cad3]">
              {
                filteredClients.length
              }
            </span>{" "}
            clientes
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={
                safeCurrentPage === 1
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      1,
                      page - 1
                    )
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#c5cad3] transition hover:bg-[#343a44] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft
                size={17}
              />
            </button>

            <div className="flex h-10 min-w-24 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] px-3 text-xs font-semibold text-[#c5cad3]">
              {safeCurrentPage} /{" "}
              {totalPages}
            </div>

            <button
              type="button"
              disabled={
                safeCurrentPage ===
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#c5cad3] transition hover:bg-[#343a44] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight
                size={17}
              />
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-[#363c46] bg-[#252a32] shadow-2xl shadow-black/50">
            <div className="border-b border-[#363c46] px-7 py-6 md:px-9">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7c74ff]">
                    {editingId
                      ? "Editar cadastro"
                      : "Novo cadastro"}
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    {editingId
                      ? "Editar cliente"
                      : "Novo cliente"}
                  </h2>

                  <p className="mt-1 text-sm text-[#8f96a3]">
                    Preencha os dados em duas etapas rápidas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="rounded-xl border border-[#3d444f] bg-[#2b3038] px-4 py-2 text-sm font-medium text-[#c5cad3] transition hover:bg-[#343a44]"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <StepCard
                  number={1}
                  active={formStep === 1}
                  completed={formStep > 1}
                  title="Dados do cliente"
                  subtitle="Cadastro e contato"
                />

                <StepCard
                  number={2}
                  active={formStep === 2}
                  completed={false}
                  title="Financeiro"
                  subtitle="Dados do contrato"
                />
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-7 py-7 md:px-9">
                {formStep === 1 && (
                  <div className="space-y-7">
                    <FormGroup
                      title="Dados principais"
                      description="Identificação e responsável pelo cliente."
                    >
                      <div className="grid gap-5 md:grid-cols-2">
                        <Input
                          label="Razão social / Nome *"
                          value={form.name}
                          onChange={(value) =>
                            updateField(
                              "name",
                              value
                            )
                          }
                          required
                        />

                        <Input
                          label="Nome fantasia"
                          value={
                            form.trade_name
                          }
                          onChange={(value) =>
                            updateField(
                              "trade_name",
                              value
                            )
                          }
                        />

                        <Input
                          label="CPF / CNPJ"
                          value={
                            form.document
                          }
                          onChange={(value) =>
                            updateField(
                              "document",
                              value
                            )
                          }
                        />

                        <Input
                          label="Responsável"
                          value={
                            form.responsible_name
                          }
                          onChange={(value) =>
                            updateField(
                              "responsible_name",
                              value
                            )
                          }
                        />
                      </div>
                    </FormGroup>

                    <FormGroup
                      title="Contato"
                      description="Canais de contato com o cliente."
                    >
                      <div className="grid gap-5 md:grid-cols-3">
                        <Input
                          icon={
                            <Mail
                              size={16}
                            />
                          }
                          label="E-mail"
                          type="email"
                          value={
                            form.email
                          }
                          onChange={(value) =>
                            updateField(
                              "email",
                              value
                            )
                          }
                        />

                        <Input
                          icon={
                            <Phone
                              size={16}
                            />
                          }
                          label="WhatsApp"
                          value={
                            form.whatsapp
                          }
                          onChange={(value) =>
                            updateField(
                              "whatsapp",
                              formatWhatsapp(
                                value
                              )
                            )
                          }
                          placeholder="+55 (31) 99999-9999"
                        />

                        <Input
                          icon={
                            <Phone
                              size={16}
                            />
                          }
                          label="Telefone"
                          value={
                            form.phone
                          }
                          onChange={(value) =>
                            updateField(
                              "phone",
                              formatPhone(
                                value
                              )
                            )
                          }
                          placeholder="(31) 3333-3333"
                        />
                      </div>
                    </FormGroup>

                    <FormGroup
                      title="Endereço"
                      description="Informe o CEP e completamos os dados automaticamente."
                    >
                      <div className="grid gap-5 md:grid-cols-4">
                        <Input
                          icon={
                            <MapPin
                              size={16}
                            />
                          }
                          label="CEP"
                          value={
                            form.zip_code
                          }
                          onChange={
                            handleCepChange
                          }
                          placeholder="00000-000"
                        />

                        <div className="md:col-span-3">
                          <Input
                            icon={
                              <MapPin
                                size={16}
                              />
                            }
                            label="Endereço"
                            value={
                              form.address
                            }
                            onChange={(value) =>
                              updateField(
                                "address",
                                value
                              )
                            }
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Input
                            label="Cidade"
                            value={
                              form.city
                            }
                            onChange={(value) =>
                              updateField(
                                "city",
                                value
                              )
                            }
                          />
                        </div>

                        <Input
                          label="Estado"
                          value={
                            form.state
                          }
                          onChange={(value) =>
                            updateField(
                              "state",
                              value
                            )
                          }
                        />

                        <SelectField
                          label="Status"
                          value={
                            form.status
                          }
                          onChange={(value) =>
                            setForm(
                              (current) => ({
                                ...current,
                                status:
                                  value as ClientStatus,
                              })
                            )
                          }
                          options={[
                            {
                              value:
                                "active",
                              label:
                                "Ativo",
                            },
                            {
                              value:
                                "inactive",
                              label:
                                "Inativo",
                            },
                          ]}
                        />
                      </div>
                    </FormGroup>

                    <FormGroup
                      title="Observações"
                      description="Informações internas sobre o cliente."
                    >
                      <TextareaField
                        value={form.notes}
                        onChange={(value) =>
                          updateField(
                            "notes",
                            value
                          )
                        }
                        placeholder="Adicione observações, detalhes comerciais ou informações importantes..."
                      />
                    </FormGroup>
                  </div>
                )}

                {formStep === 2 && (
                  <div className="space-y-7">
                    <div className="rounded-[22px] border border-[#3b414b] bg-[#292e36] p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#343a44] text-[#9ba1ff]">
                          <CircleDollarSign
                            size={21}
                          />
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7c74ff]">
                            Financeiro
                          </p>

                          <h3 className="mt-1 text-lg font-semibold text-white">
                            Dados do contrato
                          </h3>

                          <p className="mt-1 text-sm text-[#8f96a3]">
                            Defina valor, vencimento e vigência do contrato.
                          </p>
                        </div>
                      </div>
                    </div>

                    <FormGroup
                      title="Valores e vencimento"
                      description="Informações principais do contrato."
                    >
                      <div className="grid gap-5 md:grid-cols-2">
                        <Input
                          icon={
                            <CircleDollarSign
                              size={16}
                            />
                          }
                          label="Valor mensal do contrato *"
                          value={
                            contractForm.contract_value
                          }
                          onChange={(value) =>
                            updateContractField(
                              "contract_value",
                              formatCurrencyInput(
                                value
                              )
                            )
                          }
                          placeholder="R$ 0,00"
                          required
                        />

                        <Input
                          icon={
                            <CalendarDays
                              size={16}
                            />
                          }
                          label="Dia do vencimento *"
                          value={
                            contractForm.due_day
                          }
                          onChange={(value) =>
                            updateContractField(
                              "due_day",
                              value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                                .slice(
                                  0,
                                  2
                                )
                            )
                          }
                          placeholder="Ex.: 10"
                          required
                        />

                        <Input
                          icon={
                            <CalendarDays
                              size={16}
                            />
                          }
                          label="Data de início *"
                          type="date"
                          value={
                            contractForm.start_date
                          }
                          onChange={(value) =>
                            updateContractField(
                              "start_date",
                              value
                            )
                          }
                          required
                        />

                        <SelectField
                          label="Status do contrato"
                          value={
                            contractForm.status
                          }
                          onChange={(value) =>
                            setContractForm(
                              (current) => ({
                                ...current,
                                status:
                                  value as ContractStatus,
                              })
                            )
                          }
                          options={[
                            {
                              value:
                                "active",
                              label:
                                "Ativo",
                            },
                            {
                              value:
                                "inactive",
                              label:
                                "Inativo",
                            },
                            {
                              value:
                                "cancelled",
                              label:
                                "Cancelado",
                            },
                          ]}
                        />
                      </div>
                    </FormGroup>

                    <FormGroup
                      title="Observações do contrato"
                      description="Informações financeiras ou comerciais internas."
                    >
                      <TextareaField
                        value={
                          contractForm.notes
                        }
                        onChange={(value) =>
                          updateContractField(
                            "notes",
                            value
                          )
                        }
                        placeholder="Ex.: reajuste anual, condição comercial, forma de cobrança..."
                      />
                    </FormGroup>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#363c46] bg-[#23272f] px-7 py-4 md:px-9">
                <div className="text-xs text-[#8f96a3]">
                  Etapa {formStep} de 2
                </div>

                <div className="flex items-center gap-3">
                  {formStep === 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setShowForm(
                            false
                          )
                        }
                        className="rounded-2xl border border-[#3d444f] bg-[#292e36] px-5 py-3 text-sm font-semibold text-[#c5cad3] transition hover:bg-[#343a44]"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={
                          goToFinancialStep
                        }
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#635bff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#716aff]"
                      >
                        Próximo
                        <ChevronRight
                          size={17}
                        />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setFormStep(1)
                        }
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#3d444f] bg-[#292e36] px-5 py-3 text-sm font-semibold text-[#c5cad3] transition hover:bg-[#343a44]"
                      >
                        <ChevronLeft
                          size={17}
                        />
                        Voltar
                      </button>

                      <button
                        disabled={saving}
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#635bff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#716aff] disabled:opacity-50"
                      >
                        <Check
                          size={17}
                        />

                        {saving
                          ? "Salvando..."
                          : editingId
                          ? "Salvar alterações"
                          : "Salvar cliente"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] border border-[#363c46] bg-[#292e36] p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  confirmAction.type ===
                  "delete"
                    ? "bg-[#462525] text-[#ff8d8d]"
                    : confirmAction
                        .client
                        .status ===
                      "active"
                    ? "bg-[#3d3520] text-[#f3c969]"
                    : "bg-[#17382b] text-[#5ee0a3]"
                }`}
              >
                {confirmAction.type ===
                "delete" ? (
                  <Trash2
                    size={22}
                  />
                ) : confirmAction
                    .client
                    .status ===
                  "active" ? (
                  <EyeOff
                    size={22}
                  />
                ) : (
                  <Eye size={22} />
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c74ff]">
                  Confirmação
                </p>

                <h3 className="mt-1 text-xl font-semibold text-white">
                  {confirmAction.type ===
                  "delete"
                    ? "Excluir este cliente?"
                    : confirmAction
                        .client
                        .status ===
                      "active"
                    ? "Inativar este cliente?"
                    : "Reativar este cliente?"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#8f96a3]">
                  {confirmAction.type ===
                  "delete"
                    ? "O cliente e os contratos vinculados a ele serão removidos."
                    : confirmAction
                        .client
                        .status ===
                      "active"
                    ? "O cliente continuará cadastrado, mas ficará como inativo."
                    : "O cliente voltará a aparecer como ativo no sistema."}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#363c46] bg-[#23272f] p-4">
              <p className="text-xs text-[#8f96a3]">
                Cliente
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {confirmAction.client
                  .trade_name ||
                  confirmAction.client
                    .name}
              </p>

              {confirmAction.client
                .contract && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[#8f96a3]">
                    Contrato
                  </span>

                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(
                      confirmAction
                        .client
                        .contract
                        .contract_value
                    )}
                  </span>
                </div>
              )}
            </div>

            {confirmAction.type ===
              "delete" && (
              <div className="mt-4 rounded-2xl border border-[#5a3434] bg-[#352323] p-4">
                <p className="text-xs font-semibold text-[#ff9a9a]">
                  Atenção
                </p>

                <p className="mt-1 text-xs leading-5 text-[#d69a9a]">
                  A exclusão é definitiva. Para apenas retirar o cliente da operação, prefira inativá-lo.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={
                  processingAction
                }
                onClick={() =>
                  setConfirmAction(null)
                }
                className="rounded-2xl border border-[#3d444f] bg-[#23272f] px-5 py-3 text-sm font-semibold text-[#c5cad3] transition hover:bg-[#343a44] disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  processingAction
                }
                onClick={
                  confirmClientAction
                }
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                  confirmAction.type ===
                  "delete"
                    ? "bg-[#d95757] text-white hover:bg-[#e46666]"
                    : confirmAction
                        .client
                        .status ===
                      "active"
                    ? "bg-[#e6b84f] text-[#2a2416] hover:bg-[#f0c861]"
                    : "bg-[#2ac97d] text-[#102019] hover:bg-[#37d989]"
                }`}
              >
                {processingAction
                  ? "Processando..."
                  : confirmAction.type ===
                    "delete"
                  ? "Excluir cliente"
                  : confirmAction
                      .client
                      .status ===
                    "active"
                  ? "Inativar cliente"
                  : "Reativar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StepCard({
  number,
  active,
  completed,
  title,
  subtitle,
}: {
  number: number;
  active: boolean;
  completed: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
        active
          ? "border-[#635bff] bg-[#635bff]/10"
          : completed
          ? "border-[#315743] bg-[#17382b]/60"
          : "border-[#3d444f] bg-[#292e36]"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
          active
            ? "bg-[#635bff] text-white"
            : completed
            ? "bg-[#2ac97d] text-[#102019]"
            : "bg-[#343a44] text-[#8f96a3]"
        }`}
      >
        {completed ? (
          <Check size={16} />
        ) : (
          number
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-white">
          {title}
        </p>

        <p className="mt-0.5 text-[10px] text-[#8f96a3]">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function FormGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">
          {title}
        </h3>

        <p className="mt-1 text-xs text-[#8f96a3]">
          {description}
        </p>
      </div>

      <div className="rounded-[20px] border border-[#363c46] bg-[#292e36] p-5">
        {children}
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#363c46] bg-[#292e36] p-5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-[#464e5a]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#8f96a3]">
            {label}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            {value}
          </p>

          <p className="mt-2 text-xs text-[#6f7682]">
            {helper}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#343a44] text-[#9ba1ff]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function TableHead({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f96a3] ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-[#c5cad3]">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8f96a3]">
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className={`h-11 w-full rounded-xl border border-[#444b56] bg-[#23272f] pr-4 text-sm text-white outline-none transition placeholder:text-[#6f7682] focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10 ${
            icon
              ? "pl-11"
              : "pl-4"
          }`}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-[#c5cad3]">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="h-11 w-full rounded-xl border border-[#444b56] bg-[#23272f] px-4 text-sm text-white outline-none transition focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
      >
        {options.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          )
        )}
      </select>
    </div>
  );
}

function TextareaField({
  value,
  onChange,
  placeholder = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) =>
        onChange(
          event.target.value
        )
      }
      placeholder={placeholder}
      rows={4}
      className="w-full resize-none rounded-xl border border-[#444b56] bg-[#23272f] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f7682] focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
    />
  );
}