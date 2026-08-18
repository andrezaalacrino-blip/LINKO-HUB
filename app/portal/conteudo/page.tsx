"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Megaphone,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Smartphone,
  Video,
  X,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/client";

/* =========================================================
   TIPOS
========================================================= */

type ContentType =
  | "post"
  | "carousel"
  | "reels"
  | "story"
  | "recording";

type TaskStatus =
  | "todo"
  | "production"
  | "review"
  | "approved"
  | "published";

type Priority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

type Client = {
  id: string;
  name: string;
  trade_name: string | null;
};

type MarketingTask = {
  id: string;
  client_id: string;
  responsible_user_id: string | null;
  content_type: ContentType;
  title: string;
  theme: string | null;
  caption: string | null;
  script: string | null;
  cta: string | null;
  notes: string | null;
  art_url: string | null;
  content_data: any;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  publish_date: string | null;
  created_at: string;
  updated_at: string;
};

type TaskForm = {
  content_type: ContentType;
  title: string;
  theme: string;
  caption: string;
  script: string;
  cta: string;
  notes: string;
  publish_date: string;
  content_data: any;
};

const COLUMNS: {
  id: TaskStatus;
  title: string;
  description: string;
}[] = [
  {
    id: "todo",
    title: "A fazer",
    description: "Solicitações enviadas",
  },
  {
    id: "production",
    title: "Em produção",
    description: "Equipe trabalhando",
  },
  {
    id: "review",
    title: "Para revisar",
    description: "Aguardando sua aprovação",
  },
  {
    id: "approved",
    title: "Aprovado",
    description: "Conteúdo aprovado",
  },
  {
    id: "published",
    title: "Publicado",
    description: "Conteúdo finalizado",
  },
];

const CONTENT_TYPES: {
  value: ContentType;
  label: string;
}[] = [
  {
    value: "post",
    label: "Post",
  },
  {
    value: "carousel",
    label: "Carrossel",
  },
  {
    value: "reels",
    label: "Reels",
  },
  {
    value: "story",
    label: "Story",
  },
  {
    value: "recording",
    label: "Gravação",
  },
];

const EMPTY_FORM: TaskForm = {
  content_type: "post",
  title: "",
  theme: "",
  caption: "",
  script: "",
  cta: "",
  notes: "",
  publish_date: "",
  content_data: {},
};

