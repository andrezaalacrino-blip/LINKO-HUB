"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: "admin" | "team" | "client";
};

export default function ClientProfilePage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [avatarUrl, setAvatarUrl] =
    useState("");

  const [avatarPreview, setAvatarPreview] =
    useState("");

  const [avatarFile, setAvatarFile] =
    useState<File | null>(null);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    uploadingAvatar,
    setUploadingAvatar,
  ] = useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    profileMessage,
    setProfileMessage,
  ] = useState("");

  const [
    profileMessageType,
    setProfileMessageType,
  ] = useState<
    "success" | "error" | ""
  >("");

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState("");

  const [
    passwordMessageType,
    setPasswordMessageType,
  ] = useState<
    "success" | "error" | ""
  >("");

  useEffect(() => {
    loadProfile();

    return () => {
      if (
        avatarPreview.startsWith(
          "blob:"
        )
      ) {
        URL.revokeObjectURL(
          avatarPreview
        );
      }
    };
  }, []);

  /* =======================================================
     CARREGAR PERFIL
  ======================================================= */

  async function loadProfile() {
    setLoading(true);

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !userData.user
    ) {
      setProfileMessage(
        "Não foi possível identificar seu usuário."
      );

      setProfileMessageType(
        "error"
      );

      setLoading(false);

      return;
    }

    const {
      data,
      error,
    } =
      await supabase
        .from("profiles")
        .select(`
          id,
          name,
          email,
          avatar_url,
          role
        `)
        .eq(
          "id",
          userData.user.id
        )
        .maybeSingle();

    if (
      error ||
      !data
    ) {
      console.error(
        "Erro ao carregar perfil:",
        error
      );

      setProfileMessage(
        "Não foi possível carregar seu perfil."
      );

      setProfileMessageType(
        "error"
      );

      setLoading(false);

      return;
    }

    const typed =
      data as Profile;

    setProfile(typed);

    setName(
      typed.name || ""
    );

    setEmail(
      typed.email ||
        userData.user.email ||
        ""
    );

    setAvatarUrl(
      typed.avatar_url || ""
    );

    setAvatarPreview(
      typed.avatar_url || ""
    );

    setLoading(false);
  }

  /* =======================================================
     SELECIONAR FOTO
  ======================================================= */

  function handleAvatarFile(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setProfileMessage(
        "A foto deve estar em PNG, JPG ou WEBP."
      );

      setProfileMessageType(
        "error"
      );

      return;
    }

    const maxSize =
      5 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {
      setProfileMessage(
        "A foto deve ter no máximo 5 MB."
      );

      setProfileMessageType(
        "error"
      );

      return;
    }

    if (
      avatarPreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    const preview =
      URL.createObjectURL(
        file
      );

    setAvatarFile(file);

    setAvatarPreview(
      preview
    );

    setProfileMessage("");

    setProfileMessageType(
      ""
    );

    event.target.value =
      "";
  }

  /* =======================================================
     REMOVER FOTO SELECIONADA
  ======================================================= */

  function removeSelectedAvatar() {
    if (
      avatarPreview.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    setAvatarFile(null);

    setAvatarPreview("");

    setAvatarUrl("");
  }

  /* =======================================================
     UPLOAD AVATAR
  ======================================================= */

  async function uploadAvatar(
    userId: string
  ) {
    if (!avatarFile) {
      return (
        avatarUrl ||
        null
      );
    }

    setUploadingAvatar(true);

    try {
      const extension =
        avatarFile.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      /*
       * usamos timestamp no nome
       * para evitar cache da imagem antiga
       */

      const filePath =
        `${userId}/avatar-${Date.now()}.${extension}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("avatars")
          .upload(
            filePath,
            avatarFile,
            {
              upsert: true,
              cacheControl:
                "3600",
              contentType:
                avatarFile.type,
            }
          );

      if (
        uploadError
      ) {
        throw uploadError;
      }

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from("avatars")
          .getPublicUrl(
            filePath
          );

      const publicUrl =
        publicUrlData.publicUrl;

      if (
        !publicUrl
      ) {
        return null;
      }

      /*
       * query extra para garantir
       * atualização imediata no browser
       */
      return `${publicUrl}?v=${Date.now()}`;
    } finally {
      setUploadingAvatar(false);
    }
  }

  /* =======================================================
     SALVAR PERFIL
  ======================================================= */

  async function handleSaveProfile(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    if (
      !name.trim()
    ) {
      setProfileMessage(
        "Informe seu nome."
      );

      setProfileMessageType(
        "error"
      );

      return;
    }

    setSavingProfile(true);

    setProfileMessage("");

    setProfileMessageType(
      ""
    );

    try {
      const finalAvatarUrl =
        await uploadAvatar(
          profile.id
        );

      const {
        error:
          profileError,
      } =
        await supabase
          .from("profiles")
          .update({
            name:
              name.trim(),

            avatar_url:
              finalAvatarUrl,
          })
          .eq(
            "id",
            profile.id
          );

      if (
        profileError
      ) {
        throw profileError;
      }

      const {
        error:
          authError,
      } =
        await supabase.auth.updateUser(
          {
            data: {
              name:
                name.trim(),
            },
          }
        );

      if (
        authError
      ) {
        console.error(
          "Erro ao atualizar metadata:",
          authError
        );
      }

      const savedAvatar =
        finalAvatarUrl ||
        "";

      setAvatarUrl(
        savedAvatar
      );

      setAvatarPreview(
        savedAvatar
      );

      setAvatarFile(null);

      setProfile(
        (current) =>
          current
            ? {
                ...current,

                name:
                  name.trim(),

                avatar_url:
                  savedAvatar ||
                  null,
              }
            : current
      );

      setProfileMessage(
        "Perfil atualizado com sucesso."
      );

      setProfileMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "Erro ao salvar perfil:",
        error
      );

      setProfileMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar seu perfil."
      );

      setProfileMessageType(
        "error"
      );
    } finally {
      setSavingProfile(false);

      setUploadingAvatar(false);
    }
  }

  /* =======================================================
     ALTERAR SENHA
  ======================================================= */

  async function handleChangePassword(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPasswordMessage("");

    setPasswordMessageType(
      ""
    );

    if (
      !currentPassword
    ) {
      setPasswordMessage(
        "Informe sua senha atual."
      );

      setPasswordMessageType(
        "error"
      );

      return;
    }

    if (
      newPassword.length <
      6
    ) {
      setPasswordMessage(
        "A nova senha deve ter pelo menos 6 caracteres."
      );

      setPasswordMessageType(
        "error"
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordMessage(
        "A confirmação da senha não confere."
      );

      setPasswordMessageType(
        "error"
      );

      return;
    }

    setChangingPassword(
      true
    );

    try {
      const {
        error:
          signInError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email,
            password:
              currentPassword,
          }
        );

      if (
        signInError
      ) {
        setPasswordMessage(
          "A senha atual está incorreta."
        );

        setPasswordMessageType(
          "error"
        );

        setChangingPassword(
          false
        );

        return;
      }

      const {
        error:
          updateError,
      } =
        await supabase.auth.updateUser(
          {
            password:
              newPassword,
          }
        );

      if (
        updateError
      ) {
        throw updateError;
      }

      setCurrentPassword("");

      setNewPassword("");

      setConfirmPassword("");

      setPasswordMessage(
        "Senha alterada com sucesso."
      );

      setPasswordMessageType(
        "success"
      );
    } catch (error) {
      console.error(
        "Erro ao alterar senha:",
        error
      );

      setPasswordMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar sua senha."
      );

      setPasswordMessageType(
        "error"
      );
    } finally {
      setChangingPassword(
        false
      );
    }
  }

  /* =======================================================
     INICIAIS
  ======================================================= */

  const initials =
    (
      name ||
      email ||
      "U"
    )
      .trim()
      .charAt(0)
      .toUpperCase();

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppShell compactHeader>
      {loading ? (
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-3 text-xs text-[#8f96a3]">
            <Loader2
              size={18}
              className="animate-spin"
            />

            Carregando seu perfil...
          </div>
        </div>
      ) : (
        <>
          {/* CABEÇALHO */}

          <section className="mb-5 rounded-[20px] border border-[#343a44] bg-[#252a32] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#302f48] text-[#aaa5ff]">
                <UserRound
                  size={18}
                />
              </div>

              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#7770ff]">
                  Minha conta
                </p>

                <h1 className="mt-1 text-xl font-semibold text-white">
                  Meu perfil
                </h1>

                <p className="mt-1 text-[10px] text-[#7d8592]">
                  Atualize sua foto, nome e senha de acesso.
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            {/* ==========================================
                PERFIL
            ========================================== */}

            <form
              onSubmit={
                handleSaveProfile
              }
              className="overflow-hidden rounded-[20px] border border-[#343a44] bg-[#252a32]"
            >
              <div className="border-b border-[#343a44] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#302f48] text-[#aaa5ff]">
                    <ImageIcon
                      size={17}
                    />
                  </div>

                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-[#7770ff]">
                      Perfil
                    </p>

                    <h2 className="mt-1 text-sm font-semibold text-white">
                      Dados pessoais
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {/* FOTO */}

                <div className="flex flex-col gap-4 rounded-[16px] border border-[#363c46] bg-[#22262e] p-4 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-20 shrink-0">
                    {avatarPreview ? (
                      <div className="h-20 w-20 overflow-hidden rounded-full bg-[#1f232a] ring-2 ring-[#454c58]">
                        <img
                          src={
                            avatarPreview
                          }
                          alt="Foto do perfil"
                          className="block h-full w-full object-cover object-center"
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#635bff] text-xl font-semibold text-white ring-2 ring-[#454c58]">
                        {
                          initials
                        }
                      </div>
                    )}

                    <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#22262e] bg-[#635bff] text-white">
                      <Camera
                        size={12}
                      />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-white">
                      Foto de perfil
                    </p>

                    <p className="mt-1 text-[8px] leading-4 text-[#7d8592]">
                      PNG, JPG ou WEBP com até 5 MB.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-[#3d444f] bg-[#292e36] px-3 text-[9px] font-semibold text-[#c3c9d1] transition hover:bg-[#343a44] hover:text-white">
                        <Camera
                          size={13}
                        />

                        {avatarPreview
                          ? "Trocar foto"
                          : "Adicionar foto"}

                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={
                            handleAvatarFile
                          }
                          className="hidden"
                        />
                      </label>

                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={
                            removeSelectedAvatar
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#5a3737] bg-[#352323] px-3 text-[9px] font-semibold text-[#ff8d8d] transition hover:bg-[#432929]"
                        >
                          <Trash2
                            size={12}
                          />

                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* CAMPOS */}

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-[9px] font-medium text-[#b6bcc6]">
                      Nome
                    </label>

                    <div className="relative">
                      <UserRound
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6c7481]"
                      />

                      <input
                        type="text"
                        value={
                          name
                        }
                        onChange={(
                          event
                        ) =>
                          setName(
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-[#3d444f] bg-[#23272f] pl-10 pr-4 text-[10px] text-white outline-none transition focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[9px] font-medium text-[#b6bcc6]">
                      E-mail
                    </label>

                    <div className="relative">
                      <Mail
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6c7481]"
                      />

                      <input
                        type="email"
                        value={
                          email
                        }
                        disabled
                        className="h-11 w-full cursor-not-allowed rounded-xl border border-[#363c46] bg-[#1f2329] pl-10 pr-4 text-[10px] text-[#777f8d] outline-none"
                      />
                    </div>

                    <p className="mt-2 text-[8px] text-[#666f7b]">
                      O e-mail de acesso é administrado pela Linko.
                    </p>
                  </div>
                </div>

                {profileMessage && (
                  <MessageBox
                    type={
                      profileMessageType
                    }
                    message={
                      profileMessage
                    }
                  />
                )}

                <div className="mt-5 flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      savingProfile ||
                      uploadingAvatar
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#635bff] px-4 text-[10px] font-semibold text-white shadow-lg shadow-[#635bff]/10 transition hover:bg-[#716aff] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingProfile ||
                    uploadingAvatar ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <Save
                        size={14}
                      />
                    )}

                    {uploadingAvatar
                      ? "Enviando foto..."
                      : savingProfile
                      ? "Salvando..."
                      : "Salvar alterações"}
                  </button>
                </div>
              </div>
            </form>

            {/* ==========================================
                SEGURANÇA
            ========================================== */}

            <form
              onSubmit={
                handleChangePassword
              }
              className="overflow-hidden rounded-[20px] border border-[#343a44] bg-[#252a32]"
            >
              <div className="border-b border-[#343a44] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17382b] text-[#5ee0a3]">
                    <ShieldCheck
                      size={17}
                    />
                  </div>

                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-[#5ee0a3]">
                      Segurança
                    </p>

                    <h2 className="mt-1 text-sm font-semibold text-white">
                      Alterar senha
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="rounded-[16px] border border-[#363c46] bg-[#22262e] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#292e36] text-[#aaa5ff]">
                      <KeyRound
                        size={16}
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold text-white">
                        Proteja sua conta
                      </p>

                      <p className="mt-1 text-[8px] leading-4 text-[#7d8592]">
                        Use uma senha diferente de outros serviços e evite compartilhá-la.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <PasswordField
                    label="Senha atual"
                    value={
                      currentPassword
                    }
                    onChange={
                      setCurrentPassword
                    }
                    show={
                      showCurrentPassword
                    }
                    onToggle={() =>
                      setShowCurrentPassword(
                        (current) =>
                          !current
                      )
                    }
                    autoComplete="current-password"
                  />

                  <PasswordField
                    label="Nova senha"
                    value={
                      newPassword
                    }
                    onChange={
                      setNewPassword
                    }
                    show={
                      showNewPassword
                    }
                    onToggle={() =>
                      setShowNewPassword(
                        (current) =>
                          !current
                      )
                    }
                    autoComplete="new-password"
                  />

                  <PasswordField
                    label="Confirmar nova senha"
                    value={
                      confirmPassword
                    }
                    onChange={
                      setConfirmPassword
                    }
                    show={
                      showConfirmPassword
                    }
                    onToggle={() =>
                      setShowConfirmPassword(
                        (current) =>
                          !current
                      )
                    }
                    autoComplete="new-password"
                  />
                </div>

                {passwordMessage && (
                  <MessageBox
                    type={
                      passwordMessageType
                    }
                    message={
                      passwordMessage
                    }
                  />
                )}

                <button
                  type="submit"
                  disabled={
                    changingPassword
                  }
                  className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#3d444f] bg-[#292e36] px-4 text-[10px] font-semibold text-white transition hover:bg-[#343a44] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {changingPassword ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <LockKeyhole
                      size={14}
                    />
                  )}

                  {changingPassword
                    ? "Alterando senha..."
                    : "Alterar senha"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </AppShell>
  );
}

/* =========================================================
   PASSWORD FIELD
========================================================= */

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  label: string;

  value: string;

  onChange: (
    value: string
  ) => void;

  show: boolean;

  onToggle: () => void;

  autoComplete:
    "current-password" |
    "new-password";
}) {
  return (
    <div>
      <label className="mb-2 block text-[9px] font-medium text-[#b6bcc6]">
        {label}
      </label>

      <div className="relative">
        <LockKeyhole
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6c7481]"
        />

        <input
          type={
            show
              ? "text"
              : "password"
          }
          value={
            value
          }
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          autoComplete={
            autoComplete
          }
          className="h-11 w-full rounded-xl border border-[#3d444f] bg-[#23272f] pl-10 pr-11 text-[10px] text-white outline-none transition focus:border-[#635bff] focus:ring-4 focus:ring-[#635bff]/10"
        />

        <button
          type="button"
          onClick={
            onToggle
          }
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#747c89] transition hover:bg-[#343a44] hover:text-white"
        >
          {show ? (
            <EyeOff
              size={13}
            />
          ) : (
            <Eye
              size={13}
            />
          )}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   MESSAGE
========================================================= */

function MessageBox({
  type,
  message,
}: {
  type:
    | "success"
    | "error"
    | "";

  message: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`mt-5 flex items-start gap-2 rounded-xl border px-3 py-3 ${
        type ===
        "success"
          ? "border-[#2f5141] bg-[#1d3329] text-[#6fe4aa]"
          : "border-[#5c3a3a] bg-[#352525] text-[#ff9a9a]"
      }`}
    >
      {type ===
        "success" && (
        <CheckCircle2
          size={14}
          className="mt-0.5 shrink-0"
        />
      )}

      <p className="text-[9px] font-medium leading-4">
        {message}
      </p>
    </div>
  );
}