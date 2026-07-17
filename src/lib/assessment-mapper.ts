import { STRATEGIC_GOALS, parseStrategicGoals } from "@/lib/constants";
import {
  parseStrategicGoalMaturity,
  averageMaturityToday,
} from "@/lib/strategic-maturity";
import type { Assessment } from "@prisma/client";

export function getStrategicMaturityRows(assessment: Assessment & { team: { name: string; category: string } }) {
  const goalIds = parseStrategicGoals(assessment.strategicGoals);
  const maturity = parseStrategicGoalMaturity(assessment.strategicGoalMaturity);
  const goals = STRATEGIC_GOALS.filter((g) => goalIds.includes(g.id)).map((g) => ({
    id: g.id,
    label: g.label,
    today: maturity[String(g.id)]?.today ?? 2,
    outlook: maturity[String(g.id)]?.outlook ?? 2,
  }));

  return {
    teamName: assessment.team.name,
    category: assessment.team.category,
    goals,
    avgToday: averageMaturityToday(maturity, goalIds),
  };
}
