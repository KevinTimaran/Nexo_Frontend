import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildSupabaseAnonKey, buildSupabaseUrl } from "../config/env";
import type { User } from "../domain/types";

let client: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(buildSupabaseUrl() && buildSupabaseAnonKey());
}

/** Lazy client: returns null (instead of throwing) when the build has no Supabase settings. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = buildSupabaseUrl();
  const key = buildSupabaseAnonKey();
  client = url && key
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;
  return client;
}

/** Current access token for the API, or null when signed out / not configured. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export function toUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): User {
  const email = user.email ?? "";
  const metaName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  return { id: user.id, email, name: metaName || email.split("@")[0] || "Usuario" };
}
