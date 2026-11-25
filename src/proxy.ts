import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  LOCAL_ADMIN_COOKIE,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isLocalTestMode,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const isAdminPage =
    pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isSupabaseConfigured()) {
    const supabase = createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isAdminPage && !user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  if (isAdminPage) {
    if (isLocalTestMode()) {
      const hasCookie = Boolean(request.cookies.get(LOCAL_ADMIN_COOKIE)?.value);
      if (!hasCookie) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/admin/login";
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
