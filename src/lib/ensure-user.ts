import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/keycloak-roles";
import type { User } from "@prisma/client";

type SessionIdentity = {
  id: string;
  keycloakSub: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: AppRole;
};

export type ProvisionedUser = User & {
  team: { id: string; name: string } | null;
};

export async function ensureDbUser(
  identity: SessionIdentity
): Promise<ProvisionedUser | null> {
  const keycloakSub = identity.keycloakSub || identity.id;
  if (!keycloakSub) return null;

  const email =
    identity.email?.trim().toLowerCase() || `${keycloakSub}@keycloak.local`;
  const name = identity.name?.trim() || email.split("@")[0] || "Benutzer";

  const bySubject = await prisma.user.findUnique({
    where: { keycloakSub },
    include: {
      team: { select: { id: true, name: true } },
    },
  });
  const byEmail = bySubject
    ? null
    : await prisma.user.findUnique({
        where: { email },
        include: {
          team: { select: { id: true, name: true } },
        },
      });
  const existing = bySubject ?? byEmail;

  if (existing) {
    if (existing.keycloakSub && existing.keycloakSub !== keycloakSub) {
      throw new Error("E-Mail ist bereits mit einer anderen Keycloak-ID verknüpft.");
    }

    const emailConflict =
      existing.email === email
        ? null
        : await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          });
    const refreshLastLogin =
      !existing.lastLoginAt ||
      Date.now() - existing.lastLoginAt.getTime() > 60 * 60 * 1000;

    return prisma.user.update({
      where: { id: existing.id },
      data: {
        keycloakSub,
        keycloakIssuer:
          process.env.KEYCLOAK_ISSUER ?? process.env.AUTH_KEYCLOAK_ISSUER,
        email: emailConflict ? existing.email : email,
        name,
        image: identity.image,
        role: identity.role,
        ...(refreshLastLogin ? { lastLoginAt: new Date() } : {}),
      },
      include: {
        team: { select: { id: true, name: true } },
      },
    });
  }

  return prisma.user.create({
    data: {
      keycloakSub,
      keycloakIssuer:
        process.env.KEYCLOAK_ISSUER ?? process.env.AUTH_KEYCLOAK_ISSUER,
      email,
      name,
      image: identity.image,
      role: identity.role,
      lastLoginAt: new Date(),
    },
    include: {
      team: { select: { id: true, name: true } },
    },
  });
}
