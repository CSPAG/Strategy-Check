import { prisma } from "@/lib/prisma";

export const AUDIT_ACTIONS = {
  LOGIN: "Anmeldung",
  SAVE: "Entwurf gespeichert",
  SUBMIT: "Eingereicht",
  MEASURE: "Massnahme geändert",
  AI: "KI-Funktion",
  REMINDER: "Erinnerung",
  ADMIN: "Admin",
  VIEW: "Seite aufgerufen",
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

/** Wie audit(), aber pro Person, Aktion und Ziel höchstens einmal im Zeitfenster (für Seitenaufrufe). */
export async function auditOnce(
  user: { email?: string | null; name?: string | null } | null | undefined,
  action: AuditAction,
  target: string,
  detail = "",
  windowMs = 30 * 60 * 1000
): Promise<void> {
  try {
    const recent = await prisma.auditLog.findFirst({
      where: {
        userEmail: user?.email ?? null,
        action,
        target,
        detail,
        createdAt: { gte: new Date(Date.now() - windowMs) },
      },
      select: { id: true },
    });
    if (!recent) await audit(user, action, target, detail);
  } catch (error) {
    console.error("[audit]", error);
  }
}
