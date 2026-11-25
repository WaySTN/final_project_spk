import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleRouteError } from "@/lib/api/response";
import { checkRateLimit, getClientKey } from "@/lib/auth/rate-limit";
import {
  LOCAL_ADMIN_COOKIE,
  getLocalAdminCredentials,
  signLocalAdminToken,
  verifyWriteOrigin,
} from "@/lib/auth/session";
import { isLocalTestMode, isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export async function POST(request: Request) {
  try {
    if (!verifyWriteOrigin(request)) {
      return apiError(403, "INVALID_ORIGIN", "Permintaan lintas origin tidak diizinkan.");
    }

    const rate = checkRateLimit(getClientKey(request, "admin_login"), 15, 60_000);
    if (!rate.allowed) {
      return apiError(
        429,
        "RATE_LIMITED",
        `Terlalu banyak percobaan login. Coba lagi dalam ${rate.retryAfterSeconds} detik.`,
      );
    }

    const body = loginSchema.parse(await request.json());
    const genericFailure = () =>
      apiError(401, "INVALID_CREDENTIALS", "Email atau kata sandi tidak valid.");

    if (isSupabaseConfigured()) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });

      if (error || !data.user) {
        return genericFailure();
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        return apiError(
          403,
          "FORBIDDEN",
          "Akun ini tidak memiliki hak akses administrator penelitian.",
        );
      }

      return NextResponse.json({
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
            fullName: profile.full_name ?? "Administrator Peneliti",
          },
        },
        error: null,
        meta: { mode: "supabase" },
      });
    }

    if (isLocalTestMode()) {
      const expected = getLocalAdminCredentials();
      if (
        body.email.toLowerCase() !== expected.email.toLowerCase() ||
        body.password !== expected.password
      ) {
        return genericFailure();
      }

      const token = signLocalAdminToken({
        id: "00000000-0000-0000-0000-000000000001",
        email: expected.email,
        exp: Date.now() + 8 * 60 * 60 * 1000,
      });

      const response = NextResponse.json({
        data: {
          user: {
            id: "00000000-0000-0000-0000-000000000001",
            email: expected.email,
            fullName: "Administrator Lokal (Pengujian)",
          },
        },
        error: null,
        meta: { mode: "local_test" },
      });

      response.cookies.set(LOCAL_ADMIN_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 8 * 60 * 60,
      });
      return response;
    }

    return apiError(
      503,
      "AUTH_NOT_CONFIGURED",
      "Supabase Auth belum dikonfigurasi. Lengkapi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
