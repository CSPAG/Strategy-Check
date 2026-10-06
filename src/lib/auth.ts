import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import type { AppRole } from "./keycloak-roles";
import {
  canAccessDashboard,
  canEditAnyAssessment,
  canUnlockSubmitted,
  collectKeycloakRoleNames,
  normalizeAppRoles,
  primaryRole,
  toAppRoles,
} from "./keycloak-roles";

const isProd = process.env.NODE_ENV === "production";

function decodeJwtPayload(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  const payload = value.split(".")[1];
  if (!payload) return {};

  try {
    const unpadded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(normalized), (character) =>
      character.charCodeAt(0)
    );
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function displayName(profile: Record<string, unknown>, email?: string | null): string {
  const given = typeof profile.given_name === "string" ? profile.given_name.trim() : "";
  const family = typeof profile.family_name === "string" ? profile.family_name.trim() : "";
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const username =
    typeof profile.preferred_username === "string"
      ? profile.preferred_username.trim()
      : "";

  return name || [given, family].filter(Boolean).join(" ") || username || email?.split("@")[0] || "Benutzer";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: process.env.AUTH_DEBUG === "true" || process.env.NODE_ENV !== "production",
  logger: {
    error(error) {
      console.error("[auth:error]", error);
    },
    warn(code) {
      console.warn("[auth:warn]", code);
    },
  },
  ...(isProd
    ? {
        cookies: {
          pkceCodeVerifier: {
            options: {
              httpOnly: true,
              sameSite: "lax" as const,
              secure: true,
              path: "/",
            },
          },
          state: {
            options: {
              httpOnly: true,
              sameSite: "lax" as const,
              secure: true,
              path: "/",
            },
          },
        },
      }
    : {}),
  providers: [
    Keycloak({
      clientId:
        process.env.KEYCLOAK_CLIENT_ID ?? process.env.AUTH_KEYCLOAK_ID ?? "",
      clientSecret:
        process.env.KEYCLOAK_CLIENT_SECRET ?? process.env.AUTH_KEYCLOAK_SECRET ?? "",
      issuer: process.env.KEYCLOAK_ISSUER ?? process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
        token.keycloakSub = account.providerAccountId;
      }

      if (account) {
        // Access-, Refresh- und ID-Token werden bewusst nicht im Session-JWT
        // gespeichert, damit das verschlüsselte Cookie klein bleibt.
        const idTokenClaims = decodeJwtPayload(account.id_token);
        const oidcProfile = {
          ...idTokenClaims,
          ...((profile as Record<string, unknown> | undefined) ?? {}),
        };
        const clientId =
          process.env.KEYCLOAK_CLIENT_ID ?? process.env.AUTH_KEYCLOAK_ID;
        token.roles = toAppRoles(collectKeycloakRoleNames(oidcProfile, clientId));
        token.name = displayName(
          oidcProfile,
          typeof token.email === "string" ? token.email : undefined
        );
        // Ersatz-Kennung für die Admin-Prüfung, falls Keycloak keine E-Mail mitgibt.
        token.username =
          typeof oidcProfile.preferred_username === "string" ? oidcProfile.preferred_username : undefined;
        if (!token.email && typeof oidcProfile.email === "string") token.email = oidcProfile.email;
      }

      const roles = normalizeAppRoles(token.roles as AppRole[] | undefined);
      token.roles = roles;
      token.role = primaryRole(roles);
      token.keycloakIssuer =
        process.env.KEYCLOAK_ISSUER ?? process.env.AUTH_KEYCLOAK_ISSUER;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.keycloakSub = (token.keycloakSub as string | undefined) ?? token.sub ?? "";
      session.user.roles = normalizeAppRoles(token.roles as AppRole[] | undefined);
      session.user.role = primaryRole(session.user.roles);
      session.user.teamId = null;
      session.user.teamName = null;
      session.user.username = (token.username as string | undefined) ?? null;
      session.user.name =
        (typeof token.name === "string" && token.name) ||
        session.user.email?.split("@")[0] ||
        "Benutzer";
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
});

export { canAccessDashboard, canEditAnyAssessment, canUnlockSubmitted };
