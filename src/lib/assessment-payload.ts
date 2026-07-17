import type { Assessment } from "@prisma/client";

export function toAssessmentPayload(
  data: Assessment,
  submit: boolean
): Record<string, unknown> {
  return {
    status: submit ? "SUBMITTED" : data.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT",
    summary: data.summary,
    strengths: data.strengths,
    gaps: data.gaps,
    opportunities: data.opportunities,
    risks: data.risks,
    measures: data.measures,
    matrixXToday: data.matrixXToday,
    matrixYToday: data.matrixYToday,
    maturityNotes: data.maturityNotes,
    matrixNotes: data.matrixNotes,
    strategicGoals: data.strategicGoals,
    strategicGoalMaturity: data.strategicGoalMaturity,
  };
}
