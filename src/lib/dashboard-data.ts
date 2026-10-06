import { formatTeamCategory, parseStrategicGoals } from "@/lib/constants";
import { parseStrategicGoalMaturity } from "@/lib/strategic-maturity";
import { getOutlookPeriodLabel, sortPeriodLabels } from "@/lib/period-labels";
import type { Assessment, Measure, Period, Team } from "@prisma/client";

export type GoalValue = { id: number; today: number; outlook: number };

export type MeasureRow = {
  id: string;
  area: string;
  title: string;
  indicator: string;
  owner: string;
  dueDate: string | null;
  status: string;
};

/** Eine eingereichte Selbsteinschätzung eines Teams in einer Periode. */
export type PeriodSnapshot = {
  period: string;
  assessmentId: string;
  intern: number;
  markt: number;
  goals: GoalValue[];
  swot: { strengths: string; gaps: string; opportunities: string; risks: string };
  measures: MeasureRow[];
  measuresText: string;
};

export type TeamTrend = {
  id: string;
  name: string;
  category: "Circle" | "Unit";
  /** Eigene Teamfarbe (siehe team-colors.ts). */
  color: string;
  /** Chronologisch sortiert (älteste zuerst). */
  snapshots: PeriodSnapshot[];
};

/** Prognose der Vorperiode (+6 Monate) gegenüber dem Ist der Folgeperiode. */
export type ForecastCheck = {
  goalId: number;
  fromPeriod: string;
  toPeriod: string;
  forecast: number;
  actual: number;
};

export function toSnapshot(a: Assessment & { period: Period; measureItems?: Measure[] }): PeriodSnapshot {
  const goalIds = parseStrategicGoals(a.strategicGoals);
  const maturity = parseStrategicGoalMaturity(a.strategicGoalMaturity ?? "{}");
  return {
    period: a.period.label,
    assessmentId: a.id,
    swot: { strengths: a.strengths, gaps: a.gaps, opportunities: a.opportunities, risks: a.risks },
    measures: (a.measureItems ?? []).map((m) => ({
      id: m.id,
      area: m.area,
      title: m.title,
      indicator: m.indicator,
      owner: m.owner,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
      status: m.status,
    })),
    measuresText: [a.measures, a.matrixNotes].filter(Boolean).join("\n\n"),
    intern: a.matrixYToday,
    markt: a.matrixXToday,
    goals: goalIds.map((id) => ({
      id,
      today: maturity[String(id)]?.today ?? 2,
      outlook: maturity[String(id)]?.outlook ?? 2,
    })),
  };
}

export function buildTeamTrends(
  assessments: (Assessment & { team: Team; period: Period; measureItems?: Measure[] })[]
): TeamTrend[] {
  const byTeam = new Map<string, TeamTrend>();
  for (const a of assessments) {
    const category = formatTeamCategory(a.team.category) as "Circle" | "Unit";
    const entry = byTeam.get(a.teamId) ?? {
      id: a.teamId,
      name: a.team.name,
      category,
      color: "#0093D3",
      snapshots: [],
    };
    entry.snapshots.push(toSnapshot(a));
    byTeam.set(a.teamId, entry);
  }
  for (const team of byTeam.values()) {
    const order = sortPeriodLabels(team.snapshots.map((s) => s.period));
    team.snapshots.sort((x, y) => order.indexOf(x.period) - order.indexOf(y.period));
  }
  return Array.from(byTeam.values()).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Für jede Periode, deren Folgeperiode ebenfalls eingereicht ist: Prognose vs. Ist je Ziel. */
export function forecastChecks(team: TeamTrend): ForecastCheck[] {
  const checks: ForecastCheck[] = [];
  for (const from of team.snapshots) {
    const next = team.snapshots.find((s) => s.period === getOutlookPeriodLabel(from.period));
    if (!next) continue;
    for (const g of from.goals) {
      const actual = next.goals.find((n) => n.id === g.id);
      if (!actual) continue;
      checks.push({
        goalId: g.id,
        fromPeriod: from.period,
        toPeriod: next.period,
        forecast: g.outlook,
        actual: actual.today,
      });
    }
  }
  return checks;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
