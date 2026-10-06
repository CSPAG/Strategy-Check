import { auth } from "@/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { ensureDbUser } from "@/lib/ensure-user";
import { isAppAdmin } from "@/lib/admins";
import { primaryRole, type AppRole } from "@/lib/keycloak-roles";
import type { Session } from "next-auth";

/** Demo-Modus: standardmässig Admin; mit DEMO_ROLE=EDITOR oder VIEWER lässt sich die Sicht anderer testen. */
function demoSession(): Session {
  const role: AppRole = process.env.DEMO_ROLE === "EDITOR" || process.env.DEMO_ROLE === "VIEWER" ? process.env.DEMO_ROLE : "ADMIN";
  return {
    user: {
      id: "demo-user",
      keycloakSub: "demo-user",
      name: "Demo",
      email: "demo@csp.local",
      roles: [role],
      role,
      teamId: null,
      teamName: null,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

export async function getSession(): Promise<Session | null> {
  if (isDemoMode()) return demoSession();

  const session = await auth();
  if (!session?.user) return null;

  // Admin nur über die Admin-Liste des Tools, nie über Keycloak.
  const baseRoles: AppRole[] = session.user.roles.filter((r) => r !== "ADMIN");
  try {
    if (await isAppAdmin(session.user.email)) baseRoles.push("ADMIN");
  } catch (error) {
    console.error("[auth:admin]", error);
  }
  session.user.roles = baseRoles.length ? baseRoles : ["VIEWER"];
  session.user.role = primaryRole(session.user.roles);

  try {
    const user = await ensureDbUser(session.user);
    session.user.teamId = user?.teamId ?? null;
    session.user.teamName = user?.team?.name ?? null;
  } catch (error) {
    // Authentifizierung bleibt bei einem temporären DB-Problem gültig.
    // Fachliche Team-Zugriffe bleiben ohne teamId weiterhin gesperrt.
    console.error("[auth:provisioning]", error);
  }

  return session;
}
