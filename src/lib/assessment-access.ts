import { isGlRole } from "@/lib/auth";
import type { Assessment, Team } from "@prisma/client";

type SessionUser = {
  role?: string;
  teamId?: string | null;
};

export function canEditAssessment(
  user: SessionUser,
  assessment: Assessment & { team: Team }
): boolean {
  if (isGlRole(user.role)) return true;
  if (user.role === "ADMIN") return true;
  return user.teamId === assessment.teamId;
}

export function canViewAssessment(user: SessionUser): boolean {
  return !!user.role;
}
