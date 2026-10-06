import {
  canEditAnyAssessment,
  canUnlockSubmitted,
  canAccessDashboard,
} from "@/lib/keycloak-roles";
import type { AppRole } from "@/lib/keycloak-roles";
import type { Assessment, Period, Team } from "@prisma/client";

type SessionUser = {
  role?: AppRole;
  teamId?: string | null;
};

export function canEditAssessment(
  user: SessionUser,
  _assessment: Assessment & { team: Team }
): boolean {
  return canEditAnyAssessment(user.role);
}

export function canViewAssessment(
  user: SessionUser,
  _assessment: Assessment & { team: Team }
): boolean {
  return canAccessDashboard(user.role);
}

export function isAssessmentReadOnly(
  user: SessionUser,
  assessment: Assessment & { team: Team; period?: Period }
): boolean {
  if (!canEditAssessment(user, assessment)) return true;
  // Abgeschlossene Perioden sind nur noch für Admins bearbeitbar.
  if (assessment.period && !assessment.period.isActive && !canUnlockSubmitted(user.role)) {
    return true;
  }
  if (assessment.status === "SUBMITTED" && !canUnlockSubmitted(user.role)) {
    return true;
  }
  return false;
}
