import { prisma } from "@/lib/prisma";

export const AUDIT_ACTIONS = {
  LOGIN: "Anmeldung",
  SAVE: "Entwurf gespeichert",
  SUBMIT: "Eingereicht",
  MEASURE: "Massnahme geändert",
  AI: "KI-Funktion",
  REMINDER: "Erinnerung",
  ADMIN: "Admin",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

/** Schreibt einen Protokolleintrag. Fehler werden nur geloggt, nie an den Nutzer weitergereicht. */
export async function audit(
  user: { email?: string | null; name?: string | null } | null | undefined,
  action: AuditAction,
  target?: string,
  detail = ""
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userEmail: user?.email ?? null,
        userName: user?.name ?? null,
        action,
        target: target ?? null,
        detail: detail.slice(0, 2000),
      },
    });
  } catch (error) {
    console.error("[audit]", error);
  }
}
