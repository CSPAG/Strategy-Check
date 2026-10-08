import "server-only";
import { aiJson, obj, str, strArr } from "@/lib/ai";
import { getStrategicGoalFullLabel, getMaturityLabel, parseStrategicGoals } from "@/lib/constants";
import { parseStrategicGoalMaturity } from "@/lib/strategic-maturity";
import { MEASURE_STATUS, type MeasureStatus } from "@/lib/measure-labels";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import type { Assessment, Measure, Period, Team } from "@prisma/client";

/** KI-Auswertung einer einzelnen Abgabe (Circle/Unit, Periode) — für Factsheet und PDF. */

export type TeamSummary = {
  kurzfassung: string;
  staerken: string[];
  handlungsfelder: string[];
  plausibilitaet: string;
  empfehlungen: string[];
};

export type StoredTeamSummary = { data: TeamSummary; updatedAt: string; stale: boolean };

type Full = Assessment & { team: Team; period: Period; measureItems: Measure[] };

const key = (assessmentId: string) => `team-summary:${assessmentId}`;

const SCHEMA = obj({
  kurzfassung: str,
  staerken: strArr,
  handlungsfelder: strArr,
  plausibilitaet: str,
  empfehlungen: strArr,
});

function describe(a: Full, previous: Full | null): string {
  const goals = parseStrategicGoals(a.strategicGoals);
  const m = parseStrategicGoalMaturity(a.strategicGoalMaturity ?? "{}");
  const pm = previous ? parseStrategicGoalMaturity(previous.strategicGoalMaturity ?? "{}") : {};
  const goalLines = goals.map((id) => {
    const v = m[String(id)] ?? { today: 2, outlook: 2 };
    const p = pm[String(id)];
    return (
      `- ${getStrategicGoalFullLabel(id)}: heute ${v.today} (${getMaturityLabel(v.today)}), Prognose ${v.outlook}` +
      (p ? `; Vorperiode ${previous!.period.label}: Ist ${p.today}, damalige Prognose ${p.outlook}` : "")
    );
  });
  const measures = a.measureItems.map(
    (x) =>
      `- [${x.area}] ${x.title} · Erfolgskriterium: ${x.indicator || "–"} · Verantwortung: ${x.owner || "–"} · ` +
      `Termin: ${x.dueDate ? x.dueDate.toISOString().slice(0, 10) : "–"} · Status: ${MEASURE_STATUS[x.status as MeasureStatus] ?? x.status}`
  );
  return [
    `Team: ${a.team.name} (${a.team.category}), Periode ${a.period.label}, Status ${a.status === "SUBMITTED" ? "eingereicht" : "Entwurf"}.`,
    `Strategische Ziele (Skala 1 nicht erreicht – 5 erreicht):\n${goalLines.join("\n") || "–"}`,
    `Erläuterung: ${a.maturityNotes || "–"}`,
    `SWOT\nStärken:\n${a.strengths || "–"}\nSchwächen:\n${a.gaps || "–"}\nChancen:\n${a.opportunities || "–"}\nRisiken:\n${a.risks || "–"}`,
    `Massnahmen:\n${[...measures, a.measures].filter(Boolean).join("\n") || "–"}`,
    `Reifegrad (1–10): Intern ${a.matrixYToday}, Markt ${a.matrixXToday}` +
      (a.matrixOutlookSet ? `; Prognose +6 Monate: Intern ${a.matrixYOutlook}, Markt ${a.matrixXOutlook}` : "") +
      (previous ? `; Vorperiode: Intern ${previous.matrixYToday}, Markt ${previous.matrixXToday}` : "") +
      `\nErläuterung Reifegrad: ${a.matrixNotes || "–"}`,
  ].join("\n\n");
}

async function load(assessmentId: string) {
  const a = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: { team: true, period: true, measureItems: { orderBy: { sort: "asc" } } },
  });
  const previous = await findPrevious(a);
  const text = describe(a, previous);
  return { a, text, hash: createHash("sha256").update(text).digest("hex") };
}

/** Letzte eingereichte Abgabe desselben Teams aus einer früheren Periode. */
export async function findPrevious(a: Assessment & { period: Period }): Promise<Full | null> {
  const candidates = await prisma.assessment.findMany({
    where: { teamId: a.teamId, status: "SUBMITTED", id: { not: a.id } },
    include: { team: true, period: true, measureItems: { orderBy: { sort: "asc" } } },
  });
  const key = (label: string) => {
    const m = label.match(/^H([12])\s+(\d{4})$/);
    return m ? Number(m[2]) * 2 + Number(m[1]) : 0;
  };
  const current = key(a.period.label);
  return (
    candidates
      .filter((c) => key(c.period.label) < current)
      .sort((x, y) => key(y.period.label) - key(x.period.label))[0] ?? null
  );
}

export async function getTeamSummary(assessmentId: string): Promise<StoredTeamSummary | null> {
  const row = await prisma.aiInsight.findUnique({ where: { key: key(assessmentId) } });
  if (!row) return null;
  const { hash } = await load(assessmentId);
  return { data: JSON.parse(row.json) as TeamSummary, updatedAt: row.updatedAt.toISOString(), stale: row.inputHash !== hash };
}

export async function computeTeamSummary(assessmentId: string): Promise<StoredTeamSummary> {
  const { text, hash } = await load(assessmentId);
  const data = await aiJson<TeamSummary>({
    instructions:
      "Werte die Selbsteinschätzung eines Teams zur CSPstrategie 2026+ aus, als Teil seines Factsheets. " +
      "«kurzfassung»: drei bis fünf Sätze — wo steht das Team, was fällt auf. «staerken» und «handlungsfelder»: " +
      "je zwei bis vier kurze Punkte (max. 15 Wörter) aus Zielen, SWOT und Reifegrad. «plausibilitaet»: ein bis " +
      "zwei Sätze, ob Prognosen, Massnahmen und SWOT zusammenpassen (z. B. Prognose steigt ohne passende " +
      "Massnahme, Prognose der Vorperiode verfehlt). «empfehlungen»: zwei bis vier konkrete nächste Schritte. " +
      "Nur auf Basis der Angaben, nichts erfinden, sachlich und wertschätzend.",
    schemaName: "team_auswertung",
    schema: SCHEMA,
    input: text,
  });
  const row = await prisma.aiInsight.upsert({
    where: { key: key(assessmentId) },
    create: { key: key(assessmentId), inputHash: hash, json: JSON.stringify(data) },
    update: { inputHash: hash, json: JSON.stringify(data) },
  });
  return { data, updatedAt: row.updatedAt.toISOString(), stale: false };
}
