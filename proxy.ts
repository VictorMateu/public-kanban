import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { findProjectRoute } from "./lib/projects/queries";
import { isProjectSlug } from "./lib/projects/slug";
import { PROJECT_NOT_FOUND_HEADER } from "./lib/projects/urls";
import type { Database } from "./lib/supabase/database.types";
import { getAuthCookieOptions } from "./lib/supabase/cookie-options";
import { getSupabaseConfig, isSupabaseConfigured } from "./lib/supabase/env";

function projectRouteSlug(request: NextRequest): string | undefined {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  const segment = /^\/projects\/([^/]+)\/?$/.exec(request.nextUrl.pathname)?.[1];
  if (!segment) return;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function renderProjectNotFound(request: NextRequest, response: NextResponse) {
  request.headers.set(PROJECT_NOT_FOUND_HEADER, "1");
  const headers = new Headers(response.headers);
  for (const name of [...headers.keys()]) {
    if (name === "x-middleware-override-headers" || name.startsWith("x-middleware-request-")) headers.delete(name);
  }
  return NextResponse.next({ request, headers });
}

export async function proxy(request: NextRequest) {
  request.headers.delete(PROJECT_NOT_FOUND_HEADER);
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const slug = projectRouteSlug(request);

  if (!isSupabaseConfigured()) {
    return slug !== undefined && !isProjectSlug(slug) ? renderProjectNotFound(request, response) : response;
  }

  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient<Database>(url, key, {
    cookieOptions: getAuthCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const previousCookies = response.cookies.getAll();
        response = NextResponse.next({ request });
        previousCookies.forEach((cookie) => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        response.headers.set("Cache-Control", "private, no-store");
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (slug !== undefined && (!isProjectSlug(slug) || await findProjectRoute(slug, data?.claims.sub ? supabase : undefined) === "missing")) {
    return renderProjectNotFound(request, response);
  }
  return response;
}

export const config = { matcher: ["/admin/:path*", "/projects/:path*", "/project-images/:path*"] };
