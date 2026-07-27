import { isGlRole } from "@/lib/auth";
import type { AppRole } from "@/lib/keycloak-roles";
import type { Assessment, Team } from "@prisma/client";

type SessionUser = {
  role?: AppRole;
  teamId?: string | null;
};

export function canEditAssessment(
  user: SessionUser,
  assessment: Assessment & { team: Team }
): boolean {
  if (isGlRole(user.role)) return true;
  return user.teamId === assessment.teamId;
}

export function canViewAssessment(
  user: SessionUser,
  assessment: Assessment & { team: Team }
): boolean {
  return isGlRole(user.role) || user.teamId === assessment.teamId;
}
