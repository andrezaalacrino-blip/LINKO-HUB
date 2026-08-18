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
  Clapperboard,
  Clock3,
  GripVertical,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Smartphone,
  Trash2,
  UserRound,
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

type UserRole =
  | "admin"
  | "team"
  | "client";

type Client = {
  id: string;
  name: string;
  trade_name: string | null;
  status: "active" | "inactive";
};

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean;
};

type MarketingTask = {
  id: string;

  client_id: string;

  responsible_user_id:
    | string
    | null;

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

  created_at: string;

  due_date: string | null;
  publish_date: string | null;

  updated_at: string;
};

type TaskForm = {
  client_id: string;

  responsible_user_id: string;

  content_type: ContentType;

  title: string;

  theme: string;

  caption: string;

  script: string;

  cta: string;

  notes: string;

  art_url: string;

  status: TaskStatus;

  priority: Priority;

  due_date: string;

  publish_date: string;

  content_data: any;
};

/* =========================================================
   CONSTANTES
========================================================= */

const COLUMNS: {
  id: TaskStatus;
  title: string;
  description: string;
}[] = [
  {
    id: "todo",
    title: "A fazer",
    description: "Aguardando início",
  },

  {
    id: "production",
    title: "Em produção",
    description: "Conteúdo em execução",
  },

  {
    id: "review",
    title: "Revisão",
    description: "Aguardando validação",
  },

  {
    id: "approved",
    title: "Aprovado",
    description: "Pronto para publicar",
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
  description: string;
}[] = [
  {
    value: "post",
    label: "Post",
    description: "Peça estática para feed",
  },

  {
    value: "carousel",
    label: "Carrossel",
    description: "Conteúdo com vários cards",
  },

  {
    value: "reels",
    label: "Reels",
    description: "Vídeo curto",
  },

  {
    value: "story",
    label: "Story",
    description: "Conteúdo para stories",
  },

  {
    value: "recording",
    label: "Gravação",
    description: "Planejamento de gravação",
  },
];

const EMPTY_FORM: TaskForm = {
  client_id: "",

  responsible_user_id: "",

  content_type: "post",

  title: "",

  theme: "",

  caption: "",

  script: "",

  cta: "",

  notes: "",

  art_url: "",

  status: "todo",

  priority: "normal",

  due_date: "",

  publish_date: "",

  content_data: {
    objective: "",
    reference: "",
  },
};

/* =========================================================
   PAGE
========================================================= */

export default function MarketingPage() {
  const supabase =
    createClient();

  const [
    clients,
    setClients,
  ] =
    useState<Client[]>([]);

  const [
    profiles,
    setProfiles,
  ] =
    useState<Profile[]>([]);

  const [
    tasks,
    setTasks,
  ] =
    useState<MarketingTask[]>([]);

  const [
    artUrls,
    setArtUrls,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    uploadingArt,
    setUploadingArt,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    showForm,
    setShowForm,
  ] =
    useState(false);

  const [
    editingTask,
    setEditingTask,
  ] =
    useState<
      MarketingTask | null
    >(null);

  const [
    currentRole,
    setCurrentRole,
  ] =
    useState<
      UserRole | null
    >(null);

  const [
    form,
    setForm,
  ] =
    useState<TaskForm>(
      EMPTY_FORM
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    clientFilter,
    setClientFilter,
  ] =
    useState("all");

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState("all");

  const [
    draggedTaskId,
    setDraggedTaskId,
  ] =
    useState<
      string | null
    >(null);

  const [
    artFile,
    setArtFile,
  ] =
    useState<
      File | null
    >(null);

  const [
    artPreview,
    setArtPreview,
  ] =
    useState("");

  useEffect(() => {
    loadData();
  }, []);

  /* =======================================================
     STORAGE
  ======================================================= */

  function extractStoragePath(
    value:
      string | null
  ) {
    if (!value) {
      return "";
    }

    if (
      !value.startsWith(
        "http"
      )
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
          .split(
            publicMarker
          )[1]
          .split(
            "?"
          )[0]
      );
    }

    if (
      value.includes(
        signedMarker
      )
    ) {
      return decodeURIComponent(
        value
          .split(
            signedMarker
          )[1]
          .split(
            "?"
          )[0]
      );
    }

    return "";
  }

  async function loadArtUrls(
    taskList:
      MarketingTask[]
  ) {
    const nextUrls: Record<
      string,
      string
    > = {};

    await Promise.all(
      taskList.map(
        async (
          task
        ) => {
          if (
            !task.art_url
          ) {
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
                60 *
                  60
              );

          if (
            error
          ) {
            console.error(
              "Erro ao abrir arte:",
              error
            );

            return;
          }

          if (
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

  /* =======================================================
     LOAD
  ======================================================= */

  async function loadData() {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    const {
      data:
        userData,
    } =
      await supabase.auth.getUser();

    if (
      !userData.user
    ) {
      setMessage(
        "Não foi possível identificar o usuário."
      );

      setLoading(
        false
      );

      return;
    }

    const [
      clientsResult,
      profilesResult,
      tasksResult,
      currentProfileResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "clients"
          )
          .select(
            "id, name, trade_name, status"
          )
          .order(
            "name"
          ),

        supabase
          .from(
            "profiles"
          )
          .select(
            "id, name, email, role, active"
          )
          .eq(
            "active",
            true
          )
          .in(
            "role",
            [
              "admin",
              "team",
            ]
          )
          .order(
            "name"
          ),

        supabase
          .from(
            "marketing_tasks"
          )
          .select(
            "*"
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),

        supabase
          .from(
            "profiles"
          )
          .select(
            "id, role"
          )
          .eq(
            "id",
            userData
              .user
              .id
          )
          .single(),
      ]);

    if (
      clientsResult.error
    ) {
      console.error(
        clientsResult.error
      );
    }

    if (
      profilesResult.error
    ) {
      console.error(
        profilesResult.error
      );
    }

    if (
      tasksResult.error
    ) {
      console.error(
        tasksResult.error
      );

      setMessage(
        "Não foi possível carregar o Kanban."
      );
    }

    if (
      currentProfileResult
        .data
    ) {
      setCurrentRole(
        currentProfileResult
          .data
          .role as UserRole
      );
    }

    setClients(
      clientsResult.data ||
        []
    );

    setProfiles(
      profilesResult.data ||
        []
    );

    const loadedTasks =
      (
        tasksResult.data ||
        []
      ) as MarketingTask[];

    setTasks(
      loadedTasks
    );

    await loadArtUrls(
      loadedTasks
    );

    setLoading(
      false
    );
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  function clientName(
    clientId:
      string
  ) {
    const client =
      clients.find(
        (
          item
        ) =>
          item.id ===
          clientId
      );

    return (
      client?.trade_name ||
      client?.name ||
      "Cliente"
    );
  }

  function responsibleName(
    userId:
      string | null
  ) {
    if (!userId) {
      return "Sem responsável";
    }

    const profile =
      profiles.find(
        (
          item
        ) =>
          item.id ===
          userId
      );

    return (
      profile?.name ||
      profile?.email ||
      "Equipe"
    );
  }

  function contentTypeLabel(
    type:
      ContentType
  ) {
    return (
      CONTENT_TYPES.find(
        (
          item
        ) =>
          item.value ===
          type
      )?.label ||
      type
    );
  }

  function formatDate(
    value:
      string | null
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

  function formatCreationDate(
    value:
      string
  ) {
    return new Intl.DateTimeFormat(
      "pt-BR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        value
      )
    );
  }

  function getTypeIcon(
    type:
      ContentType,
    size =
      16
  ) {
    if (
      type ===
      "post"
    ) {
      return (
        <ImageIcon
          size={
            size
          }
        />
      );
    }

    if (
      type ===
      "carousel"
    ) {
      return (
        <Layers3
          size={
            size
          }
        />
      );
    }

    if (
      type ===
      "reels"
    ) {
      return (
        <Clapperboard
          size={
            size
          }
        />
      );
    }

    if (
      type ===
      "story"
    ) {
      return (
        <Smartphone
          size={
            size
          }
        />
      );
    }

    return (
      <Video
        size={
          size
        }
      />
    );
  }

  function createContentData(
    type:
      ContentType
  ) {
    if (
      type ===
      "post"
    ) {
      return {
        objective:
          "",
        reference:
          "",
      };
    }

    if (
      type ===
      "carousel"
    ) {
      return {
        cards_count:
          4,

        cards: [
          {
            number:
              1,
            text:
              "",
          },

          {
            number:
              2,
            text:
              "",
          },

          {
            number:
              3,
            text:
              "",
          },

          {
            number:
              4,
            text:
              "",
          },
        ],
      };
    }

    if (
      type ===
      "reels"
    ) {
      return {
        hook:
          "",

        duration:
          "",

        needs_recording:
          true,
      };
    }

    if (
      type ===
      "story"
    ) {
      return {
        story_type:
          "simple",

        text:
          "",

        poll_question:
          "",

        poll_option_1:
          "",

        poll_option_2:
          "",

        question_box:
          "",

        quiz_question:
          "",

        quiz_option_1:
          "",

        quiz_option_2:
          "",

        quiz_option_3:
          "",

        quiz_correct:
          "",
      };
    }

    return {
      recording_date:
        "",

      location:
        "",

      participants:
        "",

      video_count:
        1,

      briefing:
        "",
    };
  }

  /* =======================================================
     FORM
  ======================================================= */

  function updateField(
    field:
      keyof TaskForm,
    value:
      any
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,

        [field]:
          value,
      })
    );
  }

  function updateContentData(
    field:
      string,
    value:
      any
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,

        content_data: {
          ...current
            .content_data,

          [field]:
            value,
        },
      })
    );
  }

  function changeContentType(
    type:
      ContentType
  ) {
    setForm(
      (
        current
      ) => ({
        ...current,

        content_type:
          type,

        theme:
          "",

        caption:
          "",

        script:
          "",

        cta:
          "",

        content_data:
          createContentData(
            type
          ),
      })
    );
  }

  function openNewTask() {
    setEditingTask(
      null
    );

    setForm({
      ...EMPTY_FORM,

      content_data:
        createContentData(
          "post"
        ),
    });

    setArtFile(
      null
    );

    setArtPreview(
      ""
    );

    setMessage(
      ""
    );

    setShowForm(
      true
    );
  }

  async function openEditTask(
    task:
      MarketingTask
  ) {
    setEditingTask(
      task
    );

    setForm({
      client_id:
        task.client_id,

      responsible_user_id:
        task.responsible_user_id ||
        "",

      content_type:
        task.content_type,

      title:
        task.title ||
        "",

      theme:
        task.theme ||
        "",

      caption:
        task.caption ||
        "",

      script:
        task.script ||
        "",

      cta:
        task.cta ||
        "",

      notes:
        task.notes ||
        "",

      art_url:
        task.art_url ||
        "",

      status:
        task.status,

      priority:
        task.priority,

      due_date:
        task.due_date ||
        "",

      publish_date:
        task.publish_date ||
        "",

      content_data:
        task.content_data ||
        createContentData(
          task.content_type
        ),
    });

    setArtFile(
      null
    );

    if (
      task.art_url
    ) {
      const path =
        extractStoragePath(
          task.art_url
        );

      if (path) {
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
              60 *
                60
            );

        if (
          !error &&
          data?.signedUrl
        ) {
          setArtPreview(
            data.signedUrl
          );
        } else {
          setArtPreview(
            ""
          );
        }
      }
    } else {
      setArtPreview(
        ""
      );
    }

    setMessage(
      ""
    );

    setShowForm(
      true
    );
  }

  /* =======================================================
     CARROSSEL
  ======================================================= */

  function changeCardCount(
    count:
      number
  ) {
    const safeCount =
      Math.max(
        2,
        Math.min(
          10,
          count
        )
      );

    const currentCards =
      Array.isArray(
        form
          .content_data
          ?.cards
      )
        ? form
            .content_data
            .cards
        : [];

    const newCards =
      Array.from({
        length:
          safeCount,
      }).map(
        (
          _,
          index
        ) =>
          currentCards[
            index
          ] || {
            number:
              index +
              1,

            text:
              "",
          }
      );

    setForm(
      (
        current
      ) => ({
        ...current,

        content_data: {
          ...current
            .content_data,

          cards_count:
            safeCount,

          cards:
            newCards,
        },
      })
    );
  }

  function updateCarouselCard(
    index:
      number,
    value:
      string
  ) {
    const currentCards =
      [
        ...(form
          .content_data
          ?.cards ||
          []),
      ];

    currentCards[
      index
    ] = {
      number:
        index +
        1,

      text:
        value,
    };

    setForm(
      (
        current
      ) => ({
        ...current,

        content_data: {
          ...current
            .content_data,

          cards:
            currentCards,
        },
      })
    );
  }

  /* =======================================================
     ARTE
  ======================================================= */

  function handleArtFile(
    file:
      File | null
  ) {
    if (!file) {
      return;
    }

    const allowedTypes =
      [
        "image/png",
        "image/jpeg",
      ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setMessage(
        "A arte deve estar em PNG ou JPG."
      );

      return;
    }

    const maxSize =
      10 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {
      setMessage(
        "A arte deve ter no máximo 10 MB."
      );

      return;
    }

    setArtFile(
      file
    );

    if (
      artPreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        artPreview
      );
    }

    const preview =
      URL.createObjectURL(
        file
      );

    setArtPreview(
      preview
    );

    setMessage(
      ""
    );
  }

  function removeSelectedArt() {
    if (
      artPreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        artPreview
      );
    }

    setArtFile(
      null
    );

    setArtPreview(
      ""
    );

    updateField(
      "art_url",
      ""
    );
  }

  async function uploadArt(
    taskId:
      string
  ) {
    if (
      !artFile
    ) {
      return (
        extractStoragePath(
          form.art_url
        ) ||
        null
      );
    }

    setUploadingArt(
      true
    );

    const extension =
      artFile.name
        .split(
          "."
        )
        .pop()
        ?.toLowerCase() ||
      "jpg";

    const filePath =
      `${form.client_id}/${taskId}/arte-${Date.now()}.${extension}`;

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          "marketing-arts"
        )
        .upload(
          filePath,
          artFile,
          {
            cacheControl:
              "3600",

            upsert:
              true,

            contentType:
              artFile.type,
          }
        );

    if (
      uploadError
    ) {
      setUploadingArt(
        false
      );

      throw new Error(
        "Não foi possível enviar a arte."
      );
    }

    setUploadingArt(
      false
    );

    return filePath;
  }

  /* =======================================================
     SALVAR
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent
  ) {
    event.preventDefault();

    if (
      !form.client_id
    ) {
      setMessage(
        "Selecione um cliente."
      );

      return;
    }

    if (
      !form.title.trim()
    ) {
      setMessage(
        "Informe o título interno."
      );

      return;
    }

    if (
      !form.publish_date
    ) {
      setMessage(
        "Informe a data de publicação."
      );

      return;
    }

    setSaving(
      true
    );

    setMessage(
      ""
    );

    try {
      const payload =
        {
          client_id:
            form.client_id,

          responsible_user_id:
            form.responsible_user_id ||
            null,

          content_type:
            form.content_type,

          title:
            form.title.trim(),

          theme:
            form.theme ||
            null,

          caption:
            form.caption ||
            null,

          script:
            form.script ||
            null,

          cta:
            form.cta ||
            null,

          notes:
            form.notes ||
            null,

          content_data:
            form.content_data ||
            {},

          status:
            form.status,

          priority:
            form.priority,

          due_date:
            form.due_date ||
            null,

          publish_date:
            form.publish_date ||
            null,

          updated_at:
            new Date()
              .toISOString(),
        };

      if (
        editingTask
      ) {
        let finalArtPath =
          form.art_url
            ? extractStoragePath(
                form.art_url
              )
            : null;

        if (
          artFile
        ) {
          finalArtPath =
            await uploadArt(
              editingTask.id
            );
        }

        const {
          error,
        } =
          await supabase
            .from(
              "marketing_tasks"
            )
            .update({
              ...payload,

              art_url:
                finalArtPath,
            })
            .eq(
              "id",
              editingTask.id
            );

        if (
          error
        ) {
          throw error;
        }
      } else {
        const {
          data:
            createdTask,

          error:
            createError,
        } =
          await supabase
            .from(
              "marketing_tasks"
            )
            .insert({
              ...payload,

              art_url:
                null,
            })
            .select(
              "id"
            )
            .single();

        if (
          createError
        ) {
          throw createError;
        }

        if (
          artFile &&
          createdTask
        ) {
          const finalArtPath =
            await uploadArt(
              createdTask.id
            );

          const {
            error:
              artError,
          } =
            await supabase
              .from(
                "marketing_tasks"
              )
              .update({
                art_url:
                  finalArtPath,
              })
              .eq(
                "id",
                createdTask.id
              );

          if (
            artError
          ) {
            throw artError;
          }
        }
      }

      setShowForm(
        false
      );

      setArtFile(
        null
      );

      setArtPreview(
        ""
      );

      await loadData();
    } catch (
      error
    ) {
      console.error(
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Não foi possível salvar."
      );
    } finally {
      setSaving(
        false
      );

      setUploadingArt(
        false
      );
    }
  }

  /* =======================================================
     EXCLUIR
  ======================================================= */

  async function deleteTask() {
    if (
      !editingTask ||
      currentRole !==
        "admin"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Excluir este conteúdo?"
      );

    if (
      !confirmed
    ) {
      return;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "marketing_tasks"
        )
        .delete()
        .eq(
          "id",
          editingTask.id
        );

    if (
      error
    ) {
      setMessage(
        "Não foi possível excluir."
      );

      return;
    }

    setShowForm(
      false
    );

    await loadData();
  }

  /* =======================================================
     DRAG DROP
  ======================================================= */

  async function moveTask(
    taskId:
      string,
    status:
      TaskStatus
  ) {
    const current =
      tasks.find(
        (
          item
        ) =>
          item.id ===
          taskId
      );

    if (
      !current ||
      current.status ===
        status
    ) {
      return;
    }

    setTasks(
      (
        currentTasks
      ) =>
        currentTasks.map(
          (
            task
          ) =>
            task.id ===
            taskId
              ? {
                  ...task,

                  status,
                }
              : task
        )
    );

    const {
      error,
    } =
      await supabase
        .from(
          "marketing_tasks"
        )
        .update({
          status,

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          taskId
        );

    if (
      error
    ) {
      await loadData();
    }
  }

  function handleDrop(
    status:
      TaskStatus
  ) {
    if (
      !draggedTaskId
    ) {
      return;
    }

    moveTask(
      draggedTaskId,
      status
    );

    setDraggedTaskId(
      null
    );
  }

  /* =======================================================
     FILTROS
  ======================================================= */

  const filteredTasks =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return tasks.filter(
        (
          task
        ) => {
          const client =
            clientName(
              task.client_id
            ).toLowerCase();

          const matchesSearch =
            !term ||
            task.title
              .toLowerCase()
              .includes(
                term
              ) ||
            client.includes(
              term
            ) ||
            task.theme
              ?.toLowerCase()
              .includes(
                term
              );

          const matchesClient =
            clientFilter ===
              "all" ||
            task.client_id ===
              clientFilter;

          const matchesType =
            typeFilter ===
              "all" ||
            task.content_type ===
              typeFilter;

          return (
            matchesSearch &&
            matchesClient &&
            matchesType
          );
        }
      );
    }, [
      tasks,
      search,
      clientFilter,
      typeFilter,
      clients,
    ]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppShell
      compactHeader
    >
      {/* MENSAGEM */}

      {message && (
        <div className="mb-4 rounded-xl border border-[#424958] bg-[#292e36] px-4 py-3 text-[11px] text-[#c5cad3]">
          {
            message
          }
        </div>
      )}

      {/* ===================================================
          CABEÇALHO DO MARKETING
      =================================================== */}

      <section className="mb-5 overflow-hidden rounded-[20px] border border-[#343a44] bg-[#252a32]">
        {/* TÍTULO */}

        <div className="flex flex-col gap-4 border-b border-[#343a44] px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#302f48] text-[#aaa5ff]">
                <Megaphone
                  size={
                    14
                  }
                />
              </span>

              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#7770ff]">
                  Marketing
                </p>

                <h1 className="mt-0.5 text-[17px] font-semibold tracking-[-0.025em] text-white sm:text-[19px]">
                  Produção de conteúdo
                </h1>
              </div>
            </div>

            <p className="mt-2 text-[9px] text-[#7d8592]">
              Organize conteúdos, responsáveis, revisões e publicações.
            </p>
          </div>

          {currentRole !==
            "client" && (
            <button
              type="button"
              onClick={
                openNewTask
              }
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#635bff] px-4 text-[11px] font-semibold text-white shadow-lg shadow-[#635bff]/10 transition hover:bg-[#716aff]"
            >
              <Plus
                size={
                  15
                }
              />

              Novo conteúdo
            </button>
          )}
        </div>

        {/* FILTROS */}

        <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-[430px]">
            <Search
              size={
                15
              }
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#69727f]"
            />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
              placeholder="Buscar conteúdo ou cliente..."
              className="h-10 w-full rounded-xl border border-[#3a414c] bg-[#20242b] pl-10 pr-4 text-[11px] text-white outline-none transition placeholder:text-[#66707e] focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
            <select
              value={
                clientFilter
              }
              onChange={(
                event
              ) =>
                setClientFilter(
                  event
                    .target
                    .value
                )
              }
              className="h-10 min-w-[165px] rounded-xl border border-[#3a414c] bg-[#20242b] px-3 text-[11px] text-[#b6bdc7] outline-none transition focus:border-[#635bff]"
            >
              <option value="all">
                Todos os clientes
              </option>

              {clients.map(
                (
                  client
                ) => (
                  <option
                    key={
                      client.id
                    }
                    value={
                      client.id
                    }
                  >
                    {client.trade_name ||
                      client.name}
                  </option>
                )
              )}
            </select>

            <select
              value={
                typeFilter
              }
              onChange={(
                event
              ) =>
                setTypeFilter(
                  event
                    .target
                    .value
                )
              }
              className="h-10 min-w-[155px] rounded-xl border border-[#3a414c] bg-[#20242b] px-3 text-[11px] text-[#b6bdc7] outline-none transition focus:border-[#635bff]"
            >
              <option value="all">
                Todos os formatos
              </option>

              {CONTENT_TYPES.map(
                (
                  type
                ) => (
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
        </div>
      </section>

      {/* ===================================================
          KANBAN
      =================================================== */}

      {loading ? (
        <div className="flex min-h-[390px] items-center justify-center">
          <div className="flex items-center gap-3 text-xs text-[#8f96a3]">
            <Loader2
              size={
                17
              }
              className="animate-spin"
            />

            Carregando produção...
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
                    (
                      task
                    ) =>
                      task.status ===
                      column.id
                  );

                return (
                  <div
                    key={
                      column.id
                    }
                    onDragOver={(
                      event
                    ) =>
                      event.preventDefault()
                    }
                    onDrop={() =>
                      handleDrop(
                        column.id
                      )
                    }
                    className={`w-[244px] shrink-0 px-2.5 ${
                      index !==
                      COLUMNS.length -
                        1
                        ? "border-r border-[#303640]"
                        : ""
                    }`}
                  >
                    {/* CABEÇALHO */}

                    <div className="mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#e2e5ea]">
                          {
                            column.title
                          }
                        </h3>

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

                    {/* ÁREA DA COLUNA */}

                    <div className="min-h-[380px] rounded-[14px] border border-[#343a44] bg-[#22262e] p-2">
                      <div className="space-y-2.5">
                        {columnTasks.map(
                          (
                            task
                          ) => (
                            <MarketingCard
                              key={
                                task.id
                              }
                              task={
                                task
                              }
                              artPreviewUrl={
                                artUrls[
                                  task.id
                                ] ||
                                ""
                              }
                              clientName={clientName(
                                task.client_id
                              )}
                              responsibleName={responsibleName(
                                task.responsible_user_id
                              )}
                              formatDate={
                                formatDate
                              }
                              getTypeIcon={
                                getTypeIcon
                              }
                              contentTypeLabel={
                                contentTypeLabel
                              }
                              canEdit={
                                currentRole !==
                                "client"
                              }
                              onEdit={() =>
                                openEditTask(
                                  task
                                )
                              }
                              onDragStart={() =>
                                setDraggedTaskId(
                                  task.id
                                )
                              }
                              onDragEnd={() =>
                                setDraggedTaskId(
                                  null
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

      {/* ===================================================
          MODAL
      =================================================== */}

      {showForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-[#363c46] bg-[#252a32] shadow-2xl shadow-black/50">
            {/* HEADER */}

            <div className="flex items-start justify-between gap-4 border-b border-[#363c46] px-5 py-5 sm:px-7">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7c74ff]">
                  Marketing
                </p>

                <h2 className="mt-1 text-xl font-semibold text-white">
                  {editingTask
                    ? "Editar conteúdo"
                    : "Novo conteúdo"}
                </h2>

                <p className="mt-1 text-[10px] text-[#8f96a3]">
                  {editingTask
                    ? `Criado em ${formatCreationDate(
                        editingTask.created_at
                      )}`
                    : "Crie uma nova tarefa para a equipe."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    false
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3d444f] bg-[#292e36] text-[#aab0bb] hover:bg-[#343a44]"
              >
                <X
                  size={
                    16
                  }
                />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                <div className="space-y-6">
                  {/* PRINCIPAL */}

                  <FormSection
                    title="Informações principais"
                    description="Cliente, formato e identificação da peça."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <SelectField
                        label="Cliente *"
                        value={
                          form.client_id
                        }
                        onChange={(
                          value
                        ) =>
                          updateField(
                            "client_id",
                            value
                          )
                        }
                        options={[
                          {
                            value:
                              "",

                            label:
                              "Selecione o cliente",
                          },

                          ...clients
                            .filter(
                              (
                                client
                              ) =>
                                client.status ===
                                "active"
                            )
                            .map(
                              (
                                client
                              ) => ({
                                value:
                                  client.id,

                                label:
                                  client.trade_name ||
                                  client.name,
                              })
                            ),
                        ]}
                      />

                      <InputField
                        label="Título interno *"
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
                        placeholder="Ex.: Campanha Dia dos Pais"
                      />
                    </div>

                    <div className="mt-5">
                      <label className="mb-3 block text-[11px] font-medium text-[#c5cad3]">
                        Tipo de conteúdo
                      </label>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {CONTENT_TYPES.map(
                          (
                            type
                          ) => {
                            const active =
                              form.content_type ===
                              type.value;

                            return (
                              <button
                                key={
                                  type.value
                                }
                                type="button"
                                onClick={() =>
                                  changeContentType(
                                    type.value
                                  )
                                }
                                className={`rounded-xl border p-3 text-left transition ${
                                  active
                                    ? "border-[#635bff] bg-[#635bff]/10"
                                    : "border-[#3d444f] bg-[#23272f] hover:border-[#555e6b]"
                                }`}
                              >
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                    active
                                      ? "bg-[#635bff] text-white"
                                      : "bg-[#343a44] text-[#aab0bb]"
                                  }`}
                                >
                                  {getTypeIcon(
                                    type.value,
                                    14
                                  )}
                                </div>

                                <p className="mt-3 text-[11px] font-semibold text-white">
                                  {
                                    type.label
                                  }
                                </p>

                                <p className="mt-1 text-[8px] leading-4 text-[#747c89]">
                                  {
                                    type.description
                                  }
                                </p>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </FormSection>

                  <DynamicContentFields
                    form={
                      form
                    }
                    updateField={
                      updateField
                    }
                    updateContentData={
                      updateContentData
                    }
                    changeCardCount={
                      changeCardCount
                    }
                    updateCarouselCard={
                      updateCarouselCard
                    }
                  />

                  {/* ARTE */}

                  <FormSection
                    title="Arte"
                    description="Envie a arte final em PNG ou JPG."
                  >
                    {!artPreview ? (
                      <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed border-[#49515e] bg-[#23272f] px-6 py-7 text-center transition hover:border-[#635bff]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#343a44] text-[#9ba1ff]">
                          <ImageIcon
                            size={
                              18
                            }
                          />
                        </div>

                        <p className="mt-3 text-xs font-semibold text-white">
                          Enviar arte
                        </p>

                        <p className="mt-1 text-[9px] text-[#747c89]">
                          PNG ou JPG • máximo 10 MB
                        </p>

                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                          className="hidden"
                          onChange={(
                            event
                          ) =>
                            handleArtFile(
                              event
                                .target
                                .files?.[0] ||
                                null
                            )
                          }
                        />
                      </label>
                    ) : (
                      <div className="overflow-hidden rounded-[16px] border border-[#3d444f] bg-[#23272f]">
                        <div className="flex items-center justify-between border-b border-[#363c46] px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ImageIcon
                              size={
                                15
                              }
                              className="text-[#9ba1ff]"
                            />

                            <p className="text-[10px] font-semibold text-white">
                              Arte anexada
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={
                              removeSelectedArt
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#633a3a] bg-[#352323] text-[#ff8d8d]"
                          >
                            <Trash2
                              size={
                                13
                              }
                            />
                          </button>
                        </div>

                        <div className="flex justify-center bg-[#1f232a] p-4">
                          <img
                            src={
                              artPreview
                            }
                            alt="Prévia"
                            className="max-h-[360px] max-w-full rounded-xl object-contain"
                          />
                        </div>

                        <div className="flex justify-end border-t border-[#363c46] px-4 py-3">
                          <label className="cursor-pointer text-[9px] font-semibold text-[#9ba1ff]">
                            Trocar arte

                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                              className="hidden"
                              onChange={(
                                event
                              ) =>
                                handleArtFile(
                                  event
                                    .target
                                    .files?.[0] ||
                                    null
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </FormSection>

                  {/* EQUIPE */}

                  <FormSection
                    title="Organização da equipe"
                    description="Responsável, etapa, prioridade e prazos."
                  >
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <SelectField
                        label="Responsável"
                        value={
                          form.responsible_user_id
                        }
                        onChange={(
                          value
                        ) =>
                          updateField(
                            "responsible_user_id",
                            value
                          )
                        }
                        options={[
                          {
                            value:
                              "",

                            label:
                              "Sem responsável",
                          },

                          ...profiles.map(
                            (
                              profile
                            ) => ({
                              value:
                                profile.id,

                              label:
                                profile.name ||
                                profile.email ||
                                "Equipe",
                            })
                          ),
                        ]}
                      />

                      <SelectField
                        label="Status"
                        value={
                          form.status
                        }
                        onChange={(
                          value
                        ) =>
                          updateField(
                            "status",
                            value as TaskStatus
                          )
                        }
                        options={COLUMNS.map(
                          (
                            column
                          ) => ({
                            value:
                              column.id,

                            label:
                              column.title,
                          })
                        )}
                      />

                      <SelectField
                        label="Prioridade"
                        value={
                          form.priority
                        }
                        onChange={(
                          value
                        ) =>
                          updateField(
                            "priority",
                            value as Priority
                          )
                        }
                        options={[
                          {
                            value:
                              "low",

                            label:
                              "Baixa",
                          },

                          {
                            value:
                              "normal",

                            label:
                              "Normal",
                          },

                          {
                            value:
                              "high",

                            label:
                              "Alta",
                          },

                          {
                            value:
                              "urgent",

                            label:
                              "Urgente",
                          },
                        ]}
                      />
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <InputField
                        label="Prazo para revisão"
                        type="date"
                        value={
                          form.due_date
                        }
                        onChange={(
                          value
                        ) =>
                          updateField(
                            "due_date",
                            value
                          )
                        }
                      />

                      <InputField
                        label="Data de publicação *"
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
                  </FormSection>

                  <FormSection
                    title="Observações internas"
                    description="Informações adicionais para a equipe."
                  >
                    <TextAreaField
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
                      placeholder="Referências, orientações ou observações..."
                      rows={
                        4
                      }
                    />
                  </FormSection>
                </div>
              </div>

              {/* FOOTER */}

              <div className="flex flex-col-reverse gap-3 border-t border-[#363c46] bg-[#23272f] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div>
                  {editingTask &&
                    currentRole ===
                      "admin" && (
                      <button
                        type="button"
                        onClick={
                          deleteTask
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#633a3a] bg-[#352323] px-4 text-[10px] font-semibold text-[#ff8d8d]"
                      >
                        <Trash2
                          size={
                            14
                          }
                        />

                        Excluir
                      </button>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowForm(
                        false
                      )
                    }
                    className="h-10 rounded-xl border border-[#3d444f] bg-[#292e36] px-4 text-[10px] font-semibold text-[#c5cad3]"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      uploadingArt
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#635bff] px-4 text-[10px] font-semibold text-white disabled:opacity-50"
                  >
                    {saving ||
                    uploadingArt ? (
                      <Loader2
                        size={
                          14
                        }
                        className="animate-spin"
                      />
                    ) : (
                      <Check
                        size={
                          14
                        }
                      />
                    )}

                    {uploadingArt
                      ? "Enviando..."
                      : saving
                      ? "Salvando..."
                      : editingTask
                      ? "Salvar alterações"
                      : "Criar conteúdo"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* =========================================================
   CARD COM TOOLTIP
========================================================= */

function MarketingCard({
  task,
  artPreviewUrl,
  clientName,
  responsibleName,
  formatDate,
  getTypeIcon,
  contentTypeLabel,
  canEdit,
  onEdit,
  onDragStart,
  onDragEnd,
}: {
  task:
    MarketingTask;

  artPreviewUrl:
    string;

  clientName:
    string;

  responsibleName:
    string;

  formatDate: (
    value:
      string | null
  ) => string;

  getTypeIcon: (
    type:
      ContentType,
    size?:
      number
  ) =>
    React.ReactNode;

  contentTypeLabel: (
    type:
      ContentType
  ) =>
    string;

  canEdit:
    boolean;

  onEdit:
    () => void;

  onDragStart:
    () => void;

  onDragEnd:
    () => void;
}) {
  const [
    showTooltip,
    setShowTooltip,
  ] =
    useState(false);

  return (
    <div className="relative">
      <article
        draggable={
          canEdit
        }
        onDragStart={() => {
          setShowTooltip(
            false
          );

          onDragStart();
        }}
        onDragEnd={
          onDragEnd
        }
        onMouseEnter={() =>
          setShowTooltip(
            true
          )
        }
        onMouseLeave={() =>
          setShowTooltip(
            false
          )
        }
        onClick={
          canEdit
            ? onEdit
            : undefined
        }
        className={`group overflow-hidden rounded-[14px] border border-[#3a414c] bg-[#2a2f37] shadow-[0_6px_16px_rgba(0,0,0,0.16)] transition ${
          canEdit
            ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#555e6b] hover:shadow-[0_10px_26px_rgba(0,0,0,0.22)]"
            : ""
        }`}
      >
        {/* IMAGEM */}

        {artPreviewUrl && (
          <div className="relative h-[122px] overflow-hidden bg-[#1d2127]">
            <img
              src={
                artPreviewUrl
              }
              alt={
                task.title
              }
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          </div>
        )}

        {/* CONTEÚDO */}

        <div className="p-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#343a44] text-[#a8a4ff]">
              {getTypeIcon(
                task.content_type,
                13
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[8px] font-semibold uppercase tracking-[0.11em] text-[#7f8895]">
                  {
                    clientName
                  }
                </p>

                {canEdit && (
                  <GripVertical
                    size={
                      11
                    }
                    className="ml-auto text-[#59616d] opacity-0 transition group-hover:opacity-100"
                  />
                )}
              </div>

              <h4 className="mt-1 line-clamp-2 text-[12px] font-semibold leading-[17px] text-white">
                {
                  task.title
                }
              </h4>
            </div>
          </div>

          {task.theme && (
            <p className="mt-2 line-clamp-2 text-[8.5px] leading-4 text-[#8c949f]">
              {
                task.theme
              }
            </p>
          )}

          {/* TAGS */}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <TypeBadge
              type={
                task.content_type
              }
              label={contentTypeLabel(
                task.content_type
              )}
            />

            <PriorityBadge
              priority={
                task.priority
              }
            />

            {artPreviewUrl && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#373d46] px-2 py-1 text-[7.5px] font-semibold text-[#b8bec7]">
                <ImageIcon
                  size={
                    8
                  }
                />

                Arte
              </span>
            )}
          </div>

          {/* RODAPÉ */}

          <div className="mt-3 border-t border-[#3a414c] pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#343a44] text-[8px] font-semibold text-[#aaa5ff]">
                  {responsibleName
                    .charAt(
                      0
                    )
                    .toUpperCase()}
                </div>

                <p className="truncate text-[8px] text-[#9ca3af]">
                  {
                    responsibleName
                  }
                </p>
              </div>

              {task.publish_date && (
                <div className="flex shrink-0 items-center gap-1 text-[8px] text-[#747c89]">
                  <CalendarDays
                    size={
                      9
                    }
                  />

                  {formatDate(
                    task.publish_date
                  )}
                </div>
              )}
            </div>

            {task.due_date && (
              <div className="mt-2 flex items-center gap-1.5 text-[8px] text-[#747c89]">
                <Clock3
                  size={
                    9
                  }
                />

                Revisão{" "}
                {formatDate(
                  task.due_date
                )}
              </div>
            )}
          </div>

          {canEdit && (
            <div className="mt-2 flex justify-end">
              <span className="inline-flex items-center gap-1 text-[7px] text-[#777f8d] opacity-0 transition group-hover:opacity-100">
                <Pencil
                  size={
                    8
                  }
                />

                Editar
              </span>
            </div>
          )}
        </div>
      </article>

      {/* =================================================
          TOOLTIP
      ================================================= */}

      {showTooltip && (
        <div
          className="
            pointer-events-none
            absolute
            left-[calc(100%+10px)]
            top-7
            z-[150]
            hidden
            w-[255px]
            rounded-[14px]
            border
            border-[#3d4654]
            bg-[#1c293b]
            p-4
            shadow-[0_18px_45px_rgba(0,0,0,0.48)]
            xl:block
          "
        >
          {/* CLIENTE */}

          <p className="text-[7.5px] font-semibold uppercase tracking-[0.13em] text-[#7f91ad]">
            {
              clientName
            }
          </p>

          {/* TÍTULO */}

          <h5 className="mt-1.5 text-[12px] font-semibold leading-[17px] text-white">
            {
              task.title
            }
          </h5>

          {/* DESCRIÇÃO */}

          {task.theme ? (
            <p className="mt-2 line-clamp-3 text-[9px] leading-4 text-[#b6c0ce]">
              {
                task.theme
              }
            </p>
          ) : task.caption ? (
            <p className="mt-2 line-clamp-3 text-[9px] leading-4 text-[#b6c0ce]">
              {
                task.caption
              }
            </p>
          ) : (
            <p className="mt-2 text-[9px] italic text-[#7f8997]">
              Sem descrição.
            </p>
          )}

          {/* BADGES */}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <TypeBadge
              type={
                task.content_type
              }
              label={contentTypeLabel(
                task.content_type
              )}
            />

            <PriorityBadge
              priority={
                task.priority
              }
            />
          </div>

          {/* RESPONSÁVEL */}

          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#34425a] text-[8px] font-semibold text-[#c2c8ff]">
                {responsibleName
                  .charAt(
                    0
                  )
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[8px] font-medium text-[#d0d6df]">
                  {
                    responsibleName
                  }
                </p>

                {task.publish_date && (
                  <p className="mt-0.5 text-[7px] text-[#8290a4]">
                    Publicação{" "}
                    {formatDate(
                      task.publish_date
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SETA */}

          <div
            className="
              absolute
              right-full
              top-8
              h-0
              w-0
              border-b-[7px]
              border-r-[8px]
              border-t-[7px]
              border-b-transparent
              border-r-[#1c293b]
              border-t-transparent
            "
          />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CAMPOS DINÂMICOS
========================================================= */

function DynamicContentFields({
  form,
  updateField,
  updateContentData,
  changeCardCount,
  updateCarouselCard,
}: {
  form:
    TaskForm;

  updateField: (
    field:
      keyof TaskForm,
    value:
      any
  ) => void;

  updateContentData: (
    field:
      string,
    value:
      any
  ) => void;

  changeCardCount: (
    count:
      number
  ) => void;

  updateCarouselCard: (
    index:
      number,
    value:
      string
  ) => void;
}) {
  /* POST */

  if (
    form.content_type ===
    "post"
  ) {
    return (
      <FormSection
        title="Conteúdo do Post"
        description="Tema, objetivo, legenda e CTA."
      >
        <div className="grid gap-4 md:grid-cols-2">
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

          <InputField
            label="Objetivo"
            value={
              form
                .content_data
                ?.objective ||
              ""
            }
            onChange={(
              value
            ) =>
              updateContentData(
                "objective",
                value
              )
            }
          />
        </div>

        <div className="mt-4">
          <TextAreaField
            label="Legenda"
            value={
              form.caption
            }
            onChange={(
              value
            ) =>
              updateField(
                "caption",
                value
              )
            }
            rows={
              5
            }
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
            label="Referência"
            value={
              form
                .content_data
                ?.reference ||
              ""
            }
            onChange={(
              value
            ) =>
              updateContentData(
                "reference",
                value
              )
            }
          />
        </div>
      </FormSection>
    );
  }

  /* CARROSSEL */

  if (
    form.content_type ===
    "carousel"
  ) {
    const cards =
      form
        .content_data
        ?.cards ||
      [];

    return (
      <FormSection
        title="Conteúdo do Carrossel"
        description="Defina quantidade e conteúdo dos cards."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
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

          <InputField
            label="Quantidade de cards"
            type="number"
            value={String(
              form
                .content_data
                ?.cards_count ||
                4
            )}
            onChange={(
              value
            ) =>
              changeCardCount(
                Number(
                  value
                )
              )
            }
            min={
              2
            }
            max={
              10
            }
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {cards.map(
            (
              card:
                any,
              index:
                number
            ) => (
              <div
                key={
                  index
                }
                className="rounded-xl border border-[#3d444f] bg-[#23272f] p-4"
              >
                <p className="mb-2 text-[10px] font-semibold text-white">
                  Card{" "}
                  {index +
                    1}
                </p>

                <textarea
                  rows={
                    4
                  }
                  value={
                    card.text ||
                    ""
                  }
                  onChange={(
                    event
                  ) =>
                    updateCarouselCard(
                      index,
                      event
                        .target
                        .value
                    )
                  }
                  className="w-full resize-none rounded-xl border border-[#3d444f] bg-[#292e36] px-3 py-3 text-[10px] text-white outline-none focus:border-[#635bff]"
                />
              </div>
            )
          )}
        </div>

        <div className="mt-4">
          <TextAreaField
            label="Legenda"
            value={
              form.caption
            }
            onChange={(
              value
            ) =>
              updateField(
                "caption",
                value
              )
            }
          />
        </div>
      </FormSection>
    );
  }

  /* REELS */

  if (
    form.content_type ===
    "reels"
  ) {
    return (
      <FormSection
        title="Conteúdo do Reels"
        description="Gancho, roteiro, legenda e duração."
      >
        <div className="grid gap-4 md:grid-cols-2">
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

          <InputField
            label="Gancho inicial"
            value={
              form
                .content_data
                ?.hook ||
              ""
            }
            onChange={(
              value
            ) =>
              updateContentData(
                "hook",
                value
              )
            }
          />
        </div>

        <div className="mt-4">
          <TextAreaField
            label="Roteiro"
            value={
              form.script
            }
            onChange={(
              value
            ) =>
              updateField(
                "script",
                value
              )
            }
            rows={
              7
            }
          />
        </div>

        <div className="mt-4">
          <TextAreaField
            label="Legenda"
            value={
              form.caption
            }
            onChange={(
              value
            ) =>
              updateField(
                "caption",
                value
              )
            }
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
            label="Duração aproximada"
            value={
              form
                .content_data
                ?.duration ||
              ""
            }
            onChange={(
              value
            ) =>
              updateContentData(
                "duration",
                value
              )
            }
          />
        </div>
      </FormSection>
    );
  }

  /* STORY */

  if (
    form.content_type ===
    "story"
  ) {
    const storyType =
      form
        .content_data
        ?.story_type ||
      "simple";

    return (
      <FormSection
        title="Conteúdo do Story"
        description="Configure o conteúdo e a interação."
      >
        <div className="grid gap-4 md:grid-cols-2">
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

          <SelectField
            label="Tipo"
            value={
              storyType
            }
            onChange={(
              value
            ) =>
              updateContentData(
                "story_type",
                value
              )
            }
            options={[
              {
                value:
                  "simple",

                label:
                  "Story simples",
              },

              {
                value:
                  "poll",

                label:
                  "Enquete",
              },

              {
                value:
                  "questions",

                label:
                  "Caixa de perguntas",
              },

              {
                value:
                  "quiz",

                label:
                  "Quiz",
              },
            ]}
          />
        </div>

        <div className="mt-4">
          <TextAreaField
            label="Texto / orientação"
            value={
              form
                .content_data
                ?.text ||
              ""
            }
            onChange={(
              value
            ) =>
              updateContentData(
                "text",
                value
              )
            }
          />
        </div>

        {storyType ===
          "poll" && (
          <div className="mt-4 space-y-4">
            <InputField
              label="Pergunta da enquete"
              value={
                form
                  .content_data
                  ?.poll_question ||
                ""
              }
              onChange={(
                value
              ) =>
                updateContentData(
                  "poll_question",
                  value
                )
              }
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Opção 1"
                value={
                  form
                    .content_data
                    ?.poll_option_1 ||
                  ""
                }
                onChange={(
                  value
                ) =>
                  updateContentData(
                    "poll_option_1",
                    value
                  )
                }
              />

              <InputField
                label="Opção 2"
                value={
                  form
                    .content_data
                    ?.poll_option_2 ||
                  ""
                }
                onChange={(
                  value
                ) =>
                  updateContentData(
                    "poll_option_2",
                    value
                  )
                }
              />
            </div>
          </div>
        )}

        {storyType ===
          "questions" && (
          <div className="mt-4">
            <InputField
              label="Texto da caixa de perguntas"
              value={
                form
                  .content_data
                  ?.question_box ||
                ""
              }
              onChange={(
                value
              ) =>
                updateContentData(
                  "question_box",
                  value
                )
              }
            />
          </div>
        )}

        {storyType ===
          "quiz" && (
          <div className="mt-4 space-y-4">
            <InputField
              label="Pergunta"
              value={
                form
                  .content_data
                  ?.quiz_question ||
                ""
              }
              onChange={(
                value
              ) =>
                updateContentData(
                  "quiz_question",
                  value
                )
              }
            />

            <div className="grid gap-4 md:grid-cols-3">
              <InputField
                label="Opção 1"
                value={
                  form
                    .content_data
                    ?.quiz_option_1 ||
                  ""
                }
                onChange={(
                  value
                ) =>
                  updateContentData(
                    "quiz_option_1",
                    value
                  )
                }
              />

              <InputField
                label="Opção 2"
                value={
                  form
                    .content_data
                    ?.quiz_option_2 ||
                  ""
                }
                onChange={(
                  value
                ) =>
                  updateContentData(
                    "quiz_option_2",
                    value
                  )
                }
              />

              <InputField
                label="Opção 3"
                value={
                  form
                    .content_data
                    ?.quiz_option_3 ||
                  ""
                }
                onChange={(
                  value
                ) =>
                  updateContentData(
                    "quiz_option_3",
                    value
                  )
                }
              />
            </div>

            <InputField
              label="Resposta correta"
              value={
                form
                  .content_data
                  ?.quiz_correct ||
                ""
              }
              onChange={(
                value
              ) =>
                updateContentData(
                  "quiz_correct",
                  value
                )
              }
            />
          </div>
        )}
      </FormSection>
    );
  }

  /* GRAVAÇÃO */

  return (
    <FormSection
      title="Planejamento da Gravação"
      description="Organize data, local, participantes e briefing."
    >
      <div className="grid gap-4 md:grid-cols-2">
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

        <InputField
          label="Data da gravação"
          type="date"
          value={
            form
              .content_data
              ?.recording_date ||
            ""
          }
          onChange={(
            value
          ) =>
            updateContentData(
              "recording_date",
              value
            )
          }
        />

        <InputField
          label="Local"
          value={
            form
              .content_data
              ?.location ||
            ""
          }
          onChange={(
            value
          ) =>
            updateContentData(
              "location",
              value
            )
          }
        />

        <InputField
          label="Participantes"
          value={
            form
              .content_data
              ?.participants ||
            ""
          }
          onChange={(
            value
          ) =>
            updateContentData(
              "participants",
              value
            )
          }
        />
      </div>

      <div className="mt-4">
        <TextAreaField
          label="Briefing"
          value={
            form
              .content_data
              ?.briefing ||
            ""
          }
          onChange={(
            value
          ) =>
            updateContentData(
              "briefing",
              value
            )
          }
          rows={
            7
          }
        />
      </div>
    </FormSection>
  );
}

/* =========================================================
   FORM SECTION
========================================================= */

function FormSection({
  title,
  description,
  children,
}: {
  title:
    string;

  description:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-white">
          {
            title
          }
        </h3>

        <p className="mt-1 text-[9px] text-[#747c89]">
          {
            description
          }
        </p>
      </div>

      <div className="rounded-[16px] border border-[#363c46] bg-[#292e36] p-4 sm:p-5">
        {
          children
        }
      </div>
    </section>
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
  placeholder = "",
  min,
  max,
}: {
  label:
    string;

  value:
    string;

  onChange: (
    value:
      string
  ) => void;

  type?:
    string;

  placeholder?:
    string;

  min?:
    number;

  max?:
    number;
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-medium text-[#b6bcc6]">
        {
          label
        }
      </label>

      <input
        type={
          type
        }
        value={
          value
        }
        min={
          min
        }
        max={
          max
        }
        placeholder={
          placeholder
        }
        onChange={(
          event
        ) =>
          onChange(
            event
              .target
              .value
          )
        }
        className="h-10 w-full rounded-xl border border-[#3d444f] bg-[#23272f] px-3 text-[10px] text-white outline-none placeholder:text-[#606874] focus:border-[#635bff]"
      />
    </div>
  );
}

/* =========================================================
   SELECT
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label:
    string;

  value:
    string;

  onChange: (
    value:
      string
  ) => void;

  options: {
    value:
      string;

    label:
      string;
  }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-medium text-[#b6bcc6]">
        {
          label
        }
      </label>

      <select
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event
              .target
              .value
          )
        }
        className="h-10 w-full rounded-xl border border-[#3d444f] bg-[#23272f] px-3 text-[10px] text-white outline-none focus:border-[#635bff]"
      >
        {options.map(
          (
            option
          ) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {
                option.label
              }
            </option>
          )
        )}
      </select>
    </div>
  );
}

/* =========================================================
   TEXTAREA
========================================================= */

function TextAreaField({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 5,
}: {
  label?:
    string;

  value:
    string;

  onChange: (
    value:
      string
  ) => void;

  placeholder?:
    string;

  rows?:
    number;
}) {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-[9px] font-medium text-[#b6bcc6]">
          {
            label
          }
        </label>
      )}

      <textarea
        rows={
          rows
        }
        value={
          value
        }
        placeholder={
          placeholder
        }
        onChange={(
          event
        ) =>
          onChange(
            event
              .target
              .value
          )
        }
        className="w-full resize-none rounded-xl border border-[#3d444f] bg-[#23272f] px-3 py-3 text-[10px] leading-5 text-white outline-none placeholder:text-[#606874] focus:border-[#635bff]"
      />
    </div>
  );
}

/* =========================================================
   TYPE BADGE
========================================================= */

function TypeBadge({
  type,
  label,
}: {
  type:
    ContentType;

  label:
    string;
}) {
  const styles: Record<
    ContentType,
    string
  > = {
    post:
      "bg-[#302f48] text-[#aaa5ff]",

    carousel:
      "bg-[#243749] text-[#70bfff]",

    reels:
      "bg-[#462b43] text-[#ef91dc]",

    story:
      "bg-[#3d3520] text-[#f3c969]",

    recording:
      "bg-[#17382b] text-[#5ee0a3]",
  };

  return (
    <span
      className={`rounded-full px-2 py-1 text-[7.5px] font-semibold ${styles[type]}`}
    >
      {
        label
      }
    </span>
  );
}

/* =========================================================
   PRIORITY BADGE
========================================================= */

function PriorityBadge({
  priority,
}: {
  priority:
    Priority;
}) {
  if (
    priority ===
    "urgent"
  ) {
    return (
      <span className="rounded-full bg-[#462525] px-2 py-1 text-[7.5px] font-semibold text-[#ff8d8d]">
        Urgente
      </span>
    );
  }

  if (
    priority ===
    "high"
  ) {
    return (
      <span className="rounded-full bg-[#493221] px-2 py-1 text-[7.5px] font-semibold text-[#f0a44b]">
        Alta
      </span>
    );
  }

  if (
    priority ===
    "low"
  ) {
    return (
      <span className="rounded-full bg-[#17382b] px-2 py-1 text-[7.5px] font-semibold text-[#5ee0a3]">
        Baixa
      </span>
    );
  }

  return null;
}