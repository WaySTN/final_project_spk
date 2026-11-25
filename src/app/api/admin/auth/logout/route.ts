import { NextResponse } from "next/server";
import { apiError, handleRouteError } from "@/lib/api/response";
import { LOCAL_ADMIN_COOKIE, verifyWriteOrigin } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!verifyWriteOrigin(request)) {
      return apiError(403, "INVALID_ORIGIN", "Permintaan lintas origin tidak diizinkan.");
    }

    if (isSupabaseConfigured()) {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    }

    const response = NextResponse.json({
      data: { loggedOut: true },
      error: null,
      meta: {},
    });
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
