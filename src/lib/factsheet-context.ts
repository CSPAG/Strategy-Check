import "server-only";
import { getStoredInsight } from "@/lib/insights";
import { parseStrategicGoalMaturity } from "@/lib/strategic-maturity";
import { parseStrategicGoals } from "@/lib/constants";
import { findHistory, getTeamSummary, type StoredTeamSummary } from "@/lib/team-summary";
import type { Assessment, Period, Team } from "@prisma/client";

/** Alles, was Factsheet und PDF über die eigene Abgabe hinaus zeigen. */
export type FactsheetContext = {
  /** Letzte eingereichte Abgabe desselben Teams (Entwicklung, Prognose-Check). */
  previous: HistoryEntry | null;
  /** Alle früheren eingereichten Abgaben, chronologisch (Verlauf). */
  history: HistoryEntry[];
  /** Themen aus der CSP-weiten KI-Auswertung der Periode, die dieses Team nennt. */
  teamThemes: { category: string; theme: string; beschreibung: string; count: number; quote: string }[];
  themesUpdatedAt: string | null;
  summary: StoredTeamSummary | null;
};

export type HistoryEntry = {
  period: string;
  goals: Record<string, { today: number; outlook: number }>;
  intern: number;
  markt: number;
};

const CATEGORY_LABEL = {
  strengths: "Stärke",
  gaps: "Schwäche",
  opportunities: "Chance",
  risks: "Risiko",
  measures: "Massnahme",
} as const;

export async function loadFactsheetContext(a: Assessment & { team: Team; period: Period }): Promise<FactsheetContext> {
  const [hist, insight, summary] = await Promise.all([
    findHistory(a),
    getStoredInsight(a.period.label).catch(() => null),
    getTeamSummary(a.id).catch(() => null),
  ]);

  const teamThemes: FactsheetContext["teamThemes"] = [];
  if (insight) {
    for (const k of Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]) {
      for (const t of insight.data[k]) {
        if (!t.teams.includes(a.team.name)) continue;
        teamThemes.push({
          category: CATEGORY_LABEL[k],
          theme: t.theme,
          beschreibung: t.beschreibung,
          count: t.teams.length,
          quote: t.belege.find((b) => b.team === a.team.name)?.text ?? "",
        });
      }
    }
  }

  // Ziele nur, wenn sie in der damaligen Abgabe ausgewählt waren
  const history: HistoryEntry[] = hist.map((h) => {
    const m = parseStrategicGoalMaturity(h.strategicGoalMaturity ?? "{}");
    const ids = parseStrategicGoals(h.strategicGoals);
    return {
      period: h.period.label,
      goals: Object.fromEntries(ids.map((id) => [String(id), m[String(id)] ?? { today: 2, outlook: 2 }])),
      intern: h.matrixYToday,
      markt: h.matrixXToday,
    };
  });

  return {
    previous: history.at(-1) ?? null,
    history,
    teamThemes,
    themesUpdatedAt: insight?.updatedAt ?? null,
    summary,
  };
}
