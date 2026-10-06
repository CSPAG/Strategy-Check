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

const ORG_DOMAIN = "csp-ag.ch";

/** Vergleichbare Form: klein, ohne Leerzeichen, Umlaute ausgeschrieben (künzli = kuenzli). */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Mögliche Kennungen einer Person: E-Mail(s) und Keycloak-Benutzername (ggf. mit Firmendomain ergänzt). */
export function identityCandidates(...values: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const v of values) {
    const n = normalizeEmail(v);
    if (!n || n.endsWith("@keycloak.local")) continue;
    out.add(n);
    if (!n.includes("@")) out.add(`${n}@${ORG_DOMAIN}`);
  }
  return [...out];
}

export function isFixedAdmin(email: string | null | undefined): boolean {
  return (FIXED_ADMINS as readonly string[]).includes(normalizeEmail(email));
}

export async function isAppAdmin(...identities: (string | null | undefined)[]): Promise<boolean> {
  const candidates = identityCandidates(...identities);
  if (candidates.length === 0) return false;
  if (candidates.some(isFixedAdmin)) return true;
  return Boolean(await prisma.adminGrant.findFirst({ where: { email: { in: candidates } } }));
}
