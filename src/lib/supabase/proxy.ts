import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Renova a sessão do Supabase e protege as rotas do painel. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims().
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/painel/login";

  if (!loggedIn && !isLogin) {
    const to = request.nextUrl.clone();
    to.pathname = "/painel/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (loggedIn && isLogin) {
    const to = request.nextUrl.clone();
    to.pathname = "/painel";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return response;
}
