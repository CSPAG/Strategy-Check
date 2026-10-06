import "server-only";
import { aiJson, obj, str, strArr } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

/** Qualitative Auswertung: wiederkehrende Themen über alle eingereichten SWOTs und Massnahmen einer Periode. */

export type Theme = {
  theme: string;
  beschreibung: string;
  teams: string[];
  belege: { team: string; text: string }[];
};

export type SwotInsight = {
  summary: string;
  strengths: Theme[];
  gaps: Theme[];
  opportunities: Theme[];
  risks: Theme[];
  measures: Theme[];
};

export type StoredInsight = { data: SwotInsight; updatedAt: string; stale: boolean };

const themeSchema = obj({
  theme: str,
  beschreibung: str,
  teams: strArr,
  belege: { type: "array", items: obj({ team: str, text: str }) },
});
const themeList = { type: "array", items: themeSchema };
const SCHEMA = obj({
  summary: str,
  strengths: themeList,
  gaps: themeList,
  opportunities: themeList,
  risks: themeList,
  measures: themeList,
});

const insightKey = (period: string) => `swot-themes:${period}`;

async function loadInput(period: string) {
  const assessments = await prisma.assessment.findMany({
    where: { status: "SUBMITTED", period: { label: period } },
    include: { team: true, measureItems: { orderBy: { sort: "asc" } } },
    orderBy: { team: { name: "asc" } },
  });
  const blocks = assessments.map((a) =>
    [
      `### ${a.team.name}`,
      `Stärken:\n${a.strengths || "–"}`,
      `Schwächen:\n${a.gaps || "–"}`,
      `Chancen:\n${a.opportunities || "–"}`,
      `Risiken:\n${a.risks || "–"}`,
      `Massnahmen:\n${[...a.measureItems.map((m) => `- ${m.title}`), a.measures, a.matrixNotes].filter(Boolean).join("\n") || "–"}`,
    ].join("\n")
  );
  const text = blocks.join("\n\n");
  return {
    teams: assessments.map((a) => a.team.name),
    text,
    hash: createHash("sha256").update(text).digest("hex"),
  };
}

export async function getStoredInsight(period: string): Promise<StoredInsight | null> {
  const row = await prisma.aiInsight.findUnique({ where: { key: insightKey(period) } });
  if (!row) return null;
  const { hash } = await loadInput(period);
  return { data: JSON.parse(row.json) as SwotInsight, updatedAt: row.updatedAt.toISOString(), stale: row.inputHash !== hash };
}

export async function computeInsight(period: string): Promise<StoredInsight> {
  const { teams, text, hash } = await loadInput(period);
  if (teams.length === 0) throw new Error("Für diese Periode ist noch nichts eingereicht.");

  const result = await aiJson<SwotInsight>({
    instructions:
      "Werte die SWOT-Analysen und Massnahmen aller Teams qualitativ aus. Fasse inhaltlich gleiche oder sehr " +
      "ähnliche Nennungen zu Themen zusammen (auch bei unterschiedlicher Formulierung). Pro Kategorie die " +
      "wichtigsten Themen, sortiert nach Anzahl nennender Teams, höchstens 8. «theme» kurz (2–6 Wörter), " +
      "«beschreibung» ein Satz, «teams» exakt die Teamnamen aus der Liste, die das Thema nennen, «belege» pro " +
      "Team die Originalformulierung (gekürzt auf max. 20 Wörter). Themen, die nur ein Team nennt, nur aufnehmen, " +
      "wenn sie strategisch auffallen. «summary»: drei bis fünf Sätze CSP-Sicht — Muster, Widersprüche, blinde Flecken.",
    schemaName: "swot_auswertung",
    schema: SCHEMA,
    input: `Periode ${period}. Teams: ${teams.join(", ")}\n\n${text}`,
  });

  // Nur bekannte Teamnamen zulassen.
  const known = new Set(teams);
  for (const key of ["strengths", "gaps", "opportunities", "risks", "measures"] as const) {
    result[key] = result[key]
      .map((t) => ({
        ...t,
        teams: Array.from(new Set(t.teams.filter((n) => known.has(n)))),
        belege: t.belege.filter((b) => known.has(b.team)),
      }))
      .filter((t) => t.teams.length > 0)
      .sort((a, b) => b.teams.length - a.teams.length);
  }

  const row = await prisma.aiInsight.upsert({
    where: { key: insightKey(period) },
    create: { key: insightKey(period), inputHash: hash, json: JSON.stringify(result) },
    update: { inputHash: hash, json: JSON.stringify(result) },
  });
  return { data: result, updatedAt: row.updatedAt.toISOString(), stale: false };
}
