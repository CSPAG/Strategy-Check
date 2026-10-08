import { STRATEGIC_GOALS, getStrategicGoalFullLabel, getStrategicGoalShortLabel } from "@/lib/constants";
import { round1, type TeamTrend } from "@/lib/dashboard-data";
import type { TimelineRow, TimelineValue } from "@/components/charts/GoalTimeline";

/** Minimal-Snapshot für den Verlauf (Dashboard und Factsheet). */
export type TimelineSnapshot = {
  period: string;
  goals: { id: number; today: number; outlook: number }[];
};

/** Verlauf eines Teams: eine Zeile pro Ziel, das das Team in irgendeiner Periode verfolgt hat. */
export function teamTimelineRows(snapshots: TimelineSnapshot[], periods: string[]): TimelineRow[] {
  const byPeriod = new Map(snapshots.map((s) => [s.period, s]));
  const latest = snapshots.at(-1);
  const goalIds = Array.from(new Set(snapshots.flatMap((s) => s.goals.map((g) => g.id)))).sort((a, b) => a - b);
  return goalIds.map((id) => {
    const at = (p: string | undefined) => (p ? byPeriod.get(p)?.goals.find((g) => g.id === id) : undefined);
    return {
      key: String(id),
      title: getStrategicGoalShortLabel(id),
      fullTitle: getStrategicGoalFullLabel(id),
      ist: periods.map((p) => at(p)?.today ?? null),
      forecastFromPrev: periods.map((p, i) => (at(p) && at(periods[i - 1]) ? at(periods[i - 1])!.outlook : null)),
      outlook: at(latest?.period)?.outlook ?? null,
    };
  });
}

const avg = (ns: number[]) => (ns.length ? round1(ns.reduce((a, b) => a + b, 0) / ns.length) : null);

/** Durchschnitt pro Ziel über alle Teams und Perioden, mit Einzelwerten je Periode. */
export function averageTimelineRows(teams: TeamTrend[], periods: string[]): TimelineRow[] {
  const lastPeriod = periods.at(-1);
  return STRATEGIC_GOALS.flatMap((g) => {
    const valuesAt = (p: string | undefined, field: "today" | "outlook"): TimelineValue[] =>
      p
        ? teams.flatMap((t) => {
            const v = t.snapshots.find((s) => s.period === p)?.goals.find((x) => x.id === g.id);
            return v ? [{ name: t.name, color: t.color, square: t.category === "Unit", value: v[field] }] : [];
          })
        : [];
    const perPeriod = periods.map((p) => valuesAt(p, "today"));
    if (perPeriod.every((v) => v.length === 0)) return [];
    const outlookValues = valuesAt(lastPeriod, "outlook");
    const teamsInLast = outlookValues.length;
    return [
      {
        key: String(g.id),
        title: `${g.id}. ${g.short}`,
        fullTitle: getStrategicGoalFullLabel(g.id),
        meta: `Ø · ${teamsInLast ? `${teamsInLast} ${teamsInLast === 1 ? "Team" : "Teams"} in ${lastPeriod}` : `nicht in ${lastPeriod}`}`,
        ist: perPeriod.map((v) => avg(v.map((x) => x.value))),
        forecastFromPrev: periods.map((p, i) => (i === 0 ? null : avg(valuesAt(periods[i - 1], "outlook").map((x) => x.value)))),
        outlook: avg(outlookValues.map((x) => x.value)),
        breakdown: [...perPeriod, outlookValues],
      },
    ];
  });
}
