import "next-auth";
import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/keycloak-roles";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      keycloakSub: string;
      roles: AppRole[];
      role: AppRole;
      teamId: string | null;
      teamName: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    keycloakSub?: string;
    keycloakIssuer?: string;
    roles?: AppRole[];
    role?: AppRole;
  }
}
