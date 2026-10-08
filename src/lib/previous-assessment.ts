import "server-only";
import { prisma } from "@/lib/prisma";
import { parseStrategicGoals } from "@/lib/constants";
import { parseStrategicGoalMaturity } from "@/lib/strategic-maturity";
import type { Assessment, Period } from "@prisma/client";

/** Was die Erfassung aus der Vorperiode grau anzeigt bzw. übernehmen kann. */
export type PreviousAssessment = {
  period: string;
  submitted: boolean;
  goals: number[];
  goalMaturity: Record<string, { today: number; outlook: number }>;
  matrix: { today: { x: number; y: number }; outlook: { x: number; y: number } | null };
  swot: { strengths: string; gaps: string; opportunities: string; risks: string };
  openMeasures: {
    area: string;
    title: string;
    indicator: string;
    owner: string;
    dueDate: string;
    status: string;
  }[];
};

const periodKey = (label: string) => {
  const m = label.match(/^H([12])\s+(\d{4})$/);
  return m ? Number(m[2]) * 2 + Number(m[1]) : 0;
};

/** Letzte Abgabe des Teams vor der Periode: bevorzugt eingereicht, sonst der jüngste Entwurf. */
export async function findPreviousSource(teamId: string, periodLabel: string, excludeId?: string) {
  const current = periodKey(periodLabel);
  const earlier = (
    await prisma.assessment.findMany({
      where: { teamId, ...(excludeId ? { id: { not: excludeId } } : {}) },
      include: { period: true, measureItems: { orderBy: { sort: "asc" } } },
    })
  )
    .filter((c) => periodKey(c.period.label) < current)
    .sort((x, y) => periodKey(y.period.label) - periodKey(x.period.label));
  return earlier.find((c) => c.status === "SUBMITTED") ?? earlier[0] ?? null;
}

export async function loadPreviousAssessment(a: Assessment & { period: Period }): Promise<PreviousAssessment | null> {
  const prev = await findPreviousSource(a.teamId, a.period.label, a.id);
  if (!prev) return null;

  const goals = parseStrategicGoals(prev.strategicGoals);
  const maturity = parseStrategicGoalMaturity(prev.strategicGoalMaturity ?? "{}");
  return {
    period: prev.period.label,
    submitted: prev.status === "SUBMITTED",
    goals,
    goalMaturity: Object.fromEntries(goals.map((id) => [String(id), maturity[String(id)] ?? { today: 2, outlook: 2 }])),
    matrix: {
      today: { x: prev.matrixXToday, y: prev.matrixYToday },
      outlook: prev.matrixOutlookSet ? { x: prev.matrixXOutlook, y: prev.matrixYOutlook } : null,
    },
    swot: { strengths: prev.strengths, gaps: prev.gaps, opportunities: prev.opportunities, risks: prev.risks },
    openMeasures: prev.measureItems
      .filter((m) => m.status === "OFFEN" || m.status === "IN_ARBEIT")
      .map((m) => ({
        area: m.area,
        title: m.title,
        indicator: m.indicator,
        owner: m.owner,
        dueDate: m.dueDate ? m.dueDate.toISOString().slice(0, 10) : "",
        status: m.status,
      })),
  };
}
