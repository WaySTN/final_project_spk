import crypto from "node:crypto";
import { cookies } from "next/headers";
import {
  LOCAL_ADMIN_COOKIE,
  isLocalTestMode,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export { LOCAL_ADMIN_COOKIE };

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: "admin";
}

export class AuthError extends Error {
  readonly status: 401 | 403;
  readonly code: string;

  constructor(status: 401 | 403, code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.status = status;
    this.code = code;
  }
}

function getLocalSessionSecret(): string {
  return (
    process.env.LAPTOPMATCH_LOCAL_SESSION_SECRET?.trim() ||
    "laptopmatch-local-dev-only-session-key"
  );
}

export function getLocalAdminCredentials(): { email: string; password: string } {
  return {
    email:
      process.env.LAPTOPMATCH_LOCAL_ADMIN_EMAIL?.trim() ||
      "admin@laptopmatch.local",
    password:
      process.env.LAPTOPMATCH_LOCAL_ADMIN_PASSWORD?.trim() ||
      "AdminLaptopMatch2026!",
  };
}

export function signLocalAdminToken(payload: {
  id: string;
  email: string;
  exp: number;
}): string {
  const data = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getLocalSessionSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifyLocalAdminToken(token: string): {
  id: string;
  email: string;
} | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = crypto
    .createHmac("sha256", getLocalSessionSecret())
    .update(data)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8"),
    ) as { id?: string; email?: string; exp?: number };
    if (!parsed.id || !parsed.email || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    return { id: parsed.id, email: parsed.email };
  } catch {
    return null;
  }
}

/**
 * Verifies authenticated admin session server-side (never trusts client claims).
 */
export async function getAdminSession(): Promise<AdminUser | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) return null;

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== "admin") {
      return null;
    }

    return {
      id: user.id,
      email: profile.email ?? user.email ?? "",
      fullName: profile.full_name ?? "Administrator Peneliti",
      role: "admin",
    };
  }

  if (isLocalTestMode()) {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(LOCAL_ADMIN_COOKIE)?.value;
    if (!rawToken) return null;
    const verified = verifyLocalAdminToken(rawToken);
    if (!verified) return null;
    return {
      id: verified.id,
      email: verified.email,
      fullName: "Administrator Lokal (Pengujian)",
      role: "admin",
    };
  }

  return null;
}

export async function requireAdmin(): Promise<AdminUser> {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      throw new AuthError(401, "UNAUTHORIZED", "Autentikasi administrator diperlukan.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      throw new AuthError(403, "FORBIDDEN", "Akun tidak memiliki hak akses administrator.");
    }

    return {
      id: user.id,
      email: profile.email ?? user.email ?? "",
      fullName: profile.full_name ?? "Administrator Peneliti",
      role: "admin",
    };
  }

  if (isLocalTestMode()) {
    const admin = await getAdminSession();
    if (!admin) {
      throw new AuthError(401, "UNAUTHORIZED", "Autentikasi administrator diperlukan.");
    }
    return admin;
  }

  throw new AuthError(
    401,
    "AUTH_NOT_CONFIGURED",
    "Autentikasi Supabase belum dikonfigurasi pada environment server.",
  );
}

/**
 * Basic CSRF / Origin check for state-changing admin routes.
 */
export function verifyWriteOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Non-browser API clients (e.g. curl/Playwright request context) may omit Origin.
    // Enforce same-site Sec-Fetch-Site when present.
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
      return false;
    }
    return true;
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return false;

  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.host === host) return true;
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configuredAppUrl && new URL(configuredAppUrl).origin === parsedOrigin.origin) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
