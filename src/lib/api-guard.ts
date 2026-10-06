import { getSession } from "@/lib/session";
import { canAccessDashboard, canEditAnyAssessment } from "@/lib/keycloak-roles";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

type Need = "view" | "edit" | "admin";

/** Session prüfen; liefert entweder den Benutzer oder eine fertige Fehlerantwort. */
export async function requireUser(
  need: Need
): Promise<{ user: Session["user"]; error?: never } | { user?: never; error: NextResponse }> {
  const session = await getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };
  }
  const role = session.user.role;
  const ok =
    need === "admin" ? role === "ADMIN" : need === "edit" ? canEditAnyAssessment(role) : canAccessDashboard(role);
  if (!ok) return { error: NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 }) };
  return { user: session.user };
}