export default function ClientContentPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [client, setClient] =
    useState<Client | null>(null);

  const [tasks, setTasks] =
    useState<MarketingTask[]>([]);

  const [artUrls, setArtUrls] =
    useState<Record<string, string>>(
      {}
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [reviewing, setReviewing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingTask,
    setEditingTask,
  ] =
    useState<MarketingTask | null>(
      null
    );

  const [
    reviewTask,
    setReviewTask,
  ] =
    useState<MarketingTask | null>(
      null
    );

  const [
    showChangeRequest,
    setShowChangeRequest,
  ] =
    useState(false);

  const [
    changeRequest,
    setChangeRequest,
  ] =
    useState("");

  const [form, setForm] =
    useState<TaskForm>(
      EMPTY_FORM
    );

  useEffect(() => {
    loadData();
  }, []);

  function extractStoragePath(
    value: string | null
  ) {
    if (!value) {
      return "";
    }

    if (
      !value.startsWith("http")
    ) {
      return value;
    }

    const publicMarker =
      "/storage/v1/object/public/marketing-arts/";

    const signedMarker =
      "/storage/v1/object/sign/marketing-arts/";

    if (
      value.includes(
        publicMarker
      )
    ) {
      return decodeURIComponent(
        value
          .split(publicMarker)[1]
          .split("?")[0]
      );
    }

    if (
      value.includes(
        signedMarker
      )
    ) {
      return decodeURIComponent(
        value
          .split(signedMarker)[1]
          .split("?")[0]
      );
    }

    return "";
  }

  async function loadArtUrls(
    taskList: MarketingTask[]
  ) {
    const nextUrls: Record<
      string,
      string
    > = {};

    await Promise.all(
      taskList.map(
        async (task) => {
          if (!task.art_url) {
            return;
          }

          const path =
            extractStoragePath(
              task.art_url
            );

          if (!path) {
            return;
          }

          const {
            data,
            error,
          } =
            await supabase.storage
              .from(
                "marketing-arts"
              )
              .createSignedUrl(
                path,
                60 * 60
              );

          if (
            !error &&
            data?.signedUrl
          ) {
            nextUrls[
              task.id
            ] =
              data.signedUrl;
          }
        }
      )
    );

    setArtUrls(
      nextUrls
    );
  }

  async function loadData() {
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

    const {
      data: link,
      error: linkError,
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
      linkError ||
      !link
    ) {
      setError(
        "Seu usuário ainda não está vinculado a um cliente."
      );

      setLoading(false);

      return;
    }

    const [
      clientResult,
      taskResult,
    ] =
      await Promise.all([
        supabase
          .from("clients")
          .select(
            `
            id,
            name,
            trade_name
            `
          )
          .eq(
            "id",
            link.client_id
          )
          .maybeSingle(),

        supabase
          .from(
            "marketing_tasks"
          )
          .select("*")
          .eq(
            "client_id",
            link.client_id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),
      ]);

    if (
      clientResult.error ||
      !clientResult.data
    ) {
      setError(
        "Não foi possível carregar sua empresa."
      );

      setLoading(false);

      return;
    }

    if (
      taskResult.error
    ) {
      console.error(
        taskResult.error
      );

      setError(
        "Não foi possível carregar seus conteúdos."
      );

      setLoading(false);

      return;
    }

    setClient(
      clientResult.data
    );

    const loadedTasks =
      (
        taskResult.data ||
        []
      ) as MarketingTask[];

    setTasks(
      loadedTasks
    );

    await loadArtUrls(
      loadedTasks
    );

    setLoading(false);
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
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

  function contentTypeLabel(
    type: ContentType
  ) {
    return (
      CONTENT_TYPES.find(
        (item) =>
          item.value === type
      )?.label ||
      type
    );
  }

  function getTypeIcon(
    type: ContentType,
    size = 15
  ) {
    if (
      type === "post"
    ) {
      return (
        <ImageIcon
          size={size}
        />
      );
    }

    if (
      type ===
      "carousel"
    ) {
      return (
        <Layers3
          size={size}
        />
      );
    }

    if (
      type === "reels"
    ) {
      return (
        <Clapperboard
          size={size}
        />
      );
    }

    if (
      type === "story"
    ) {
      return (
        <Smartphone
          size={size}
        />
      );
    }

    return (
      <Video
        size={size}
      />
    );
  }

  function updateField(
    field: keyof TaskForm,
    value: any
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function openNewTask() {
    setEditingTask(null);

    setForm({
      ...EMPTY_FORM,
    });

    setError("");

    setSuccess("");

    setShowForm(true);
  }

  function openTask(
    task: MarketingTask
  ) {
    /*
     * Se está em revisão,
     * abre o painel de aprovação.
     */

    if (
      task.status === "review"
    ) {
      setReviewTask(task);

      setChangeRequest("");

      setShowChangeRequest(
        false
      );

      return;
    }

    /*
     * Conteúdo publicado:
     * deixamos somente visualização
     * pelo painel de revisão.
     */

    if (
      task.status ===
      "published"
    ) {
      setReviewTask(task);

      setChangeRequest("");

      setShowChangeRequest(
        false
      );

      return;
    }

    /*
     * Demais etapas:
     * abre formulário para edição.
     */

    setEditingTask(task);

    setForm({
      content_type:
        task.content_type,

      title:
        task.title || "",

      theme:
        task.theme || "",

      caption:
        task.caption || "",

      script:
        task.script || "",

      cta:
        task.cta || "",

      notes:
        task.notes || "",

      publish_date:
        task.publish_date ||
        "",

      content_data:
        task.content_data ||
        {},
    });

    setError("");

    setSuccess("");

    setShowForm(true);
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!client) {
      return;
    }

    if (
      !form.title.trim()
    ) {
      setError(
        "Informe o título do conteúdo."
      );

      return;
    }

    setSaving(true);

    setError("");

    setSuccess("");

    try {
      const payload = {
        client_id:
          client.id,

        content_type:
          form.content_type,

        title:
          form.title.trim(),

        theme:
          form.theme.trim() ||
          null,

        caption:
          form.caption.trim() ||
          null,

        script:
          form.script.trim() ||
          null,

        cta:
          form.cta.trim() ||
          null,

        notes:
          form.notes.trim() ||
          null,

        publish_date:
          form.publish_date ||
          null,

        content_data:
          form.content_data ||
          {},

        updated_at:
          new Date()
            .toISOString(),
      };

      if (
        editingTask
      ) {
        /*
         * Evita editar
         * review/approved/published
         * usando estado antigo.
         */

        if (
          [
            "review",
            "approved",
            "published",
          ].includes(
            editingTask.status
          )
        ) {
          throw new Error(
            "Este conteúdo não pode mais ser editado diretamente."
          );
        }

        const {
          error:
            updateError,
        } =
          await supabase
            .from(
              "marketing_tasks"
            )
            .update(
              payload
            )
            .eq(
              "id",
              editingTask.id
            )
            .eq(
              "client_id",
              client.id
            );

        if (
          updateError
        ) {
          throw updateError;
        }

        setSuccess(
          "Conteúdo atualizado."
        );
      } else {
        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "marketing_tasks"
            )
            .insert({
              ...payload,

              status:
                "todo",

              priority:
                "normal",

              responsible_user_id:
                null,

              due_date:
                null,

              art_url:
                null,
            });

        if (
          insertError
        ) {
          throw insertError;
        }

        setSuccess(
          "Conteúdo enviado para a equipe."
        );
      }

      setShowForm(false);

      setEditingTask(null);

      setForm({
        ...EMPTY_FORM,
      });

      await loadData();
    } catch (error) {
      console.error(
        "Erro ao salvar conteúdo:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o conteúdo."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     APROVAR
  ======================================================= */

  async function approveContent() {
    if (!reviewTask) {
      return;
    }

    setReviewing(true);

    setError("");

    setSuccess("");

    try {
      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          "client_review_marketing_task",
          {
            p_task_id:
              reviewTask.id,

            p_action:
              "approve",

            p_message:
              null,
          }
        );

      if (
        rpcError
      ) {
        throw rpcError;
      }

      setReviewTask(null);

      setSuccess(
        "Conteúdo aprovado com sucesso."
      );

      await loadData();
    } catch (error) {
      console.error(
        "Erro ao aprovar:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível aprovar o conteúdo."
      );
    } finally {
      setReviewing(false);
    }
  }

  /* =======================================================
     SOLICITAR ALTERAÇÃO
  ======================================================= */

  async function requestChanges() {
    if (
      !reviewTask
    ) {
      return;
    }

    if (
      !changeRequest.trim()
    ) {
      setError(
        "Explique o que precisa ser alterado."
      );

      return;
    }

    setReviewing(true);

    setError("");

    setSuccess("");

    try {
      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          "client_review_marketing_task",
          {
            p_task_id:
              reviewTask.id,

            p_action:
              "request_changes",

            p_message:
              changeRequest.trim(),
          }
        );

      if (
        rpcError
      ) {
        throw rpcError;
      }

      setReviewTask(null);

      setShowChangeRequest(
        false
      );

      setChangeRequest("");

      setSuccess(
        "Alteração solicitada para a equipe."
      );

      await loadData();
    } catch (error) {
      console.error(
        "Erro ao solicitar alteração:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível solicitar a alteração."
      );
    } finally {
      setReviewing(false);
    }
  }

  const filteredTasks =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return tasks.filter(
        (task) => {
          const matchesSearch =
            !term ||
            task.title
              .toLowerCase()
              .includes(term) ||
            task.theme
              ?.toLowerCase()
              .includes(term);

          const matchesType =
            typeFilter ===
              "all" ||
            task.content_type ===
              typeFilter;

          return (
            matchesSearch &&
            matchesType
          );
        }
      );
    }, [
      tasks,
      search,
      typeFilter,
    ]);

  return (
    <AppShell compactHeader>
      {/* CABEÇALHO */}

      <section className="mb-5 overflow-hidden rounded-[20px] border border-[#343a44] bg-[#252a32]">
        <div className="flex flex-col gap-4 border-b border-[#343a44] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#302f48] text-[#aaa5ff]">
              <Megaphone
                size={18}
              />
            </div>

            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#7770ff]">
                Marketing
              </p>

              <h1 className="mt-1 text-xl font-semibold text-white">
                Meu conteúdo
              </h1>

              <p className="mt-1 text-[10px] text-[#7d8592]">
                Acompanhe solicitações, revisões, aprovações e publicações.
              </p>

              {client && (
                <p className="mt-2 text-[8px] font-medium uppercase tracking-[0.1em] text-[#626b78]">
                  {client.trade_name ||
                    client.name}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={
              openNewTask
            }
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#635bff] px-4 text-[10px] font-semibold text-white shadow-lg shadow-[#635bff]/10 transition hover:bg-[#716aff]"
          >
            <Plus
              size={14}
            />

            Novo conteúdo
          </button>
        </div>

        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-[430px]">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#69727f]"
            />

            <input
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar conteúdo..."
              className="h-10 w-full rounded-xl border border-[#3a414c] bg-[#20242b] pl-10 pr-4 text-[10px] text-white outline-none placeholder:text-[#66707e] focus:border-[#635bff]"
            />
          </div>

          <select
            value={
              typeFilter
            }
            onChange={(
              event
            ) =>
              setTypeFilter(
                event.target.value
              )
            }
            className="h-10 rounded-xl border border-[#3a414c] bg-[#20242b] px-3 text-[10px] text-[#b6bdc7] outline-none lg:ml-auto lg:min-w-[170px]"
          >
            <option value="all">
              Todos os formatos
            </option>

            {CONTENT_TYPES.map(
              (type) => (
                <option
                  key={
                    type.value
                  }
                  value={
                    type.value
                  }
                >
                  {
                    type.label
                  }
                </option>
              )
            )}
          </select>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-xl border border-[#5c3a3a] bg-[#352525] px-4 py-3">
          <p className="text-[10px] font-medium text-[#ff9a9a]">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-[#2f5141] bg-[#1d3329] px-4 py-3">
          <p className="text-[10px] font-medium text-[#6fe4aa]">
            {success}
          </p>
        </div>
      )}

      {/* KANBAN */}

      {loading ? (
        <div className="flex min-h-[430px] items-center justify-center">
          <div className="flex items-center gap-3 text-xs text-[#8f96a3]">
            <Loader2
              size={17}
              className="animate-spin"
            />

            Carregando seus conteúdos...
          </div>
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-5">
          <div className="flex min-w-[1220px] items-start">
            {COLUMNS.map(
              (
                column,
                index
              ) => {
                const columnTasks =
                  filteredTasks.filter(
                    (task) =>
                      task.status ===
                      column.id
                  );

                return (
                  <div
                    key={
                      column.id
                    }
                    className={`w-[244px] shrink-0 px-2.5 ${
                      index !==
                      COLUMNS.length -
                        1
                        ? "border-r border-[#303640]"
                        : ""
                    }`}
                  >
                    <div className="mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#e2e5ea]">
                          {
                            column.title
                          }
                        </h2>

                        <span
                          className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[7px] font-bold ${
                            column.id ===
                            "todo"
                              ? "bg-[#343a44] text-[#a2a9b5]"
                              : column.id ===
                                "production"
                              ? "bg-[#302f48] text-[#aaa5ff]"
                              : column.id ===
                                "review"
                              ? "bg-[#493221] text-[#f0a44b]"
                              : column.id ===
                                "approved"
                              ? "bg-[#17382b] text-[#5ee0a3]"
                              : "bg-[#243749] text-[#70bfff]"
                          }`}
                        >
                          {
                            columnTasks.length
                          }
                        </span>
                      </div>

                      <p className="mt-1 text-[7.5px] text-[#68717f]">
                        {
                          column.description
                        }
                      </p>
                    </div>

                    <div className="min-h-[400px] rounded-[14px] border border-[#343a44] bg-[#22262e] p-2">
                      <div className="space-y-2.5">
                        {columnTasks.map(
                          (task) => (
                            <ClientContentCard
                              key={
                                task.id
                              }
                              task={
                                task
                              }
                              artUrl={
                                artUrls[
                                  task.id
                                ] ||
                                ""
                              }
                              formatDate={
                                formatDate
                              }
                              contentTypeLabel={
                                contentTypeLabel
                              }
                              getTypeIcon={
                                getTypeIcon
                              }
                              onOpen={() =>
                                openTask(
                                  task
                                )
                              }
                            />
                          )
                        )}

                        {columnTasks.length ===
                          0 && (
                          <div className="flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-[#373e49] bg-[#20242b]/40 px-4 text-center">
                            <p className="text-[8px] text-[#68717f]">
                              Nenhum conteúdo nesta etapa
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* ===============================================
          MODAL CRIAR / EDITAR
      =============================================== */}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[22px] border border-[#363c46] bg-[#252a32] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#363c46] px-5 py-5">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-[#7770ff]">
                  Meu conteúdo
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  {editingTask
                    ? "Editar conteúdo"
                    : "Novo conteúdo"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    false
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb]"
              >
                <X
                  size={15}
                />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <label className="mb-3 block text-[9px] font-medium text-[#b6bcc6]">
                  Tipo de conteúdo
                </label>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {CONTENT_TYPES.map(
                    (type) => {
                      const selected =
                        form.content_type ===
                        type.value;

                      return (
                        <button
                          key={
                            type.value
                          }
                          type="button"
                          onClick={() =>
                            updateField(
                              "content_type",
                              type.value
                            )
                          }
                          className={`rounded-xl border p-3 text-left ${
                            selected
                              ? "border-[#635bff] bg-[#635bff]/10"
                              : "border-[#3d444f] bg-[#23272f]"
                          }`}
                        >
                          <div className="text-[#aaa5ff]">
                            {getTypeIcon(
                              type.value,
                              14
                            )}
                          </div>

                          <p className="mt-2 text-[9px] font-semibold text-white">
                            {
                              type.label
                            }
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Título *"
                    value={
                      form.title
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "title",
                        value
                      )
                    }
                  />

                  <InputField
                    label="Tema"
                    value={
                      form.theme
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "theme",
                        value
                      )
                    }
                  />
                </div>

                <div className="mt-4">
                  <TextAreaField
                    label={
                      form.content_type ===
                      "reels"
                        ? "Roteiro / ideia"
                        : form.content_type ===
                          "recording"
                        ? "Briefing da gravação"
                        : "Legenda / orientação"
                    }
                    value={
                      form.content_type ===
                        "reels" ||
                      form.content_type ===
                        "recording"
                        ? form.script
                        : form.caption
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        form.content_type ===
                          "reels" ||
                          form.content_type ===
                            "recording"
                          ? "script"
                          : "caption",
                        value
                      )
                    }
                    rows={6}
                  />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="CTA"
                    value={
                      form.cta
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "cta",
                        value
                      )
                    }
                  />

                  <InputField
                    label="Data desejada para publicação"
                    type="date"
                    value={
                      form.publish_date
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "publish_date",
                        value
                      )
                    }
                  />
                </div>

                <div className="mt-4">
                  <TextAreaField
                    label="Observações"
                    value={
                      form.notes
                    }
                    onChange={(
                      value
                    ) =>
                      updateField(
                        "notes",
                        value
                      )
                    }
                    rows={5}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#363c46] bg-[#23272f] px-5 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(
                      false
                    )
                  }
                  className="h-10 rounded-xl border border-[#3d444f] bg-[#292e36] px-4 text-[9px] font-semibold text-[#c5cad3]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#635bff] px-4 text-[9px] font-semibold text-white disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <Check
                      size={13}
                    />
                  )}

                  {saving
                    ? "Salvando..."
                    : editingTask
                    ? "Salvar alterações"
                    : "Criar conteúdo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===============================================
          MODAL REVISÃO / VISUALIZAÇÃO
      =============================================== */}

      {reviewTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-[780px] flex-col overflow-hidden rounded-[22px] border border-[#363c46] bg-[#252a32] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#363c46] p-5">
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-[#7770ff]">
                  {reviewTask.status ===
                  "review"
                    ? "Aguardando sua revisão"
                    : contentTypeLabel(
                        reviewTask.content_type
                      )}
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  {
                    reviewTask.title
                  }
                </h2>

                {reviewTask.publish_date && (
                  <p className="mt-1 text-[9px] text-[#7d8592]">
                    Publicação prevista para{" "}
                    {formatDate(
                      reviewTask.publish_date
                    )}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setReviewTask(
                    null
                  );

                  setShowChangeRequest(
                    false
                  );

                  setChangeRequest(
                    ""
                  );
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb]"
              >
                <X
                  size={15}
                />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {/* ARTE GRANDE */}

              {artUrls[
                reviewTask.id
              ] && (
                <div className="overflow-hidden rounded-[18px] border border-[#363c46] bg-[#1c2026]">
                  <img
                    src={
                      artUrls[
                        reviewTask.id
                      ]
                    }
                    alt={
                      reviewTask.title
                    }
                    className="mx-auto max-h-[520px] w-auto max-w-full object-contain"
                  />
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <DetailCard
                  label="Formato"
                  value={contentTypeLabel(
                    reviewTask.content_type
                  )}
                />

                <DetailCard
                  label="Status"
                  value={
                    reviewTask.status ===
                    "review"
                      ? "Para revisar"
                      : reviewTask.status ===
                        "approved"
                      ? "Aprovado"
                      : reviewTask.status ===
                        "published"
                      ? "Publicado"
                      : reviewTask.status
                  }
                />
              </div>

              {reviewTask.theme && (
                <DetailText
                  label="Tema"
                  value={
                    reviewTask.theme
                  }
                />
              )}

              {reviewTask.caption && (
                <DetailText
                  label="Legenda"
                  value={
                    reviewTask.caption
                  }
                />
              )}

              {reviewTask.script && (
                <DetailText
                  label="Roteiro"
                  value={
                    reviewTask.script
                  }
                />
              )}

              {showChangeRequest && (
                <div className="mt-5 rounded-[16px] border border-[#493221] bg-[#2b271f] p-4">
                  <label className="mb-2 block text-[9px] font-semibold text-[#f0a44b]">
                    O que precisa ser alterado?
                  </label>

                  <textarea
                    rows={5}
                    value={
                      changeRequest
                    }
                    onChange={(
                      event
                    ) =>
                      setChangeRequest(
                        event.target.value
                      )
                    }
                    placeholder="Ex.: alterar a cor, ajustar o texto do card 2..."
                    className="w-full resize-none rounded-xl border border-[#554532] bg-[#22262e] px-3 py-3 text-[10px] leading-5 text-white outline-none placeholder:text-[#71685b] focus:border-[#f0a44b]"
                  />

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setShowChangeRequest(
                          false
                        )
                      }
                      className="h-9 rounded-xl border border-[#3d444f] px-3 text-[9px] font-semibold text-[#aab0bb]"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={
                        requestChanges
                      }
                      disabled={
                        reviewing
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#a66b2e] px-3 text-[9px] font-semibold text-white disabled:opacity-50"
                    >
                      {reviewing && (
                        <Loader2
                          size={12}
                          className="animate-spin"
                        />
                      )}

                      Enviar solicitação
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BOTÕES APENAS EM REVIEW */}

            {reviewTask.status ===
              "review" && (
              <div className="flex flex-col gap-2 border-t border-[#363c46] bg-[#23272f] p-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={
                    reviewing
                  }
                  onClick={() => {
                    setError("");

                    setShowChangeRequest(
                      true
                    );
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#60482f] bg-[#332a20] px-4 text-[9px] font-semibold text-[#f0b46c]"
                >
                  <MessageSquareText
                    size={13}
                  />

                  Solicitar alteração
                </button>

                <button
                  type="button"
                  disabled={
                    reviewing
                  }
                  onClick={
                    approveContent
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#25895e] px-5 text-[9px] font-semibold text-white transition hover:bg-[#2a9c6a] disabled:opacity-50"
                >
                  {reviewing ? (
                    <Loader2
                      size={13}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCircle2
                      size={14}
                    />
                  )}

                  Aprovar conteúdo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* =========================================================
   CARD
========================================================= */

function ClientContentCard({
  task,
  artUrl,
  formatDate,
  contentTypeLabel,
  getTypeIcon,
  onOpen,
}: {
  task: MarketingTask;
  artUrl: string;
  formatDate: (
    value: string | null
  ) => string;
  contentTypeLabel: (
    type: ContentType
  ) => string;
  getTypeIcon: (
    type: ContentType,
    size?: number
  ) => React.ReactNode;
  onOpen: () => void;
}) {
  const isReview =
    task.status ===
    "review";

  return (
    <article
      onClick={
        onOpen
      }
      className={`group cursor-pointer overflow-hidden rounded-[14px] border bg-[#2a2f37] shadow-[0_6px_16px_rgba(0,0,0,0.16)] transition hover:-translate-y-0.5 ${
        isReview
          ? "border-[#77552f] hover:border-[#f0a44b]"
          : "border-[#3a414c] hover:border-[#555e6b]"
      }`}
    >
      {artUrl && (
        <div className="relative h-[120px] overflow-hidden bg-[#1d2127]">
          <img
            src={
              artUrl
            }
            alt={
              task.title
            }
            className="h-full w-full object-cover"
          />

          {isReview && (
            <div className="absolute left-2 top-2 rounded-full bg-[#f0a44b] px-2 py-1 text-[7px] font-bold text-[#24180c]">
              Revisar
            </div>
          )}
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#343a44] text-[#a8a4ff]">
            {getTypeIcon(
              task.content_type,
              13
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[7px] font-semibold uppercase tracking-[0.1em] text-[#7f8895]">
              {contentTypeLabel(
                task.content_type
              )}
            </p>

            <h3 className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-white">
              {
                task.title
              }
            </h3>
          </div>
        </div>

        {task.theme && (
          <p className="mt-2 line-clamp-2 text-[8px] leading-4 text-[#8c949f]">
            {
              task.theme
            }
          </p>
        )}

        {isReview && (
          <div className="mt-3 rounded-lg bg-[#493221] px-2.5 py-2">
            <p className="text-[8px] font-semibold text-[#f0a44b]">
              Aguardando sua aprovação
            </p>
          </div>
        )}

        <div className="mt-3 border-t border-[#3a414c] pt-3">
          {task.publish_date ? (
            <div className="flex items-center gap-1.5 text-[8px] text-[#818a97]">
              <CalendarDays
                size={9}
              />

              {formatDate(
                task.publish_date
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[8px] text-[#68717f]">
              <Clock3
                size={9}
              />

              Sem data definida
            </div>
          )}
        </div>

        <div className="mt-2 flex justify-end">
          <span className="inline-flex items-center gap-1 text-[7px] text-[#727b88] opacity-0 transition group-hover:opacity-100">
            <Pencil
              size={8}
            />

            {isReview
              ? "Revisar"
              : "Abrir"}
          </span>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   DETALHES
========================================================= */

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#363c46] bg-[#22262e] p-4">
      <p className="text-[8px] text-[#747c89]">
        {label}
      </p>

      <p className="mt-2 text-[10px] font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function DetailText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-4 rounded-[14px] border border-[#363c46] bg-[#22262e] p-4">
      <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[#7770ff]">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-[#c4c9d1]">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   INPUT
========================================================= */

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-medium text-[#b6bcc6]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="h-10 w-full rounded-xl border border-[#3d444f] bg-[#23272f] px-3 text-[10px] text-white outline-none focus:border-[#635bff]"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-medium text-[#b6bcc6]">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="w-full resize-none rounded-xl border border-[#3d444f] bg-[#23272f] px-3 py-3 text-[10px] leading-5 text-white outline-none focus:border-[#635bff]"
      />
    </div>
  );
}