import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

const protectedPaths = ["/", "/history", "/profile", "/stats"];

function isProtectedPath(pathname: string) {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function proxy(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/onboarding";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/onboarding";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && request.nextUrl.pathname === "/onboarding") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
