import { prisma } from "@/lib/prisma";

/**
 * Admins des Strategie-Checks. Die festen Admins sind immer Admin und können nicht entfernt werden;
 * sie (und jeder weitere Admin) können im Admin-Bereich zusätzliche Admins ernennen (Tabelle AdminGrant).
 * Keycloak-Rollen ergeben höchstens «Editor» — Admin-Rechte vergibt nur das Tool selbst.
 */
export const FIXED_ADMINS = [
  "jaron.lorenzi@csp-ag.ch",
  "martin.kalberer@csp-ag.ch",
  "roger.kuenzli@csp-ag.ch",
] as const;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isFixedAdmin(email: string | null | undefined): boolean {
  return (FIXED_ADMINS as readonly string[]).includes(normalizeEmail(email));
}

export async function isAppAdmin(email: string | null | undefined): Promise<boolean> {
  const e = normalizeEmail(email);
  if (!e) return false;
  if (isFixedAdmin(e)) return true;
  return Boolean(await prisma.adminGrant.findUnique({ where: { email: e } }));
}
