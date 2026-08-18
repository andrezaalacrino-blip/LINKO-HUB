"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
  WalletCards,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/client";

type PayableStatus = "pending" | "paid" | "overdue";

type Payable = {
  id: string;
  supplier: string;
  description: string;
  category: string | null;
  amount: number;
  due_date: string;
  status: PayableStatus;
  payment_date: string | null;
  payment_method: string | null;
  recurring: boolean;
  recurrence_group_id: string | null;
  recurrence_months: number | null;
  notes: string | null;
  created_at: string;
};

type ConfirmAction =
  | {
      type: "pay" | "reopen" | "delete";
      account: Payable;
    }
  | {
      type: "deleteSelected";
    };

const emptyForm = {
  supplier: "",
  description: "",
  category: "",
  amount: "",
  due_date: "",
  payment_method: "",
  recurring: false,
  recurrence_months: "12",
  notes: "",
};

const ITEMS_PER_PAGE = 10;

export default function ContasPagarPage() {
  const supabase = createClient();

  const [accounts, setAccounts] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending" | "paid" | "overdue"
  >("all");

  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null);

  const [processingAction, setProcessingAction] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, filter]);

  async function loadAccounts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("accounts_payable")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Não foi possível carregar as contas.");
      setLoading(false);
      return;
    }

    const normalized = (data || []).map((account) => ({
      ...account,
      status: getEffectiveStatus(account),
    }));

    setAccounts(normalized);
    setLoading(false);
  }

  function getEffectiveStatus(account: Payable): PayableStatus {
    if (account.status === "paid") {
      return "paid";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(`${account.due_date}T00:00:00`);

    if (due < today) {
      return "overdue";
    }

    return "pending";
  }

  function updateField(field: string, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("pt-BR").format(
      new Date(`${value}T00:00:00`)
    );
  }

  function getNextMonthlyDate(baseDate: string, offset: number) {
    const [year, month, day] = baseDate.split("-").map(Number);

    const targetMonthIndex = month - 1 + offset;
    const targetYear =
      year + Math.floor(targetMonthIndex / 12);

    const normalizedMonth =
      ((targetMonthIndex % 12) + 12) % 12;

    const lastDayOfTargetMonth = new Date(
      targetYear,
      normalizedMonth + 1,
      0
    ).getDate();

    const safeDay = Math.min(day, lastDayOfTargetMonth);

    const monthString = String(normalizedMonth + 1).padStart(
      2,
      "0"
    );

    const dayString = String(safeDay).padStart(2, "0");

    return `${targetYear}-${monthString}-${dayString}`;
  }

  function openNewAccount() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setShowForm(true);
  }

  function openEditAccount(account: Payable) {
    setEditingId(account.id);

    setForm({
      supplier: account.supplier || "",
      description: account.description || "",
      category: account.category || "",
      amount: formatCurrency(account.amount),
      due_date: account.due_date || "",
      payment_method: account.payment_method || "",
      recurring: account.recurring || false,
      recurrence_months: String(account.recurrence_months || 12),
      notes: account.notes || "",
    });

    setMessage("");
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    const amount = currencyToNumber(form.amount);

    if (amount <= 0) {
      setMessage("Informe um valor maior que zero.");
      setSaving(false);
      return;
    }

    if (!form.due_date) {
      setMessage("Informe a data de vencimento.");
      setSaving(false);
      return;
    }

    const basePayload = {
      supplier: form.supplier,
      description: form.description,
      category: form.category || null,
      amount,
      due_date: form.due_date,
      payment_method: form.payment_method || null,
      recurring: form.recurring,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("accounts_payable")
        .update({
          ...basePayload,
          recurrence_months: form.recurring
            ? Number(form.recurrence_months || 12)
            : null,
        })
        .eq("id", editingId);

      if (error) {
        console.error(error);
        setMessage("Não foi possível atualizar a conta.");
        setSaving(false);
        return;
      }

      setMessage("Conta atualizada com sucesso.");
    } else {
      if (form.recurring) {
        const months = Math.max(
          1,
          Math.min(60, Number(form.recurrence_months || 12))
        );

        const recurrenceGroupId = crypto.randomUUID();

        const entries = Array.from({
          length: months,
        }).map((_, index) => ({
          supplier: form.supplier,
          description: form.description,
          category: form.category || null,
          amount,
          due_date: getNextMonthlyDate(
            form.due_date,
            index
          ),
          payment_method:
            form.payment_method || null,
          recurring: true,
          recurrence_group_id: recurrenceGroupId,
          recurrence_months: months,
          status: "pending",
          notes: form.notes || null,
        }));

        const { error } = await supabase
          .from("accounts_payable")
          .insert(entries);

        if (error) {
          console.error(error);
          setMessage(
            "Não foi possível gerar as contas recorrentes."
          );
          setSaving(false);
          return;
        }

        setMessage(
          `${months} contas recorrentes foram geradas com sucesso.`
        );
      } else {
        const { error } = await supabase
          .from("accounts_payable")
          .insert({
            ...basePayload,
            recurring: false,
            recurrence_group_id: null,
            recurrence_months: null,
            status: "pending",
          });

        if (error) {
          console.error(error);
          setMessage(
            "Não foi possível cadastrar a conta."
          );
          setSaving(false);
          return;
        }

        setMessage("Conta cadastrada com sucesso.");
      }
    }

    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);

    await loadAccounts();
  }

  function markAsPaid(account: Payable) {
    setConfirmAction({
      type: "pay",
      account,
    });
  }

  function reopenAccount(account: Payable) {
    setConfirmAction({
      type: "reopen",
      account,
    });
  }

  function deleteAccount(account: Payable) {
    setConfirmAction({
      type: "delete",
      account,
    });
  }

  function deleteSelectedAccounts() {
    if (selectedIds.length === 0) return;

    setConfirmAction({
      type: "deleteSelected",
    });
  }

  async function confirmAccountAction() {
    if (!confirmAction) return;

    setProcessingAction(true);

    if (confirmAction.type === "deleteSelected") {
      const { error } = await supabase
        .from("accounts_payable")
        .delete()
        .in("id", selectedIds);

      if (error) {
        console.error(error);
        setMessage(
          "Não foi possível excluir as contas selecionadas."
        );
        setProcessingAction(false);
        return;
      }

      setMessage(
        `${selectedIds.length} conta${
          selectedIds.length === 1 ? "" : "s"
        } excluída${
          selectedIds.length === 1 ? "" : "s"
        } com sucesso.`
      );

      setSelectedIds([]);
      setConfirmAction(null);
      setProcessingAction(false);

      await loadAccounts();

      return;
    }

    const account = confirmAction.account;

    if (confirmAction.type === "pay") {
      const today = new Date().toISOString().slice(0, 10);

      const { error } = await supabase
        .from("accounts_payable")
        .update({
          status: "paid",
          payment_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (error) {
        console.error(error);
        setMessage(
          "Não foi possível marcar a conta como paga."
        );
        setProcessingAction(false);
        return;
      }

      setMessage("Conta marcada como paga.");
    }

    if (confirmAction.type === "reopen") {
      const { error } = await supabase
        .from("accounts_payable")
        .update({
          status: "pending",
          payment_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (error) {
        console.error(error);
        setMessage(
          "Não foi possível reabrir a conta."
        );
        setProcessingAction(false);
        return;
      }

      setMessage("Conta reaberta com sucesso.");
    }

    if (confirmAction.type === "delete") {
      const { error } = await supabase
        .from("accounts_payable")
        .delete()
        .eq("id", account.id);

      if (error) {
        console.error(error);
        setMessage(
          "Não foi possível excluir a conta."
        );
        setProcessingAction(false);
        return;
      }

      setSelectedIds((current) =>
        current.filter((id) => id !== account.id)
      );

      setMessage("Conta excluída com sucesso.");
    }

    setConfirmAction(null);
    setProcessingAction(false);

    await loadAccounts();
  }

  const filteredAccounts = useMemo(() => {
    const term = search.toLowerCase();

    return accounts.filter((account) => {
      const matchesSearch =
        account.supplier.toLowerCase().includes(term) ||
        account.description.toLowerCase().includes(term) ||
        account.category?.toLowerCase().includes(term);

      const matchesFilter =
        filter === "all" || account.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [accounts, search, filter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const startIndex =
    (safeCurrentPage - 1) * ITEMS_PER_PAGE;

  const paginatedAccounts = filteredAccounts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const firstItem =
    filteredAccounts.length === 0 ? 0 : startIndex + 1;

  const lastItem = Math.min(
    startIndex + ITEMS_PER_PAGE,
    filteredAccounts.length
  );

  const pageIds = paginatedAccounts.map(
    (account) => account.id
  );

  const allPageSelected =
    pageIds.length > 0 &&
    pageIds.every((id) => selectedIds.includes(id));

  const somePageSelected =
    pageIds.some((id) => selectedIds.includes(id)) &&
    !allPageSelected;

  function toggleAccountSelection(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter(
          (selectedId) => selectedId !== id
        );
      }

      return [...current, id];
    });
  }

  function toggleSelectPage() {
    if (allPageSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !pageIds.includes(id))
      );

      return;
    }

    setSelectedIds((current) => {
      const next = [...current];

      pageIds.forEach((id) => {
        if (!next.includes(id)) {
          next.push(id);
        }
      });

      return next;
    });
  }

  const totalMonth = accounts.reduce(
    (total, account) =>
      total + Number(account.amount || 0),
    0
  );

  const pendingTotal = accounts
    .filter(
      (account) => account.status === "pending"
    )
    .reduce(
      (total, account) =>
        total + Number(account.amount || 0),
      0
    );

  const paidTotal = accounts
    .filter((account) => account.status === "paid")
    .reduce(
      (total, account) =>
        total + Number(account.amount || 0),
      0
    );

  const overdueTotal = accounts
    .filter(
      (account) => account.status === "overdue"
    )
    .reduce(
      (total, account) =>
        total + Number(account.amount || 0),
      0
    );

  return (
    <AppShell
      eyebrow="Financeiro"
      title="Contas a pagar"
      description="Controle despesas, vencimentos e pagamentos da Linko."
      actions={
        <button
          onClick={openNewAccount}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#635bff] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#716aff]"
        >
          <Plus size={17} />
          Nova conta
        </button>
      }
    >
      {message && (
        <div className="mb-6 rounded-2xl border border-[#424958] bg-[#292e36] px-4 py-3 text-sm text-[#c5cad3]">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<WalletCards size={20} />}
          label="Total cadastrado"
          value={formatCurrency(totalMonth)}
          helper="Todas as contas"
        />

        <MetricCard
          icon={<Clock3 size={20} />}
          label="Pendente"
          value={formatCurrency(pendingTotal)}
          helper="Aguardando pagamento"
        />

        <MetricCard
          icon={<CheckCircle2 size={20} />}
          label="Pago"
          value={formatCurrency(paidTotal)}
          helper="Pagamentos realizados"
        />

        <MetricCard
          icon={<CircleDollarSign size={20} />}
          label="Vencido"
          value={formatCurrency(overdueTotal)}
          helper="Contas em atraso"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-[#363c46] bg-[#292e36] shadow-lg shadow-black/10">
        <div className="flex flex-col gap-4 border-b border-[#363c46] px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-xl">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8f96a3]"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar fornecedor, descrição ou categoria..."
              className="h-12 w-full rounded-2xl border border-[#3d444f] bg-[#23272f] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-[#6f7682] focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              Todas
            </FilterButton>

            <FilterButton
              active={filter === "pending"}
              onClick={() => setFilter("pending")}
            >
              Pendentes
            </FilterButton>

            <FilterButton
              active={filter === "paid"}
              onClick={() => setFilter("paid")}
            >
              Pagas
            </FilterButton>

            <FilterButton
              active={filter === "overdue"}
              onClick={() => setFilter("overdue")}
            >
              Vencidas
            </FilterButton>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-[#363c46] bg-[#262b33] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#635bff] px-2 text-xs font-semibold text-white">
                {selectedIds.length}
              </div>

              <p className="text-sm font-medium text-white">
                {selectedIds.length === 1
                  ? "1 conta selecionada"
                  : `${selectedIds.length} contas selecionadas`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="inline-flex items-center gap-2 rounded-xl border border-[#3d444f] bg-[#292e36] px-3.5 py-2 text-xs font-semibold text-[#c5cad3] transition hover:bg-[#343a44]"
              >
                <X size={15} />
                Limpar seleção
              </button>

              <button
                type="button"
                onClick={deleteSelectedAccounts}
                className="inline-flex items-center gap-2 rounded-xl border border-[#6b3737] bg-[#462525] px-3.5 py-2 text-xs font-semibold text-[#ff9a9a] transition hover:bg-[#573030]"
              >
                <Trash2 size={15} />
                Excluir selecionadas
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#363c46] bg-[#23272f]">
                <th className="w-14 px-5 py-4">
                  <Checkbox
                    checked={allPageSelected}
                    indeterminate={somePageSelected}
                    onChange={toggleSelectPage}
                    label="Selecionar todas as contas desta página"
                  />
                </th>

                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">
                  Ações
                </TableHead>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-14 text-center text-sm text-[#8f96a3]"
                  >
                    Carregando contas...
                  </td>
                </tr>
              ) : paginatedAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-16 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#343a44] text-[#8f96a3]">
                      <WalletCards size={20} />
                    </div>

                    <p className="mt-4 text-sm font-medium text-white">
                      Nenhuma conta encontrada
                    </p>

                    <p className="mt-1 text-sm text-[#8f96a3]">
                      Cadastre sua primeira despesa.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((account) => {
                  const selected = selectedIds.includes(
                    account.id
                  );

                  return (
                    <tr
                      key={account.id}
                      className={`border-b border-[#363c46] transition ${
                        selected
                          ? "bg-[#302f48]"
                          : "hover:bg-[#2f343d]"
                      }`}
                    >
                      <td className="w-14 px-5 py-5">
                        <Checkbox
                          checked={selected}
                          onChange={() =>
                            toggleAccountSelection(
                              account.id
                            )
                          }
                          label={`Selecionar ${account.description}`}
                        />
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-white">
                          {account.supplier}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm text-[#c5cad3]">
                          {account.description}
                        </p>

                        {account.recurring && (
                          <p className="mt-1 text-xs text-[#8f96a3]">
                            Recorrente
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-5 text-sm text-[#c5cad3]">
                        {account.category || "—"}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-[#c5cad3]">
                          <CalendarDays
                            size={16}
                            className="text-[#8f96a3]"
                          />

                          {formatDate(account.due_date)}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(account.amount)}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge
                          status={account.status}
                        />
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            title="Editar conta"
                            onClick={() =>
                              openEditAccount(account)
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#23272f] text-[#a0a7b3] transition hover:border-[#555e6b] hover:bg-[#343a44] hover:text-white"
                          >
                            <Pencil size={16} />
                          </button>

                          {account.status === "paid" ? (
                            <button
                              type="button"
                              title="Reabrir conta"
                              onClick={() =>
                                reopenAccount(account)
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#23272f] text-[#a0a7b3] transition hover:border-[#555e6b] hover:bg-[#343a44] hover:text-white"
                            >
                              <Undo2 size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Marcar como paga"
                              onClick={() =>
                                markAsPaid(account)
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#315743] bg-[#17382b] text-[#5ee0a3] transition hover:bg-[#1d4937]"
                            >
                              <CheckCircle2 size={17} />
                            </button>
                          )}

                          <button
                            type="button"
                            title="Excluir conta"
                            onClick={() =>
                              deleteAccount(account)
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#5a3434] bg-[#352323] text-[#ff8d8d] transition hover:border-[#7a4242] hover:bg-[#462525] hover:text-[#ffb0b0]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
              {filteredAccounts.length}
            </span>{" "}
            contas
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => {
                setCurrentPage((page) =>
                  Math.max(1, page - 1)
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#c5cad3] transition hover:bg-[#343a44] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>

            <div className="flex h-10 min-w-24 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] px-3 text-xs font-semibold text-[#c5cad3]">
              {safeCurrentPage} / {totalPages}
            </div>

            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => {
                setCurrentPage((page) =>
                  Math.min(totalPages, page + 1)
                );
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#c5cad3] transition hover:bg-[#343a44] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#363c46] bg-[#23272f] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-[#363c46] px-6 py-5 md:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c74ff]">
                  Financeiro
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white">
                  {editingId
                    ? "Editar conta"
                    : "Nova conta a pagar"}
                </h2>

                <p className="mt-1 text-sm text-[#8f96a3]">
                  Cadastre uma despesa da operação.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[#3d444f] bg-[#292e36] px-4 py-2 text-sm font-medium text-[#c5cad3] transition hover:bg-[#343a44]"
              >
                Fechar
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(94vh-92px)] overflow-y-auto"
            >
              <div className="p-6 md:p-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <Input
                    label="Fornecedor *"
                    value={form.supplier}
                    onChange={(value) =>
                      updateField("supplier", value)
                    }
                    required
                  />

                  <Input
                    label="Categoria"
                    value={form.category}
                    onChange={(value) =>
                      updateField("category", value)
                    }
                    placeholder="Ex.: Software"
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Descrição *"
                      value={form.description}
                      onChange={(value) =>
                        updateField("description", value)
                      }
                      placeholder="Ex.: Assinatura mensal"
                      required
                    />
                  </div>

                  <Input
                    label="Valor *"
                    value={form.amount}
                    onChange={(value) =>
                      updateField(
                        "amount",
                        formatCurrencyInput(value)
                      )
                    }
                    placeholder="R$ 0,00"
                    required
                  />

                  <Input
                    label="Data de vencimento *"
                    type="date"
                    value={form.due_date}
                    onChange={(value) =>
                      updateField("due_date", value)
                    }
                    required
                  />

                  <SelectField
                    label="Forma de pagamento"
                    value={form.payment_method}
                    onChange={(value) =>
                      updateField("payment_method", value)
                    }
                    options={[
                      {
                        value: "",
                        label: "Selecione",
                      },
                      {
                        value: "pix",
                        label: "PIX",
                      },
                      {
                        value: "credit_card",
                        label: "Cartão de crédito",
                      },
                      {
                        value: "debit_card",
                        label: "Cartão de débito",
                      },
                      {
                        value: "bank_slip",
                        label: "Boleto",
                      },
                      {
                        value: "bank_transfer",
                        label: "Transferência",
                      },
                      {
                        value: "cash",
                        label: "Dinheiro",
                      },
                    ]}
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#c5cad3]">
                      Recorrência
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "recurring",
                          !form.recurring
                        )
                      }
                      className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-sm transition ${
                        form.recurring
                          ? "border-[#635bff] bg-[#635bff]/10 text-white"
                          : "border-[#3d444f] bg-[#23272f] text-[#c5cad3]"
                      }`}
                    >
                      <span>
                        {form.recurring
                          ? "Conta recorrente"
                          : "Conta não recorrente"}
                      </span>

                      <span
                        className={`relative h-6 w-11 rounded-full transition ${
                          form.recurring
                            ? "bg-[#635bff]"
                            : "bg-[#3d444f]"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                            form.recurring
                              ? "left-6"
                              : "left-1"
                          }`}
                        />
                      </span>
                    </button>
                  </div>

                  {form.recurring && (
                    <Input
                      label="Gerar por quantos meses?"
                      value={form.recurrence_months}
                      onChange={(value) =>
                        updateField(
                          "recurrence_months",
                          value
                            .replace(/\D/g, "")
                            .slice(0, 2)
                        )
                      }
                      placeholder="Ex.: 12"
                    />
                  )}

                  {form.recurring && (
                    <div className="md:col-span-2">
                      <div className="rounded-2xl border border-[#3d444f] bg-[#292e36] p-4">
                        <p className="text-sm font-medium text-white">
                          Como funciona a recorrência?
                        </p>

                        <p className="mt-2 text-sm leading-6 text-[#8f96a3]">
                          O sistema vai criar{" "}
                          <span className="font-semibold text-[#c5cad3]">
                            {form.recurrence_months || "0"}
                          </span>{" "}
                          lançamentos mensais a partir do primeiro
                          vencimento. Cada mês terá seu próprio status
                          de pagamento.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <TextareaField
                      label="Observações"
                      value={form.notes}
                      onChange={(value) =>
                        updateField("notes", value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-[#363c46] bg-[#23272f]/95 px-6 py-4 backdrop-blur md:px-8">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-2xl border border-[#3d444f] bg-[#292e36] px-5 py-3 text-sm font-semibold text-[#c5cad3] transition hover:bg-[#343a44]"
                >
                  Cancelar
                </button>

                <button
                  disabled={saving}
                  type="submit"
                  className="rounded-2xl bg-[#635bff] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-[#716aff] disabled:opacity-50"
                >
                  {saving
                    ? "Salvando..."
                    : editingId
                    ? "Salvar alterações"
                    : form.recurring
                    ? "Gerar contas"
                    : "Salvar conta"}
                </button>
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
                  confirmAction.type === "pay"
                    ? "bg-[#17382b] text-[#5ee0a3]"
                    : confirmAction.type === "delete" ||
                      confirmAction.type === "deleteSelected"
                    ? "bg-[#462525] text-[#ff8d8d]"
                    : "bg-[#343a44] text-[#9ba1ff]"
                }`}
              >
                {confirmAction.type === "pay" ? (
                  <CheckCircle2 size={22} />
                ) : confirmAction.type === "delete" ||
                  confirmAction.type === "deleteSelected" ? (
                  <Trash2 size={22} />
                ) : (
                  <Undo2 size={22} />
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c74ff]">
                  Confirmação
                </p>

                <h3 className="mt-1 text-xl font-semibold text-white">
                  {confirmAction.type === "pay"
                    ? "Marcar conta como paga?"
                    : confirmAction.type === "delete"
                    ? "Excluir esta conta?"
                    : confirmAction.type === "deleteSelected"
                    ? `Excluir ${selectedIds.length} conta${
                        selectedIds.length === 1 ? "" : "s"
                      }?`
                    : "Reabrir esta conta?"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#8f96a3]">
                  {confirmAction.type === "pay"
                    ? "Esta ação vai registrar o pagamento somente deste lançamento."
                    : confirmAction.type === "delete"
                    ? "Essa conta será removida do sistema. Se fizer parte de uma recorrência, somente este lançamento será excluído."
                    : confirmAction.type === "deleteSelected"
                    ? "Todas as contas selecionadas serão removidas do sistema. Essa ação não exclui automaticamente outros lançamentos da mesma recorrência que não estejam selecionados."
                    : "Este lançamento voltará para o status pendente."}
                </p>
              </div>
            </div>

            {confirmAction.type !== "deleteSelected" && (
              <div className="mt-6 rounded-2xl border border-[#363c46] bg-[#23272f] p-4">
                <p className="text-xs text-[#8f96a3]">
                  Conta
                </p>

                <p className="mt-1 text-sm font-semibold text-white">
                  {confirmAction.account.description}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[#8f96a3]">
                    {confirmAction.account.supplier}
                  </span>

                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(
                      confirmAction.account.amount
                    )}
                  </span>
                </div>
              </div>
            )}

            {confirmAction.type === "deleteSelected" && (
              <div className="mt-6 rounded-2xl border border-[#5a3434] bg-[#352323] p-4">
                <p className="text-xs font-medium text-[#ff9a9a]">
                  Você selecionou
                </p>

                <p className="mt-1 text-2xl font-semibold text-white">
                  {selectedIds.length}
                </p>

                <p className="mt-1 text-xs text-[#c58e8e]">
                  {selectedIds.length === 1
                    ? "lançamento para exclusão"
                    : "lançamentos para exclusão"}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={processingAction}
                onClick={() => setConfirmAction(null)}
                className="rounded-2xl border border-[#3d444f] bg-[#23272f] px-5 py-3 text-sm font-semibold text-[#c5cad3] transition hover:bg-[#343a44] disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={processingAction}
                onClick={confirmAccountAction}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                  confirmAction.type === "pay"
                    ? "bg-[#2ac97d] text-[#102019] hover:bg-[#37d989]"
                    : confirmAction.type === "delete" ||
                      confirmAction.type === "deleteSelected"
                    ? "bg-[#d95757] text-white hover:bg-[#e46666]"
                    : "bg-[#635bff] text-white hover:bg-[#716aff]"
                }`}
              >
                {processingAction
                  ? "Processando..."
                  : confirmAction.type === "pay"
                  ? "Confirmar pagamento"
                  : confirmAction.type === "delete"
                  ? "Excluir conta"
                  : confirmAction.type === "deleteSelected"
                  ? "Excluir selecionadas"
                  : "Reabrir conta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={label}
      title={label}
      className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
        checked || indeterminate
          ? "border-[#635bff] bg-[#635bff]"
          : "border-[#4b535f] bg-[#23272f] hover:border-[#716aff]"
      }`}
    >
      {checked && (
        <CheckCircle2
          size={13}
          className="text-white"
        />
      )}

      {!checked && indeterminate && (
        <span className="h-0.5 w-2.5 rounded-full bg-white" />
      )}
    </button>
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

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
        active
          ? "bg-[#635bff] text-white"
          : "border border-[#3d444f] bg-[#23272f] text-[#a0a7b3] hover:bg-[#343a44] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: PayableStatus;
}) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#17382b] px-3 py-1.5 text-xs font-semibold text-[#5ee0a3]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#2ac97d]" />
        Pago
      </span>
    );
  }

  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#462525] px-3 py-1.5 text-xs font-semibold text-[#ff8d8d]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#ff6464]" />
        Vencido
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#3d3520] px-3 py-1.5 text-xs font-semibold text-[#f3c969]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#e6b84f]" />
      Pendente
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#c5cad3]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-12 w-full rounded-2xl border border-[#3d444f] bg-[#23272f] px-4 text-sm text-white outline-none transition placeholder:text-[#6f7682] focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
      />
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
      <label className="mb-2 block text-sm font-medium text-[#c5cad3]">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-12 w-full rounded-2xl border border-[#3d444f] bg-[#23272f] px-4 text-sm text-white outline-none transition focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#c5cad3]">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        rows={4}
        className="w-full resize-none rounded-2xl border border-[#3d444f] bg-[#23272f] px-4 py-3 text-sm text-white outline-none transition focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
      />
    </div>
  );
}