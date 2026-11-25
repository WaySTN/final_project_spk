import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiError, handleRouteError } from "@/lib/api/response";
import { LOCAL_ADMIN_COOKIE, verifyWriteOrigin } from "@/lib/auth/session";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!verifyWriteOrigin(request)) {
      return apiError(403, "INVALID_ORIGIN", "Permintaan lintas origin tidak diizinkan.");
    }

    const pendingCookies: Array<{
      name: string;
      value: string;
      options?: Parameters<NextResponse["cookies"]["set"]>[2];
    }> = [];

    if (isSupabaseConfigured()) {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        getSupabaseUrl()!,
        getSupabaseAnonKey()!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              for (const cookie of cookiesToSet) {
                pendingCookies.push(cookie);
                try {
                  cookieStore.set(cookie.name, cookie.value, cookie.options);
                } catch {
                  // Handled below via explicit NextResponse cookies
                }
              }
            },
          },
        },
      );
      await supabase.auth.signOut();
    }

    const response = NextResponse.json({
      data: { loggedOut: true },
      error: null,
      meta: {},
    });

    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }

    response.cookies.set(LOCAL_ADMIN_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (err) {
    return handleRouteError(err);
  }
}
