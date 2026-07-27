import { auth } from "@/auth";
import { isGlRole } from "@/lib/keycloak-roles";
import { NextResponse } from "next/server";

function getRequestOrigin(req: Request): string | null {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  if (!host) return null;

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol = forwardedProto?.split(",")[0]?.trim() || "https";
  const origin = `${protocol}://${host}`;
  return origin.startsWith("http://") || origin.startsWith("https://") ? origin : null;
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

  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (!req.auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    const origin =
      getRequestOrigin(req) ??
      process.env.AUTH_URL ??
      process.env.NEXTAUTH_URL ??
      req.nextUrl.origin;
    const login = new URL("/login", origin);
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/dashboard") && !isGlRole(req.auth.user.role)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|branding/).*)"],
};
