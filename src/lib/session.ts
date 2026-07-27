import { auth } from "@/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { ensureDbUser } from "@/lib/ensure-user";
import type { Session } from "next-auth";

export const DEMO_SESSION: Session = {
  user: {
    id: "demo-user",
    keycloakSub: "demo-user",
    name: "Demo",
    email: "demo@csp.local",
    roles: ["GL_VIEWER"],
    role: "GL_VIEWER",
    teamId: null,
    teamName: null,
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

export async function getSession(): Promise<Session | null> {
  if (isDemoMode()) return DEMO_SESSION;

  const session = await auth();
  if (!session?.user) return null;

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
