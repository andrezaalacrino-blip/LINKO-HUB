import { createClient } from "@/utils/supabase/server";
import type { HubProfile } from "./permissions";

export { canManageInstagram, canViewInstagram } from "./permissions";
export type { HubProfile } from "./permissions";

/**
 * Perfil do usuário logado, lido pela sessão Supabase (cookies).
 * Nunca confia em IDs ou papéis vindos do navegador.
 */
export async function getCurrentProfile(): Promise<HubProfile | null> {
  const supabase = await createClient();

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, active, client_id, permissions")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile || !profile.active) return null;

  return profile as HubProfile;
}
