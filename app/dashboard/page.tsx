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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/client";

/* =========================================================
   TIPOS
========================================================= */

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

type DashboardModal =
  | {
      type: "entries";
      title: string;
    }
  | {
      type: "expenses";
      title: string;
    }
  | {
      type: "pending";
      title: string;
    }
  | {
      type: "result";
      title: string;
    }
  | {
      type: "category";
      title: string;
      category: string;
    }
  | {
      type: "month";
      title: string;
      date: Date;
    };

type MonthChartItem = {
  date: Date;
  key: string;
  label: string;
  entries: number;
  expenses: number;
  result: number;
};

type ChartTooltip = {
  label: string;
  value: number;
  color: string;
  x: number;
  y: number;
};

/* =========================================================
   CORES DO GRÁFICO ROSCA
========================================================= */

const DONUT_COLORS = [
  "#635bff",
  "#2ac97d",
  "#f0a44b",
  "#ef6464",
  "#55b7ff",
  "#b276ff",
  "#e6c84f",
  "#6f7682",
];

/* =========================================================
   PÁGINA
========================================================= */

export default function DashboardPage() {
  const supabase = createClient();

  const [contracts, setContracts] =
    useState<Contract[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [accounts, setAccounts] =
    useState<Payable[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [modal, setModal] =
    useState<DashboardModal | null>(null);

  const [tooltip, setTooltip] =
    useState<ChartTooltip | null>(null);

  const [selectedMonth, setSelectedMonth] =
    useState(() => {
      const today = new Date();

      return new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
    });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
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
        ),
    ]);

    if (contractsResult.error) {
      console.error(
        contractsResult.error
      );
    }

    if (clientsResult.error) {
      console.error(
        clientsResult.error
      );
    }

    if (accountsResult.error) {
      console.error(
        accountsResult.error
      );
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

  /* =======================================================
     FUNÇÕES DE DATA
  ======================================================= */

  function monthEnd(date: Date) {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0,
      23,
      59,
      59
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

  function monthKey(date: Date) {
    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;
  }

  function accountIsInMonth(
    account: Payable,
    date: Date
  ) {
    return account.due_date.startsWith(
      monthKey(date)
    );
  }

  function formatMonth(date: Date) {
    const text =
      new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(date);

    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
    );
  }

  function formatShortMonth(date: Date) {
    const text =
      new Intl.DateTimeFormat("pt-BR", {
        month: "short",
      })
        .format(date)
        .replace(".", "");

    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
    );
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(
      "pt-BR"
    ).format(
      new Date(`${value}T00:00:00`)
    );
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

  /* =======================================================
     STATUS REAL DA CONTA
  ======================================================= */

  function effectiveStatus(
    account: Payable
  ) {
    if (account.status === "paid") {
      return "paid";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(
      `${account.due_date}T00:00:00`
    );

    if (dueDate < today) {
      return "overdue";
    }

    return "pending";
  }

  /* =======================================================
     ENTRADAS
  ======================================================= */

  function contractsForMonth(date: Date) {
    const end = monthEnd(date);

    return contracts.filter(
      (contract) => {
        if (
          contract.status !== "active"
        ) {
          return false;
        }

        const start = new Date(
          `${contract.start_date}T00:00:00`
        );

        return start <= end;
      }
    );
  }

  function entriesForMonth(date: Date) {
    return contractsForMonth(
      date
    ).reduce(
      (total, contract) =>
        total +
        Number(
          contract.contract_value || 0
        ),
      0
    );
  }

  /* =======================================================
     DESPESAS
  ======================================================= */

  function expensesForMonth(date: Date) {
    return accounts
      .filter((account) =>
        accountIsInMonth(
          account,
          date
        )
      )
      .reduce(
        (total, account) =>
          total +
          Number(
            account.amount || 0
          ),
        0
      );
  }

  function pendingForMonth(date: Date) {
    return accounts
      .filter(
        (account) =>
          accountIsInMonth(
            account,
            date
          ) &&
          effectiveStatus(account) !==
            "paid"
      )
      .reduce(
        (total, account) =>
          total +
          Number(
            account.amount || 0
          ),
        0
      );
  }

  function paidForMonth(date: Date) {
    return accounts
      .filter(
        (account) =>
          accountIsInMonth(
            account,
            date
          ) &&
          effectiveStatus(account) ===
            "paid"
      )
      .reduce(
        (total, account) =>
          total +
          Number(
            account.amount || 0
          ),
        0
      );
  }

  /* =======================================================
     NÚMEROS DO MÊS
  ======================================================= */

  const entries =
    entriesForMonth(selectedMonth);

  const expenses =
    expensesForMonth(selectedMonth);

  const result =
    entries - expenses;

  const pending =
    pendingForMonth(selectedMonth);

  const paid =
    paidForMonth(selectedMonth);

  const previousDate =
    previousMonth(selectedMonth);

  const previousEntries =
    entriesForMonth(previousDate);

  const previousExpenses =
    expensesForMonth(previousDate);

  const previousResult =
    previousEntries -
    previousExpenses;

  const monthAccounts =
    useMemo(
      () =>
        accounts.filter(
          (account) =>
            accountIsInMonth(
              account,
              selectedMonth
            )
        ),
      [accounts, selectedMonth]
    );

  const pendingAccounts =
    monthAccounts.filter(
      (account) =>
        effectiveStatus(account) !==
        "paid"
    );

  /* =======================================================
     COMPARAÇÃO
  ======================================================= */

  function percentageChange(
    current: number,
    previous: number
  ) {
    if (
      current === 0 &&
      previous === 0
    ) {
      return 0;
    }

    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return (
      ((current - previous) /
        Math.abs(previous)) *
      100
    );
  }

  const entriesChange =
    percentageChange(
      entries,
      previousEntries
    );

  const expensesChange =
    percentageChange(
      expenses,
      previousExpenses
    );

  const resultChange =
    percentageChange(
      result,
      previousResult
    );

  /* =======================================================
     GRÁFICO
  ======================================================= */

  const chartData =
    useMemo<MonthChartItem[]>(() => {
      return Array.from({
        length: 6,
      }).map((_, index) => {
        const date = new Date(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth() -
            (5 - index),
          1
        );

        const monthEntries =
          entriesForMonth(date);

        const monthExpenses =
          expensesForMonth(date);

        return {
          date,
          key: monthKey(date),
          label:
            formatShortMonth(date),
          entries: monthEntries,
          expenses: monthExpenses,
          result:
            monthEntries -
            monthExpenses,
        };
      });
    }, [
      selectedMonth,
      contracts,
      accounts,
    ]);

  const maxChartValue = Math.max(
    ...chartData.flatMap((item) => [
      item.entries,
      item.expenses,
      Math.abs(item.result),
    ]),
    1
  );

  /* =======================================================
     CATEGORIAS
  ======================================================= */

  const categories = useMemo(() => {
    const map = new Map<
      string,
      number
    >();

    monthAccounts.forEach(
      (account) => {
        const category =
          account.category?.trim() ||
          "Outros";

        map.set(
          category,
          (map.get(category) || 0) +
            Number(account.amount || 0)
        );
      }
    );

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort(
        (a, b) =>
          b.value - a.value
      );
  }, [monthAccounts]);

  /* =======================================================
     PRÓXIMOS PAGAMENTOS
  ======================================================= */

  const nextPayments =
    useMemo(() => {
      return [...pendingAccounts]
        .sort(
          (a, b) =>
            new Date(
              `${a.due_date}T00:00:00`
            ).getTime() -
            new Date(
              `${b.due_date}T00:00:00`
            ).getTime()
        )
        .slice(0, 6);
    }, [pendingAccounts]);

  /* =======================================================
     DETALHES DAS ENTRADAS
  ======================================================= */

  const monthContracts =
    contractsForMonth(selectedMonth);

  const entryDetails =
    monthContracts.map(
      (contract) => {
        const client =
          clients.find(
            (item) =>
              item.id ===
              contract.client_id
          );

        return {
          id: contract.id,
          name:
            client?.trade_name ||
            client?.name ||
            "Cliente",
          value: Number(
            contract.contract_value
          ),
          dueDay:
            contract.due_day,
        };
      }
    );

  /* =======================================================
     MARGEM
  ======================================================= */

  const margin =
    entries > 0
      ? (result / entries) * 100
      : 0;

  /* =======================================================
     TOOLTIP
  ======================================================= */

  function showTooltip(
    event: React.MouseEvent<HTMLDivElement>,
    label: string,
    value: number,
    color: string
  ) {
    const rect =
      event.currentTarget.getBoundingClientRect();

    setTooltip({
      label,
      value,
      color,
      x:
        rect.left +
        rect.width / 2,
      y: rect.top,
    });
  }

  return (
    <AppShell
      eyebrow="Financeiro"
      title="Dashboard financeiro"
      description="Acompanhe entradas, gastos e o resultado financeiro da Linko."
      actions={
        <MonthSelector
          date={selectedMonth}
          onPrevious={() =>
            setSelectedMonth(
              previousMonth(
                selectedMonth
              )
            )
          }
          onNext={() =>
            setSelectedMonth(
              nextMonth(
                selectedMonth
              )
            )
          }
          formatMonth={formatMonth}
        />
      }
    >
      {/* =================================================
          CARDS
      ================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MainCard
          title="Entradas do mês"
          value={
            loading
              ? "..."
              : formatCurrency(entries)
          }
          subtitle={`${entryDetails.length} contrato${
            entryDetails.length === 1
              ? ""
              : "s"
          } no mês`}
          icon={
            <ArrowUpRight size={20} />
          }
          accent="green"
          comparison={entriesChange}
          comparisonText={`vs. ${formatShortMonth(
            previousDate
          )}`}
          positiveIsGood
          onClick={() =>
            setModal({
              type: "entries",
              title: `Entradas • ${formatMonth(
                selectedMonth
              )}`,
            })
          }
        />

        <MainCard
          title="Gastos do mês"
          value={
            loading
              ? "..."
              : formatCurrency(expenses)
          }
          subtitle={`${monthAccounts.length} lançamento${
            monthAccounts.length === 1
              ? ""
              : "s"
          }`}
          icon={
            <ArrowDownRight size={20} />
          }
          accent="orange"
          comparison={expensesChange}
          comparisonText={`vs. ${formatShortMonth(
            previousDate
          )}`}
          positiveIsGood={false}
          onClick={() =>
            setModal({
              type: "expenses",
              title: `Gastos • ${formatMonth(
                selectedMonth
              )}`,
            })
          }
        />

        <MainCard
          title="Resultado do mês"
          value={
            loading
              ? "..."
              : formatCurrency(result)
          }
          subtitle={
            result >= 0
              ? "Resultado positivo"
              : "Resultado negativo"
          }
          icon={
            result >= 0 ? (
              <TrendingUp size={20} />
            ) : (
              <TrendingDown
                size={20}
              />
            )
          }
          accent={
            result >= 0
              ? "purple"
              : "red"
          }
          comparison={resultChange}
          comparisonText={`vs. ${formatShortMonth(
            previousDate
          )}`}
          positiveIsGood
          onClick={() =>
            setModal({
              type: "result",
              title: `Resultado • ${formatMonth(
                selectedMonth
              )}`,
            })
          }
        />

        <MainCard
          title="A pagar"
          value={
            loading
              ? "..."
              : formatCurrency(pending)
          }
          subtitle={`${pendingAccounts.length} conta${
            pendingAccounts.length ===
            1
              ? ""
              : "s"
          } pendente${
            pendingAccounts.length ===
            1
              ? ""
              : "s"
          }`}
          icon={<Clock3 size={20} />}
          accent={
            pending > 0
              ? "yellow"
              : "green"
          }
          onClick={() =>
            setModal({
              type: "pending",
              title: `Contas a pagar • ${formatMonth(
                selectedMonth
              )}`,
            })
          }
        />
      </div>

      {/* =================================================
          GRÁFICO + ROSCA
      ================================================= */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.7fr)]">
        <section className="min-w-0 rounded-[24px] border border-[#363c46] bg-[#292e36] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium text-[#8f96a3]">
                Evolução financeira
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                Entradas, gastos e resultado
              </h2>

              <p className="mt-1 text-xs text-[#6f7682]">
                Passe o mouse nas barras e clique no mês para ver detalhes.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-[11px] text-[#8f96a3]">
              <Legend
                color="#635bff"
                label="Entradas"
              />

              <Legend
                color="#f0a44b"
                label="Gastos"
              />

              <Legend
                color="#2ac97d"
                label="Resultado"
              />
            </div>
          </div>

          <div className="mt-7 overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="flex h-[310px] items-end gap-3 rounded-2xl border border-[#363c46] bg-[#23272f] px-5 pb-5 pt-7">
                {chartData.map(
                  (item) => {
                    const isSelected =
                      item.key ===
                      monthKey(
                        selectedMonth
                      );

                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => {
                          setTooltip(null);

                          setSelectedMonth(
                            item.date
                          );

                          setModal({
                            type: "month",
                            title:
                              formatMonth(
                                item.date
                              ),
                            date: item.date,
                          });
                        }}
                        className={`group flex h-full min-w-0 flex-1 flex-col justify-end rounded-xl px-1 pt-3 transition ${
                          isSelected
                            ? "bg-[#2d323b]"
                            : "hover:bg-[#292e36]"
                        }`}
                      >
                        <div className="flex h-full items-end justify-center gap-1.5">
                          {/* ENTRADAS */}

                          <div
                            style={{
                              height: `${Math.max(
                                item.entries >
                                  0
                                  ? 3
                                  : 0,
                                (item.entries /
                                  maxChartValue) *
                                  100
                              )}%`,
                            }}
                            onMouseEnter={(
                              event
                            ) =>
                              showTooltip(
                                event,
                                "Entradas",
                                item.entries,
                                "#635bff"
                              )
                            }
                            onMouseLeave={() =>
                              setTooltip(
                                null
                              )
                            }
                            className="w-[28%] cursor-pointer rounded-t-md bg-[#635bff] transition group-hover:brightness-110"
                          />

                          {/* GASTOS */}

                          <div
                            style={{
                              height: `${Math.max(
                                item.expenses >
                                  0
                                  ? 3
                                  : 0,
                                (item.expenses /
                                  maxChartValue) *
                                  100
                              )}%`,
                            }}
                            onMouseEnter={(
                              event
                            ) =>
                              showTooltip(
                                event,
                                "Gastos",
                                item.expenses,
                                "#f0a44b"
                              )
                            }
                            onMouseLeave={() =>
                              setTooltip(
                                null
                              )
                            }
                            className="w-[28%] cursor-pointer rounded-t-md bg-[#f0a44b] transition group-hover:brightness-110"
                          />

                          {/* RESULTADO */}

                          <div
                            style={{
                              height: `${Math.max(
                                item.result !==
                                  0
                                  ? 3
                                  : 0,
                                (Math.abs(
                                  item.result
                                ) /
                                  maxChartValue) *
                                  100
                              )}%`,
                            }}
                            onMouseEnter={(
                              event
                            ) =>
                              showTooltip(
                                event,
                                "Resultado",
                                item.result,
                                item.result >=
                                  0
                                  ? "#2ac97d"
                                  : "#ef6464"
                              )
                            }
                            onMouseLeave={() =>
                              setTooltip(
                                null
                              )
                            }
                            className={`w-[28%] cursor-pointer rounded-t-md transition group-hover:brightness-110 ${
                              item.result >= 0
                                ? "bg-[#2ac97d]"
                                : "bg-[#ef6464]"
                            }`}
                          />
                        </div>

                        <span
                          className={`mt-3 text-[10px] font-semibold ${
                            isSelected
                              ? "text-white"
                              : "text-[#8f96a3]"
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ROSCA */}

        <section className="rounded-[24px] border border-[#363c46] bg-[#292e36] p-5 sm:p-6">
          <div>
            <p className="text-xs font-medium text-[#8f96a3]">
              Distribuição dos gastos
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              Para onde foi seu dinheiro?
            </h2>

            <p className="mt-1 text-xs text-[#6f7682]">
              Gastos separados por categoria
            </p>
          </div>

          <div className="mt-6">
            <DonutChart
              categories={categories}
              total={expenses}
              formatCurrency={
                formatCurrency
              }
              onCategoryClick={(
                category
              ) =>
                setModal({
                  type: "category",
                  title: category,
                  category,
                })
              }
              onCenterClick={() =>
                setModal({
                  type: "expenses",
                  title: `Gastos • ${formatMonth(
                    selectedMonth
                  )}`,
                })
              }
            />
          </div>
        </section>
      </div>

      {/* =================================================
          RESUMO + PAGAMENTOS
      ================================================= */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(300px,0.65fr)_minmax(0,1fr)]">
        <section className="rounded-[24px] border border-[#363c46] bg-[#292e36] p-5 sm:p-6">
          <div>
            <p className="text-xs text-[#8f96a3]">
              Resumo do caixa
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              {formatMonth(
                selectedMonth
              )}
            </h2>
          </div>

          <div className="mt-6 space-y-3">
            <CashRow
              label="Entradas"
              value={entries}
              color="green"
              formatCurrency={
                formatCurrency
              }
              onClick={() =>
                setModal({
                  type: "entries",
                  title: "Entradas",
                })
              }
            />

            <CashRow
              label="Gastos"
              value={expenses}
              color="orange"
              formatCurrency={
                formatCurrency
              }
              onClick={() =>
                setModal({
                  type: "expenses",
                  title: "Gastos",
                })
              }
            />

            <div className="my-4 border-t border-[#363c46]" />

            <CashRow
              label="Resultado"
              value={result}
              color={
                result >= 0
                  ? "green"
                  : "red"
              }
              strong
              formatCurrency={
                formatCurrency
              }
              onClick={() =>
                setModal({
                  type: "result",
                  title: "Resultado",
                })
              }
            />

            <div className="flex items-center justify-between rounded-xl bg-[#23272f] px-4 py-4">
              <div>
                <p className="text-xs text-[#8f96a3]">
                  Margem do mês
                </p>

                <p className="mt-1 text-[10px] text-[#6f7682]">
                  Resultado ÷ entradas
                </p>
              </div>

              <p
                className={`text-xl font-semibold ${
                  margin >= 0
                    ? "text-[#5ee0a3]"
                    : "text-[#ff8d8d]"
                }`}
              >
                {margin.toFixed(1)}%
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#363c46] bg-[#292e36] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#8f96a3]">
                Agenda financeira
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                Próximos pagamentos
              </h2>

              <p className="mt-1 text-xs text-[#6f7682]">
                Pendências de{" "}
                {formatMonth(
                  selectedMonth
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setModal({
                  type: "pending",
                  title:
                    "Contas pendentes",
                })
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#343a44] text-[#9ba1ff] transition hover:bg-[#3d444f]"
            >
              <CalendarDays size={18} />
            </button>
          </div>

          <div className="mt-5">
            {nextPayments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#3d444f] bg-[#23272f] px-5 py-10 text-center">
                <CheckCircle2
                  size={22}
                  className="mx-auto text-[#5ee0a3]"
                />

                <p className="mt-3 text-sm font-medium text-white">
                  Nenhuma conta pendente
                </p>

                <p className="mt-1 text-xs text-[#8f96a3]">
                  Tudo certo neste mês.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#363c46]">
                {nextPayments.map(
                  (account) => (
                    <button
                      type="button"
                      key={account.id}
                      onClick={() =>
                        setModal({
                          type: "pending",
                          title:
                            "Contas pendentes",
                        })
                      }
                      className="flex w-full items-center gap-4 py-4 text-left transition first:pt-0 last:pb-0 hover:opacity-80"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3d3520] text-[#f3c969]">
                        <ReceiptText
                          size={17}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {
                            account.description
                          }
                        </p>

                        <p className="mt-1 truncate text-xs text-[#8f96a3]">
                          {
                            account.supplier
                          }
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(
                            Number(
                              account.amount
                            )
                          )}
                        </p>

                        <p className="mt-1 text-xs text-[#8f96a3]">
                          {formatDate(
                            account.due_date
                          )}
                        </p>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* =================================================
          COMPARAÇÃO
      ================================================= */}

      <section className="mt-6 rounded-[24px] border border-[#363c46] bg-[#292e36] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-[#8f96a3]">
              Comparativo mensal
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              {formatShortMonth(
                selectedMonth
              )}{" "}
              x{" "}
              {formatShortMonth(
                previousDate
              )}
            </h2>
          </div>

          <p className="text-xs text-[#6f7682]">
            Veja como o caixa evoluiu em relação ao mês anterior.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <ComparisonCard
            title="Entradas"
            previous={
              previousEntries
            }
            current={entries}
            percentage={
              entriesChange
            }
            positiveIsGood
            formatCurrency={
              formatCurrency
            }
          />

          <ComparisonCard
            title="Gastos"
            previous={
              previousExpenses
            }
            current={expenses}
            percentage={
              expensesChange
            }
            positiveIsGood={false}
            formatCurrency={
              formatCurrency
            }
          />

          <ComparisonCard
            title="Resultado"
            previous={
              previousResult
            }
            current={result}
            percentage={
              resultChange
            }
            positiveIsGood
            formatCurrency={
              formatCurrency
            }
          />
        </div>
      </section>

      {/* =================================================
          TOOLTIP BONITO
      ================================================= */}

      {tooltip && (
        <div
          style={{
            left: tooltip.x,
            top: tooltip.y - 12,
            transform:
              "translate(-50%, -100%)",
          }}
          className="pointer-events-none fixed z-[100] min-w-[160px] rounded-xl border border-[#424955] bg-[#1f2329] px-4 py-3 shadow-2xl shadow-black/50"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  tooltip.color,
              }}
            />

            <p className="text-xs font-medium text-[#aab0bb]">
              {tooltip.label}
            </p>
          </div>

          <p className="mt-2 text-base font-semibold text-white">
            {formatCurrency(
              tooltip.value
            )}
          </p>

          <div
            className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
            style={{
              borderLeft:
                "6px solid transparent",
              borderRight:
                "6px solid transparent",
              borderTop:
                "6px solid #1f2329",
            }}
          />
        </div>
      )}

      {/* =================================================
          MODAL
      ================================================= */}

      {modal && (
        <DashboardDetailsModal
          modal={modal}
          selectedMonth={
            selectedMonth
          }
          entryDetails={
            entryDetails
          }
          monthAccounts={
            monthAccounts
          }
          pendingAccounts={
            pendingAccounts
          }
          entries={entries}
          expenses={expenses}
          result={result}
          paid={paid}
          formatCurrency={
            formatCurrency
          }
          formatDate={formatDate}
          formatMonth={formatMonth}
          effectiveStatus={
            effectiveStatus
          }
          onClose={() =>
            setModal(null)
          }
        />
      )}
    </AppShell>
  );
}

/* =========================================================
   SELETOR DE MÊS
========================================================= */

function MonthSelector({
  date,
  onPrevious,
  onNext,
  formatMonth,
}: {
  date: Date;
  onPrevious: () => void;
  onNext: () => void;
  formatMonth: (
    value: Date
  ) => string;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-[#3d444f] bg-[#292e36]">
      <button
        type="button"
        onClick={onPrevious}
        className="flex h-11 w-11 items-center justify-center text-[#8f96a3] transition hover:bg-[#343a44] hover:text-white"
      >
        <ChevronLeft size={17} />
      </button>

      <div className="min-w-[150px] border-x border-[#3d444f] px-4 text-center text-xs font-semibold text-white">
        {formatMonth(date)}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="flex h-11 w-11 items-center justify-center text-[#8f96a3] transition hover:bg-[#343a44] hover:text-white"
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

/* =========================================================
   CARD PRINCIPAL
========================================================= */

function MainCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  comparison,
  comparisonText,
  positiveIsGood = true,
  onClick,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accent:
    | "green"
    | "orange"
    | "purple"
    | "yellow"
    | "red";
  comparison?: number;
  comparisonText?: string;
  positiveIsGood?: boolean;
  onClick: () => void;
}) {
  const accents = {
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

  const positive =
    (comparison || 0) >= 0;

  const good =
    positiveIsGood
      ? positive
      : !positive;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-[22px] border border-[#363c46] bg-[#292e36] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#515966] hover:bg-[#2d323a]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#9ba2ad]">
            {title}
          </p>

          <p className="mt-3 truncate text-2xl font-semibold tracking-[-0.04em] text-white">
            {value}
          </p>

          <p className="mt-2 text-[11px] text-[#6f7682]">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
        >
          {icon}
        </div>
      </div>

      {comparison !==
        undefined && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#363c46] pt-3">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
              good
                ? "text-[#5ee0a3]"
                : "text-[#ff8d8d]"
            }`}
          >
            {positive ? (
              <ArrowUpRight
                size={13}
              />
            ) : (
              <ArrowDownRight
                size={13}
              />
            )}

            {Math.abs(
              comparison
            ).toFixed(1)}
            %
          </span>

          <span className="text-[10px] text-[#6f7682]">
            {comparisonText}
          </span>

          <span className="ml-auto text-[10px] font-medium text-[#777f8d] opacity-0 transition group-hover:opacity-100">
            Ver detalhes
          </span>
        </div>
      )}
    </button>
  );
}

/* =========================================================
   LEGENDA
========================================================= */

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        style={{
          backgroundColor: color,
        }}
        className="h-2.5 w-2.5 rounded-full"
      />

      {label}
    </span>
  );
}

