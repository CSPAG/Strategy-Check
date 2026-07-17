import { auth } from "@/auth";
import { isDemoMode } from "@/lib/demo-mode";
import type { Session } from "next-auth";

export const DEMO_SESSION: Session = {
  user: {
    id: "demo-user",
    name: "Demo",
    email: "demo@csp.local",
    role: "GL_VIEWER",
    teamId: null,
    teamName: null,
  },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

export async function getSession(): Promise<Session | null> {
  if (isDemoMode()) return DEMO_SESSION;
  return auth();
}
