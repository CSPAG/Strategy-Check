import { auth } from "@/auth";
import { canAccessDashboard } from "@/lib/keycloak-roles";
import { NextResponse } from "next/server";

function getRequestOrigin(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  const fallbackOrigin = (() => {
    try {
      return new URL(req.url).origin;
    } catch {
      return process.env.AUTH_URL ?? "http://localhost:3000";
    }
  })();
  if (!host) return fallbackOrigin;

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProto?.split(",")[0]?.trim() ||
    (() => {
      try {
        return new URL(req.url).protocol.replace(":", "");
      } catch {
        return "https";
      }
    })();
  const origin = `${protocol}://${host}`;
  return origin.startsWith("http://") || origin.startsWith("https://")
    ? origin
    : fallbackOrigin;
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  if (process.env.DEMO_MODE === "true") {
    if (pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  const isLoginPage = pathname.startsWith("/login");
  const isAuthRoute = pathname.startsWith("/api/auth");

  // Login und Auth-Routen dürfen ohne Session erreichbar sein — sonst entsteht
  // ein Redirect-Loop (/login → /login?callbackUrl=/login → …).
  if (isAuthRoute || (isLoginPage && !req.auth)) {
    return NextResponse.next();
  }

  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const origin =
      process.env.AUTH_URL ??
      process.env.NEXTAUTH_URL ??
      getRequestOrigin(req);
    const login = new URL("/login", origin);
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/dashboard") && !canAccessDashboard(req.auth.user.role)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|branding/).*)"],
};