/* =========================================================
   ROSCA
========================================================= */

function DonutChart({
  categories,
  total,
  formatCurrency,
  onCategoryClick,
  onCenterClick,
}: {
  categories: {
    name: string;
    value: number;
  }[];
  total: number;
  formatCurrency: (
    value: number
  ) => string;
  onCategoryClick: (
    category: string
  ) => void;
  onCenterClick: () => void;
}) {
  const radius = 72;

  const circumference =
    2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <div>
      <div className="relative mx-auto h-[190px] w-[190px]">
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
            strokeWidth="22"
          />

          {categories.map(
            (category, index) => {
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

              accumulated += length;

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
                    DONUT_COLORS[
                      index %
                        DONUT_COLORS.length
                    ]
                  }
                  strokeWidth="22"
                  strokeDasharray={`${length} ${
                    circumference -
                    length
                  }`}
                  strokeDashoffset={
                    offset
                  }
                  strokeLinecap="butt"
                  className="cursor-pointer transition hover:opacity-75"
                  onClick={() =>
                    onCategoryClick(
                      category.name
                    )
                  }
                />
              );
            }
          )}
        </svg>

        <button
          type="button"
          onClick={onCenterClick}
          className="absolute inset-[45px] flex flex-col items-center justify-center rounded-full bg-[#292e36] text-center transition hover:bg-[#30353e]"
        >
          <span className="text-[10px] text-[#8f96a3]">
            Total
          </span>

          <span className="mt-1 max-w-[100px] truncate text-sm font-semibold text-white">
            {formatCurrency(total)}
          </span>

          <span className="mt-1 text-[9px] text-[#6f7682]">
            gastos
          </span>
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {categories.length === 0 ? (
          <div className="rounded-xl bg-[#23272f] px-4 py-6 text-center text-xs text-[#8f96a3]">
            Nenhuma despesa neste mês.
          </div>
        ) : (
          categories
            .slice(0, 6)
            .map(
              (category, index) => {
                const percentage =
                  total > 0
                    ? (category.value /
                        total) *
                      100
                    : 0;

                return (
                  <button
                    key={
                      category.name
                    }
                    type="button"
                    onClick={() =>
                      onCategoryClick(
                        category.name
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#23272f]"
                  >
                    <span
                      style={{
                        backgroundColor:
                          DONUT_COLORS[
                            index %
                              DONUT_COLORS.length
                          ],
                      }}
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                    />

                    <span className="min-w-0 flex-1 truncate text-xs text-[#c5cad3]">
                      {category.name}
                    </span>

                    <span className="text-xs font-semibold text-white">
                      {percentage.toFixed(
                        1
                      )}
                      %
                    </span>
                  </button>
                );
              }
            )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CAIXA
========================================================= */

function CashRow({
  label,
  value,
  color,
  strong = false,
  formatCurrency,
  onClick,
}: {
  label: string;
  value: number;
  color:
    | "green"
    | "orange"
    | "red";
  strong?: boolean;
  formatCurrency: (
    value: number
  ) => string;
  onClick: () => void;
}) {
  const colors = {
    green: "bg-[#2ac97d]",
    orange: "bg-[#f0a44b]",
    red: "bg-[#ef6464]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-xl bg-[#23272f] px-4 py-3.5 text-left transition hover:bg-[#30353e]"
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full ${colors[color]}`}
        />

        <span
          className={`text-xs ${
            strong
              ? "font-semibold text-white"
              : "text-[#9da4af]"
          }`}
        >
          {label}
        </span>
      </div>

      <span
        className={`font-semibold ${
          strong
            ? "text-base text-white"
            : "text-sm text-white"
        }`}
      >
        {formatCurrency(value)}
      </span>
    </button>
  );
}

/* =========================================================
   COMPARAÇÃO
========================================================= */

function ComparisonCard({
  title,
  previous,
  current,
  percentage,
  positiveIsGood,
  formatCurrency,
}: {
  title: string;
  previous: number;
  current: number;
  percentage: number;
  positiveIsGood: boolean;
  formatCurrency: (
    value: number
  ) => string;
}) {
  const positive =
    percentage >= 0;

  const good =
    positiveIsGood
      ? positive
      : !positive;

  return (
    <div className="rounded-2xl border border-[#363c46] bg-[#23272f] p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-white">
          {title}
        </p>

        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${
            good
              ? "text-[#5ee0a3]"
              : "text-[#ff8d8d]"
          }`}
        >
          {positive ? (
            <ArrowUpRight
              size={14}
            />
          ) : (
            <ArrowDownRight
              size={14}
            />
          )}

          {Math.abs(
            percentage
          ).toFixed(1)}
          %
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6f7682]">
            Mês anterior
          </p>

          <p className="mt-2 text-sm font-semibold text-[#aab0bb]">
            {formatCurrency(
              previous
            )}
          </p>
        </div>

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6f7682]">
            Mês atual
          </p>

          <p className="mt-2 text-sm font-semibold text-white">
            {formatCurrency(current)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL DE DETALHES
========================================================= */

function DashboardDetailsModal({
  modal,
  selectedMonth,
  entryDetails,
  monthAccounts,
  pendingAccounts,
  entries,
  expenses,
  result,
  paid,
  formatCurrency,
  formatDate,
  formatMonth,
  effectiveStatus,
  onClose,
}: {
  modal: DashboardModal;

  selectedMonth: Date;

  entryDetails: {
    id: string;
    name: string;
    value: number;
    dueDay: number;
  }[];

  monthAccounts: Payable[];

  pendingAccounts: Payable[];

  entries: number;
  expenses: number;
  result: number;
  paid: number;

  formatCurrency: (
    value: number
  ) => string;

  formatDate: (
    value: string
  ) => string;

  formatMonth: (
    value: Date
  ) => string;

  effectiveStatus: (
    account: Payable
  ) => string;

  onClose: () => void;
}) {
  let accountsToShow:
    | Payable[]
    | null = null;

  if (modal.type === "expenses") {
    accountsToShow =
      monthAccounts;
  }

  if (modal.type === "pending") {
    accountsToShow =
      pendingAccounts;
  }

  if (modal.type === "category") {
    accountsToShow =
      monthAccounts.filter(
        (account) =>
          (account.category?.trim() ||
            "Outros") ===
          modal.category
      );
  }

  if (modal.type === "month") {
    const key = `${modal.date.getFullYear()}-${String(
      modal.date.getMonth() + 1
    ).padStart(2, "0")}`;

    accountsToShow =
      monthAccounts.filter(
        (account) =>
          account.due_date.startsWith(
            key
          )
      );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-[#363c46] bg-[#292e36] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-5 border-b border-[#363c46] px-5 py-5 sm:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7c74ff]">
              Detalhes financeiros
            </p>

            <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
              {modal.title}
            </h2>

            <p className="mt-1 text-xs text-[#8f96a3]">
              {formatMonth(
                selectedMonth
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#3d444f] bg-[#23272f] text-[#a0a7b3] transition hover:bg-[#343a44] hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-7">
          {modal.type === "entries" && (
            <div>
              <ModalTotal
                label="Total de entradas"
                value={entries}
                formatCurrency={
                  formatCurrency
                }
                color="green"
              />

              <div className="mt-5 space-y-2">
                {entryDetails.length ===
                0 ? (
                  <EmptyDetail text="Nenhuma entrada encontrada." />
                ) : (
                  entryDetails.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-xl bg-[#23272f] px-4 py-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17382b] text-[#5ee0a3]">
                          <ArrowUpRight
                            size={17}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs text-[#8f96a3]">
                            Vencimento dia{" "}
                            {item.dueDay}
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-semibold text-[#5ee0a3]">
                          {formatCurrency(
                            item.value
                          )}
                        </p>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          )}

          {modal.type === "result" && (
            <div>
              <ModalTotal
                label="Resultado do mês"
                value={result}
                formatCurrency={
                  formatCurrency
                }
                color={
                  result >= 0
                    ? "green"
                    : "red"
                }
              />

              <div className="mt-6 space-y-3">
                <ResultRow
                  label="Entradas"
                  value={entries}
                  formatCurrency={
                    formatCurrency
                  }
                />

                <ResultRow
                  label="Gastos"
                  value={expenses}
                  formatCurrency={
                    formatCurrency
                  }
                />

                <ResultRow
                  label="Já pago"
                  value={paid}
                  formatCurrency={
                    formatCurrency
                  }
                />

                <div className="border-t border-[#363c46]" />

                <ResultRow
                  label="Resultado"
                  value={result}
                  strong
                  formatCurrency={
                    formatCurrency
                  }
                />
              </div>
            </div>
          )}

          {accountsToShow && (
            <div>
              <ModalTotal
                label={
                  modal.type ===
                  "pending"
                    ? "Total a pagar"
                    : modal.type ===
                      "category"
                    ? modal.category
                    : "Total"
                }
                value={accountsToShow.reduce(
                  (
                    total,
                    account
                  ) =>
                    total +
                    Number(
                      account.amount ||
                        0
                    ),
                  0
                )}
                formatCurrency={
                  formatCurrency
                }
                color={
                  modal.type ===
                  "pending"
                    ? "yellow"
                    : "orange"
                }
              />

              <div className="mt-5 space-y-2">
                {accountsToShow.length ===
                0 ? (
                  <EmptyDetail text="Nenhum lançamento encontrado." />
                ) : (
                  accountsToShow.map(
                    (account) => (
                      <div
                        key={account.id}
                        className="flex flex-col gap-3 rounded-xl bg-[#23272f] px-4 py-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#493221] text-[#f0a44b]">
                          <WalletCards
                            size={17}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {
                              account.description
                            }
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8f96a3]">
                            <span>
                              {
                                account.supplier
                              }
                            </span>

                            <span>
                              {account.category ||
                                "Outros"}
                            </span>

                            <span>
                              {formatDate(
                                account.due_date
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatCurrency(
                              Number(
                                account.amount
                              )
                            )}
                          </p>

                          <StatusText
                            status={effectiveStatus(
                              account
                            )}
                          />
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TOTAL MODAL
========================================================= */

function ModalTotal({
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
    | "yellow"
    | "red";
  formatCurrency: (
    value: number
  ) => string;
}) {
  const colors = {
    green:
      "border-[#315743] bg-[#17382b] text-[#5ee0a3]",
    orange:
      "border-[#664827] bg-[#493221] text-[#f0a44b]",
    yellow:
      "border-[#65582b] bg-[#3d3520] text-[#f3c969]",
    red:
      "border-[#6b3939] bg-[#462525] text-[#ff8d8d]",
  };

  return (
    <div
      className={`rounded-2xl border p-5 ${colors[color]}`}
    >
      <p className="text-xs opacity-75">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

/* =========================================================
   RESULTADO MODAL
========================================================= */

function ResultRow({
  label,
  value,
  strong = false,
  formatCurrency,
}: {
  label: string;
  value: number;
  strong?: boolean;
  formatCurrency: (
    value: number
  ) => string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#23272f] px-4 py-4">
      <p
        className={`text-sm ${
          strong
            ? "font-semibold text-white"
            : "text-[#8f96a3]"
        }`}
      >
        {label}
      </p>

      <p
        className={`font-semibold ${
          strong
            ? value >= 0
              ? "text-lg text-[#5ee0a3]"
              : "text-lg text-[#ff8d8d]"
            : "text-sm text-white"
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusText({
  status,
}: {
  status: string;
}) {
  if (status === "paid") {
    return (
      <p className="mt-1 text-[10px] font-semibold text-[#5ee0a3]">
        Pago
      </p>
    );
  }

  if (status === "overdue") {
    return (
      <p className="mt-1 text-[10px] font-semibold text-[#ff8d8d]">
        Vencido
      </p>
    );
  }

  return (
    <p className="mt-1 text-[10px] font-semibold text-[#f3c969]">
      Pendente
    </p>
  );
}

/* =========================================================
   VAZIO
========================================================= */

function EmptyDetail({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#3d444f] bg-[#23272f] px-5 py-10 text-center text-sm text-[#8f96a3]">
      {text}
    </div>
  );
}