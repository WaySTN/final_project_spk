export const LOCAL_ADMIN_COOKIE = "lm_local_admin_session";

export function getSupabaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

export function getSupabaseAnonKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function getSupabaseServiceRoleKey(): string | null {
  if (typeof window !== "undefined") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY tidak boleh diakses di sisi browser.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function isSupabaseConfigured(): boolean {
  if (getLocalStorePath()) {
    return false;
  }
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/**
 * Local isolated JSON store is strictly for local development / automated E2E testing
 * when Supabase cloud credentials are not yet configured. Never active on Vercel production.
 */
export function getLocalStorePath(): string | null {
  if (typeof window !== "undefined") return null;
  if (process.env.VERCEL === "1" && process.env.NODE_ENV === "production") {
    return null;
  }
  const configured = process.env.LAPTOPMATCH_LOCAL_STORE_PATH?.trim();
  return configured && configured.length > 0 ? configured : null;
}

export function isLocalTestMode(): boolean {
  return !isSupabaseConfigured() && Boolean(getLocalStorePath());
}
