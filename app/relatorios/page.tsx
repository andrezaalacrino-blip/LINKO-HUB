"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Printer,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/client";

type FilterMode = "month" | "period";

type Contract = {
  id: string;
  client_id: string;
  contract_value: number;
  due_day: number;
  start_date: string;
  status: "active" | "inactive" | "cancelled";
};

type Client = {
  id: string;
  name: string;
  trade_name: string | null;
  status: "active" | "inactive";
};

type Payable = {
  id: string;
  supplier: string;
  description: string;
  category: string | null;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  payment_date: string | null;
};

type EntryItem = {
  id: string;
  clientName: string;
  value: number;
  dueDate: string;
};

type CategoryItem = {
  name: string;
  value: number;
};

const ITEMS_PER_PAGE = 10;

const CATEGORY_COLORS = [
  "#635bff",
  "#2ac97d",
  "#f0a44b",
  "#ef6464",
  "#55b7ff",
  "#b276ff",
  "#e6c84f",
  "#6f7682",
];

export default function RelatoriosPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  const [contracts, setContracts] =
    useState<Contract[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [accounts, setAccounts] =
    useState<Payable[]>([]);

  const [filterMode, setFilterMode] =
    useState<FilterMode>("month");

  const [entriesPage, setEntriesPage] =
    useState(1);

  const [expensesPage, setExpensesPage] =
    useState(1);

  const [selectedMonth, setSelectedMonth] =
    useState(() => {
      const today = new Date();

      return new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
    });

  const [startDate, setStartDate] =
    useState(() => {
      const today = new Date();

      return `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-01`;
    });

  const [endDate, setEndDate] =
    useState(() => {
      const today = new Date();

      const lastDay = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).getDate();

      return `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(
        lastDay
      ).padStart(2, "0")}`;
    });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setEntriesPage(1);
    setExpensesPage(1);
  }, [
    filterMode,
    selectedMonth,
    startDate,
    endDate,
  ]);

  async function loadData() {
    setLoading(true);

    const [
      contractsResult,
      clientsResult,
      accountsResult,
    ] = await Promise.all([
      supabase
        .from("contracts")
        .select(
          "id, client_id, contract_value, due_day, start_date, status"
        ),

      supabase
        .from("clients")
        .select(
          "id, name, trade_name, status"
        ),

      supabase
        .from("accounts_payable")
        .select(
          "id, supplier, description, category, amount, due_date, status, payment_date"
        )
        .order("due_date", {
          ascending: true,
        }),
    ]);

    if (contractsResult.error) {
      console.error(contractsResult.error);
    }

    if (clientsResult.error) {
      console.error(clientsResult.error);
    }

    if (accountsResult.error) {
      console.error(accountsResult.error);
    }

    setContracts(
      contractsResult.data || []
    );

    setClients(
      clientsResult.data || []
    );

    setAccounts(
      accountsResult.data || []
    );

    setLoading(false);
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    ).format(value);
  }

  function formatDate(value: string) {
    if (!value) return "—";

    return new Intl.DateTimeFormat(
      "pt-BR"
    ).format(
      new Date(
        `${value}T00:00:00`
      )
    );
  }

  function formatMonth(date: Date) {
    const value =
      new Intl.DateTimeFormat(
        "pt-BR",
        {
          month: "long",
          year: "numeric",
        }
      ).format(date);

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  }

  function previousMonth(date: Date) {
    return new Date(
      date.getFullYear(),
      date.getMonth() - 1,
      1
    );
  }

  function nextMonth(date: Date) {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      1
    );
  }

  function isoDate(
    year: number,
    month: number,
    day: number
  ) {
    return `${year}-${String(
      month
    ).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
  }

  const reportRange = useMemo(() => {
    if (filterMode === "period") {
      return {
        start: startDate,
        end: endDate,
      };
    }

    const year =
      selectedMonth.getFullYear();

    const month =
      selectedMonth.getMonth();

    const firstDay = isoDate(
      year,
      month + 1,
      1
    );

    const lastDayNumber =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const lastDay = isoDate(
      year,
      month + 1,
      lastDayNumber
    );

    return {
      start: firstDay,
      end: lastDay,
    };
  }, [
    filterMode,
    selectedMonth,
    startDate,
    endDate,
  ]);

  const reportTitle =
    filterMode === "month"
      ? formatMonth(selectedMonth)
      : `${formatDate(
          reportRange.start
        )} até ${formatDate(
          reportRange.end
        )}`;

  function effectiveStatus(
    account: Payable
  ) {
    if (account.status === "paid") {
      return "paid";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(
      `${account.due_date}T00:00:00`
    );

    if (due < today) {
      return "overdue";
    }

    return "pending";
  }

  const periodAccounts =
    useMemo(() => {
      if (
        !reportRange.start ||
        !reportRange.end
      ) {
        return [];
      }

      return accounts.filter(
        (account) =>
          account.due_date >=
            reportRange.start &&
          account.due_date <=
            reportRange.end
      );
    }, [
      accounts,
      reportRange,
    ]);

  const periodEntries =
    useMemo<EntryItem[]>(() => {
      if (
        !reportRange.start ||
        !reportRange.end
      ) {
        return [];
      }

      const start = new Date(
        `${reportRange.start}T00:00:00`
      );

      const end = new Date(
        `${reportRange.end}T23:59:59`
      );

      const result: EntryItem[] = [];

      contracts
        .filter(
          (contract) =>
            contract.status === "active"
        )
        .forEach((contract) => {
          const contractStart = new Date(
            `${contract.start_date}T00:00:00`
          );

          let cursor = new Date(
            start.getFullYear(),
            start.getMonth(),
            1
          );

          const lastMonth = new Date(
            end.getFullYear(),
            end.getMonth(),
            1
          );

          while (cursor <= lastMonth) {
            const year =
              cursor.getFullYear();

            const month =
              cursor.getMonth();

            const lastDay = new Date(
              year,
              month + 1,
              0
            ).getDate();

            const safeDay = Math.min(
              contract.due_day,
              lastDay
            );

            const dueDate = new Date(
              year,
              month,
              safeDay
            );

            if (
              dueDate >= start &&
              dueDate <= end &&
              dueDate >= contractStart
            ) {
              const client =
                clients.find(
                  (item) =>
                    item.id ===
                    contract.client_id
                );

              result.push({
                id: `${contract.id}-${year}-${month}`,
                clientName:
                  client?.trade_name ||
                  client?.name ||
                  "Cliente",
                value: Number(
                  contract.contract_value ||
                    0
                ),
                dueDate: isoDate(
                  year,
                  month + 1,
                  safeDay
                ),
              });
            }

            cursor = new Date(
              year,
              month + 1,
              1
            );
          }
        });

      return result.sort((a, b) =>
        a.dueDate.localeCompare(
          b.dueDate
        )
      );
    }, [
      contracts,
      clients,
      reportRange,
    ]);

  const totalEntries =
    periodEntries.reduce(
      (total, item) =>
        total + item.value,
      0
    );

  const totalExpenses =
    periodAccounts.reduce(
      (total, account) =>
        total +
        Number(
          account.amount || 0
        ),
      0
    );

  const totalPaid =
    periodAccounts
      .filter(
        (account) =>
          effectiveStatus(
            account
          ) === "paid"
      )
      .reduce(
        (total, account) =>
          total +
          Number(
            account.amount || 0
          ),
        0
      );

  const pendingAccounts =
    periodAccounts.filter(
      (account) =>
        effectiveStatus(account) !==
        "paid"
    );

  const totalPending =
    pendingAccounts.reduce(
      (total, account) =>
        total +
        Number(
          account.amount || 0
        ),
      0
    );

  const result =
    totalEntries - totalExpenses;

  const margin =
    totalEntries > 0
      ? (result / totalEntries) * 100
      : 0;

  const categories =
    useMemo<CategoryItem[]>(() => {
      const map = new Map<
        string,
        number
      >();

      periodAccounts.forEach(
        (account) => {
          const category =
            account.category?.trim() ||
            "Outros";

          map.set(
            category,
            (map.get(category) || 0) +
              Number(
                account.amount || 0
              )
          );
        }
      );

      return Array.from(
        map.entries()
      )
        .map(([name, value]) => ({
          name,
          value,
        }))
        .sort(
          (a, b) =>
            b.value - a.value
        );
    }, [periodAccounts]);

  /* PAGINAÇÃO */

  const entriesTotalPages =
    Math.max(
      1,
      Math.ceil(
        periodEntries.length /
          ITEMS_PER_PAGE
      )
    );

  const expensesTotalPages =
    Math.max(
      1,
      Math.ceil(
        periodAccounts.length /
          ITEMS_PER_PAGE
      )
    );

  const safeEntriesPage =
    Math.min(
      entriesPage,
      entriesTotalPages
    );

  const safeExpensesPage =
    Math.min(
      expensesPage,
      expensesTotalPages
    );

  const paginatedEntries =
    periodEntries.slice(
      (safeEntriesPage - 1) *
        ITEMS_PER_PAGE,
      safeEntriesPage *
        ITEMS_PER_PAGE
    );

  const paginatedExpenses =
    periodAccounts.slice(
      (safeExpensesPage - 1) *
        ITEMS_PER_PAGE,
      safeExpensesPage *
        ITEMS_PER_PAGE
    );

  function printReport() {
    window.print();
  }

  function exportCsv() {
    const rows: string[][] = [];

    rows.push([
      "Tipo",
      "Descrição / Cliente",
      "Fornecedor",
      "Categoria",
      "Data",
      "Status",
      "Valor",
    ]);

    periodEntries.forEach(
      (entry) => {
        rows.push([
          "Entrada",
          entry.clientName,
          "",
          "Contrato",
          formatDate(
            entry.dueDate
          ),
          "Previsto",
          entry.value
            .toFixed(2)
            .replace(".", ","),
        ]);
      }
    );

    periodAccounts.forEach(
      (account) => {
        const status =
          effectiveStatus(account);

        rows.push([
          "Gasto",
          account.description,
          account.supplier,
          account.category ||
            "Outros",
          formatDate(
            account.due_date
          ),
          status === "paid"
            ? "Pago"
            : status === "overdue"
              ? "Vencido"
              : "Pendente",
          Number(
            account.amount
          )
            .toFixed(2)
            .replace(".", ","),
        ]);
      }
    );

    rows.push([]);

    rows.push([
      "Resumo",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    rows.push([
      "Entradas",
      "",
      "",
      "",
      "",
      "",
      totalEntries
        .toFixed(2)
        .replace(".", ","),
    ]);

    rows.push([
      "Gastos",
      "",
      "",
      "",
      "",
      "",
      totalExpenses
        .toFixed(2)
        .replace(".", ","),
    ]);

    rows.push([
      "Pago",
      "",
      "",
      "",
      "",
      "",
      totalPaid
        .toFixed(2)
        .replace(".", ","),
    ]);

    rows.push([
      "A pagar",
      "",
      "",
      "",
      "",
      "",
      totalPending
        .toFixed(2)
        .replace(".", ","),
    ]);

    rows.push([
      "Resultado",
      "",
      "",
      "",
      "",
      "",
      result
        .toFixed(2)
        .replace(".", ","),
    ]);

    rows.push([
      "Margem",
      "",
      "",
      "",
      "",
      "",
      `${margin.toFixed(1)}%`,
    ]);

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const value =
              String(
                cell ?? ""
              ).replace(
                /"/g,
                '""'
              );

            return `"${value}"`;
          })
          .join(";")
      )
      .join("\n");

    const blob = new Blob(
      [
        "\uFEFF" +
          csvContent,
      ],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    const fileName =
      filterMode === "month"
        ? `relatorio-financeiro-${selectedMonth.getFullYear()}-${String(
            selectedMonth.getMonth() +
              1
          ).padStart(
            2,
            "0"
          )}.csv`
        : `relatorio-financeiro-${reportRange.start}-a-${reportRange.end}.csv`;

    link.href = url;

    link.setAttribute(
      "download",
      fileName
    );

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    URL.revokeObjectURL(
      url
    );
  }

  return (
    <AppShell
      eyebrow="Financeiro"
      title="Relatório financeiro"
      description="Fechamento detalhado de entradas, gastos e resultado."
    >
      {/* TOPO */}

      <div className="print:hidden mb-6 flex flex-col gap-4 border-b border-[#363c46] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              {reportTitle}
            </h2>

            <span className="hidden h-4 w-px bg-[#3d444f] sm:block" />

            <p className="text-xs text-[#8f96a3]">
              {formatDate(
                reportRange.start
              )}{" "}
              até{" "}
              {formatDate(
                reportRange.end
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[#3d444f] bg-[#23272f] p-1">
            <button
              type="button"
              onClick={() =>
                setFilterMode(
                  "month"
                )
              }
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                filterMode ===
                "month"
                  ? "bg-[#635bff] text-white"
                  : "text-[#8f96a3] hover:text-white"
              }`}
            >
              Por mês
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterMode(
                  "period"
                )
              }
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                filterMode ===
                "period"
                  ? "bg-[#635bff] text-white"
                  : "text-[#8f96a3] hover:text-white"
              }`}
            >
              Por período
            </button>
          </div>

          {filterMode ===
            "month" && (
            <div className="inline-flex items-center overflow-hidden rounded-xl border border-[#3d444f] bg-[#23272f]">
              <button
                type="button"
                onClick={() =>
                  setSelectedMonth(
                    previousMonth(
                      selectedMonth
                    )
                  )
                }
                className="flex h-10 w-10 items-center justify-center text-[#8f96a3] transition hover:bg-[#343a44] hover:text-white"
              >
                <ChevronLeft
                  size={16}
                />
              </button>

              <div className="min-w-[145px] border-x border-[#3d444f] px-3 text-center text-[11px] font-semibold text-white">
                {formatMonth(
                  selectedMonth
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedMonth(
                    nextMonth(
                      selectedMonth
                    )
                  )
                }
                className="flex h-10 w-10 items-center justify-center text-[#8f96a3] transition hover:bg-[#343a44] hover:text-white"
              >
                <ChevronRight
                  size={16}
                />
              </button>
            </div>
          )}

          {filterMode ===
            "period" && (
            <div className="flex flex-wrap items-center gap-2">
              <CompactDateField
                value={startDate}
                onChange={
                  setStartDate
                }
              />

              <span className="text-[11px] text-[#6f7682]">
                até
              </span>

              <CompactDateField
                value={endDate}
                onChange={
                  setEndDate
                }
              />
            </div>
          )}

          <IconTooltip
            label="Exportar CSV"
            onClick={exportCsv}
          >
            <Download
              size={16}
            />
          </IconTooltip>

          <IconTooltip
            label="Imprimir relatório"
            onClick={printReport}
          >
            <Printer
              size={16}
            />
          </IconTooltip>
        </div>
      </div>

      {/* CARDS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveCard
          label="Entradas"
          value={
            loading
              ? "..."
              : formatCurrency(
                  totalEntries
                )
          }
          helper={`${periodEntries.length} lançamento${
            periodEntries.length ===
            1
              ? ""
              : "s"
          }`}
          icon={
            <ArrowUpRight
              size={18}
            />
          }
          accent="green"
        />

        <ExecutiveCard
          label="Gastos"
          value={
            loading
              ? "..."
              : formatCurrency(
                  totalExpenses
                )
          }
          helper={`${periodAccounts.length} conta${
            periodAccounts.length ===
            1
              ? ""
              : "s"
          }`}
          icon={
            <ArrowDownRight
              size={18}
            />
          }
          accent="orange"
        />

        <ExecutiveCard
          label="Resultado"
          value={
            loading
              ? "..."
              : formatCurrency(
                  result
                )
          }
          helper={
            result >= 0
              ? "Resultado positivo"
              : "Resultado negativo"
          }
          icon={
            result >= 0 ? (
              <TrendingUp
                size={18}
              />
            ) : (
              <TrendingDown
                size={18}
              />
            )
          }
          accent={
            result >= 0
              ? "purple"
              : "red"
          }
        />

        <ExecutiveCard
          label="A pagar"
          value={
            loading
              ? "..."
              : formatCurrency(
                  totalPending
                )
          }
          helper={`${pendingAccounts.length} pendência${
            pendingAccounts.length ===
            1
              ? ""
              : "s"
          }`}
          icon={
            <Clock3
              size={18}
            />
          }
          accent="yellow"
        />
      </div>

      {/* RESUMO + ROSCA */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <section className="rounded-[24px] border border-[#363c46] bg-[#292e36] p-5 sm:p-6">
          <div>
            <p className="text-xs text-[#8f96a3]">
              Resumo executivo
            </p>

            <h3 className="mt-1 text-lg font-semibold text-white">
              Visão financeira
            </h3>
          </div>

          <div className="mt-6 space-y-2">
            <SummaryLine
              label="Entradas"
              value={
                totalEntries
              }
              color="green"
              formatCurrency={
                formatCurrency
              }
            />

            <SummaryLine
              label="Gastos"
              value={
                totalExpenses
              }
              color="orange"
              formatCurrency={
                formatCurrency
              }
            />

            <SummaryLine
              label="Pago"
              value={totalPaid}
              color="green"
              formatCurrency={
                formatCurrency
              }
            />

            <SummaryLine
              label="A pagar"
              value={
                totalPending
              }
              color="yellow"
              formatCurrency={
                formatCurrency
              }
            />
          </div>

          <div className="mt-5 border-t border-[#363c46] pt-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-[#8f96a3]">
                  Resultado
                </p>

                <p
                  className={`mt-2 text-3xl font-semibold tracking-[-0.04em] ${
                    result >= 0
                      ? "text-[#5ee0a3]"
                      : "text-[#ff8d8d]"
                  }`}
                >
                  {formatCurrency(
                    result
                  )}
                </p>

                <p className="mt-2 text-[10px] text-[#6f7682]">
                  Margem de{" "}
                  {margin.toFixed(
                    1
                  )}
                  %
                </p>
              </div>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  result >= 0
                    ? "bg-[#17382b] text-[#5ee0a3]"
                    : "bg-[#462525] text-[#ff8d8d]"
                }`}
              >
                {result >= 0 ? (
                  <TrendingUp
                    size={19}
                  />
                ) : (
                  <TrendingDown
                    size={19}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#363c46] bg-[#292e36] p-5 sm:p-6">
          <div>
            <p className="text-xs text-[#8f96a3]">
              Composição das despesas
            </p>

            <h3 className="mt-1 text-lg font-semibold text-white">
              Gastos por categoria
            </h3>
          </div>

          <div className="mt-6 grid gap-7 md:grid-cols-[260px_minmax(0,1fr)] md:items-center">
            <ReportDonut
              categories={
                categories
              }
              total={
                totalExpenses
              }
              formatCurrency={
                formatCurrency
              }
            />

            <div className="space-y-2">
              {categories.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-[#3d444f] bg-[#23272f] px-4 py-8 text-center text-xs text-[#8f96a3]">
                  Nenhum gasto neste período.
                </div>
              ) : (
                categories.map(
                  (
                    category,
                    index
                  ) => {
                    const percentage =
                      totalExpenses >
                      0
                        ? (category.value /
                            totalExpenses) *
                          100
                        : 0;

                    return (
                      <div
                        key={
                          category.name
                        }
                        className="flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-[#23272f]"
                      >
                        <span
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[
                                index %
                                  CATEGORY_COLORS.length
                              ],
                          }}
                          className="h-3 w-3 shrink-0 rounded-full"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {
                              category.name
                            }
                          </p>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#343a44]">
                            <div
                              style={{
                                width: `${percentage}%`,
                                backgroundColor:
                                  CATEGORY_COLORS[
                                    index %
                                      CATEGORY_COLORS.length
                                  ],
                              }}
                              className="h-full rounded-full"
                            />
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatCurrency(
                              category.value
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-[#6f7682]">
                            {percentage.toFixed(
                              1
                            )}
                            %
                          </p>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ENTRADAS */}

      <section className="mt-6 overflow-hidden rounded-[24px] border border-[#363c46] bg-[#292e36]">
        <div className="flex flex-col gap-3 border-b border-[#363c46] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs text-[#8f96a3]">
              Receitas
            </p>

            <h3 className="mt-1 text-lg font-semibold text-white">
              Entradas do período
            </h3>
          </div>

          <p className="text-xl font-semibold text-[#5ee0a3]">
            {formatCurrency(
              totalEntries
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left">
            <thead>
              <tr className="bg-[#23272f]">
                <TableHead>
                  Cliente
                </TableHead>

                <TableHead>
                  Vencimento
                </TableHead>

                <TableHead align="right">
                  Valor
                </TableHead>
              </tr>
            </thead>

            <tbody>
              {periodEntries.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-12 text-center text-sm text-[#8f96a3]"
                  >
                    Nenhuma entrada encontrada.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map(
                  (entry) => (
                    <tr
                      key={
                        entry.id
                      }
                      className="border-t border-[#363c46] transition hover:bg-[#2d323a]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17382b] text-[#5ee0a3]">
                            <ArrowUpRight
                              size={
                                16
                              }
                            />
                          </div>

                          <p className="text-sm font-semibold text-white">
                            {
                              entry.clientName
                            }
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-[#a0a7b3]">
                        {formatDate(
                          entry.dueDate
                        )}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-semibold text-[#5ee0a3]">
                        {formatCurrency(
                          entry.value
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={
            safeEntriesPage
          }
          totalPages={
            entriesTotalPages
          }
          totalItems={
            periodEntries.length
          }
          itemsPerPage={
            ITEMS_PER_PAGE
          }
          onPrevious={() =>
            setEntriesPage(
              (page) =>
                Math.max(
                  1,
                  page - 1
                )
            )
          }
          onNext={() =>
            setEntriesPage(
              (page) =>
                Math.min(
                  entriesTotalPages,
                  page + 1
                )
            )
          }
        />
      </section>

      {/* GASTOS */}

      <section className="mt-6 overflow-hidden rounded-[24px] border border-[#363c46] bg-[#292e36]">
        <div className="flex flex-col gap-3 border-b border-[#363c46] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs text-[#8f96a3]">
              Despesas
            </p>

            <h3 className="mt-1 text-lg font-semibold text-white">
              Gastos do período
            </h3>
          </div>

          <p className="text-xl font-semibold text-[#f0a44b]">
            {formatCurrency(
              totalExpenses
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead>
              <tr className="bg-[#23272f]">
                <TableHead>
                  Descrição
                </TableHead>

                <TableHead>
                  Fornecedor
                </TableHead>

                <TableHead>
                  Categoria
                </TableHead>

                <TableHead>
                  Vencimento
                </TableHead>

                <TableHead>
                  Status
                </TableHead>

                <TableHead align="right">
                  Valor
                </TableHead>
              </tr>
            </thead>

            <tbody>
              {periodAccounts.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-[#8f96a3]"
                  >
                    Nenhum gasto encontrado.
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map(
                  (account) => (
                    <tr
                      key={
                        account.id
                      }
                      className="border-t border-[#363c46] transition hover:bg-[#2d323a]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#493221] text-[#f0a44b]">
                            <ReceiptText
                              size={
                                16
                              }
                            />
                          </div>

                          <p className="text-sm font-semibold text-white">
                            {
                              account.description
                            }
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-[#a0a7b3]">
                        {
                          account.supplier
                        }
                      </td>

                      <td className="px-6 py-4 text-sm text-[#a0a7b3]">
                        {account.category ||
                          "Outros"}
                      </td>

                      <td className="px-6 py-4 text-sm text-[#a0a7b3]">
                        {formatDate(
                          account.due_date
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge
                          status={effectiveStatus(
                            account
                          )}
                        />
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-semibold text-white">
                        {formatCurrency(
                          Number(
                            account.amount
                          )
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={
            safeExpensesPage
          }
          totalPages={
            expensesTotalPages
          }
          totalItems={
            periodAccounts.length
          }
          itemsPerPage={
            ITEMS_PER_PAGE
          }
          onPrevious={() =>
            setExpensesPage(
              (page) =>
                Math.max(
                  1,
                  page - 1
                )
            )
          }
          onNext={() =>
            setExpensesPage(
              (page) =>
                Math.min(
                  expensesTotalPages,
                  page + 1
                )
            )
          }
        />
      </section>
    </AppShell>
  );
}

function CompactDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div className="relative">
      <CalendarDays
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f96a3]"
      />

      <input
        type="date"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="h-10 rounded-xl border border-[#3d444f] bg-[#23272f] pl-9 pr-3 text-[11px] text-white outline-none transition focus:border-[#635bff]"
      />
    </div>
  );
}

function IconTooltip({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb] transition hover:border-[#555e6b] hover:bg-[#343a44] hover:text-white"
      >
        {children}
      </button>

      <div className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 whitespace-nowrap rounded-lg border border-[#424955] bg-[#1f2329] px-3 py-2 text-[10px] font-medium text-white opacity-0 shadow-xl shadow-black/30 transition-all duration-150 group-hover:opacity-100">
        {label}

        <span className="absolute -top-1 right-4 h-2 w-2 rotate-45 border-l border-t border-[#424955] bg-[#1f2329]" />
      </div>
    </div>
  );
}

function ExecutiveCard({
  label,
  value,
  helper,
  icon,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  accent:
    | "green"
    | "orange"
    | "purple"
    | "yellow"
    | "red";
}) {
  const colors = {
    green:
      "bg-[#17382b] text-[#5ee0a3]",
    orange:
      "bg-[#493221] text-[#f0a44b]",
    purple:
      "bg-[#302f48] text-[#9ba1ff]",
    yellow:
      "bg-[#3d3520] text-[#f3c969]",
    red:
      "bg-[#462525] text-[#ff8d8d]",
  };

  return (
    <div className="rounded-[20px] border border-[#363c46] bg-[#292e36] p-5 transition hover:-translate-y-0.5 hover:border-[#464e5a]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#8f96a3]">
            {label}
          </p>

          <p className="mt-3 truncate text-2xl font-semibold tracking-[-0.04em] text-white">
            {value}
          </p>

          <p className="mt-2 text-[10px] text-[#6f7682]">
            {helper}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  color,
  formatCurrency,
}: {
  label: string;
  value: number;
  color:
    | "green"
    | "orange"
    | "yellow";
  formatCurrency: (
    value: number
  ) => string;
}) {
  const colors = {
    green:
      "bg-[#2ac97d]",
    orange:
      "bg-[#f0a44b]",
    yellow:
      "bg-[#e6b84f]",
  };

  return (
    <div className="flex items-center justify-between rounded-xl bg-[#23272f] px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full ${colors[color]}`}
        />

        <p className="text-xs text-[#9da4af]">
          {label}
        </p>
      </div>

      <p className="text-sm font-semibold text-white">
        {formatCurrency(
          value
        )}
      </p>
    </div>
  );
}

function ReportDonut({
  categories,
  total,
  formatCurrency,
}: {
  categories: CategoryItem[];
  total: number;
  formatCurrency: (
    value: number
  ) => string;
}) {
  const radius = 70;

  const circumference =
    2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <div className="relative mx-auto h-[220px] w-[220px]">
      <svg
        viewBox="0 0 180 180"
        className="h-full w-full -rotate-90"
      >
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#343a44"
          strokeWidth="20"
        />

        {categories.map(
          (
            category,
            index
          ) => {
            const percentage =
              total > 0
                ? category.value /
                  total
                : 0;

            const length =
              circumference *
              percentage;

            const offset =
              -accumulated;

            accumulated +=
              length;

            return (
              <circle
                key={
                  category.name
                }
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={
                  CATEGORY_COLORS[
                    index %
                      CATEGORY_COLORS.length
                  ]
                }
                strokeWidth="20"
                strokeDasharray={`${length} ${
                  circumference -
                  length
                }`}
                strokeDashoffset={
                  offset
                }
                strokeLinecap="round"
              />
            );
          }
        )}
      </svg>

      <div className="absolute inset-[52px] flex flex-col items-center justify-center rounded-full bg-[#292e36] text-center">
        <p className="text-[9px] text-[#8f96a3]">
          Gastos
        </p>

        <p className="mt-1 max-w-[100px] truncate text-base font-semibold text-white">
          {formatCurrency(
            total
          )}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#17382b] px-3 py-1.5 text-[10px] font-semibold text-[#5ee0a3]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#2ac97d]" />
        Pago
      </span>
    );
  }

  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#462525] px-3 py-1.5 text-[10px] font-semibold text-[#ff8d8d]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#ef6464]" />
        Vencido
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#3d3520] px-3 py-1.5 text-[10px] font-semibold text-[#f3c969]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#e6b84f]" />
      Pendente
    </span>
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
      className={`px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f96a3] ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const firstItem =
    totalItems === 0
      ? 0
      : (currentPage - 1) *
          itemsPerPage +
        1;

  const lastItem =
    Math.min(
      currentPage *
        itemsPerPage,
      totalItems
    );

  return (
    <div className="print:hidden flex flex-col gap-3 border-t border-[#363c46] bg-[#23272f] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] text-[#8f96a3]">
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
          {totalItems}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={
            currentPage === 1
          }
          onClick={
            onPrevious
          }
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb] transition hover:bg-[#343a44] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft
            size={16}
          />
        </button>

        <div className="flex h-9 min-w-[76px] items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] px-3 text-[11px] font-semibold text-[#c5cad3]">
          {currentPage} /{" "}
          {totalPages}
        </div>

        <button
          type="button"
          disabled={
            currentPage ===
            totalPages
          }
          onClick={onNext}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb] transition hover:bg-[#343a44] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight
            size={16}
          />
        </button>
      </div>
    </div>
  );
}