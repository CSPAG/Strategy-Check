import { AiError, aiJson, obj, str } from "@/lib/ai";
import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { getStrategicGoalFullLabel, getMaturityLabel } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const bodySchema = z.object({
  assessmentId: z.string(),
  area: z.enum(["SWOT", "REIFEGRAD"]),
  draft: z.object({
    strengths: z.string().default(""),
    gaps: z.string().default(""),
    opportunities: z.string().default(""),
    risks: z.string().default(""),
    maturityNotes: z.string().default(""),
    matrixNotes: z.string().default(""),
    intern: z.number(),
    markt: z.number(),
    goals: z.array(z.object({ id: z.number(), today: z.number(), outlook: z.number() })),
    existing: z.array(z.string()).default([]),
  }),
});

type Suggestion = { title: string; indicator: string; dueInMonths: number; begruendung: string };

const SCHEMA = obj({
  measures: {
    type: "array",
    items: obj({ title: str, indicator: str, dueInMonths: { type: "integer" }, begruendung: str }),
  },
});

export async function POST(req: Request) {
  const { user, error } = await requireUser("edit");
  if (error) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  const { assessmentId, area, draft } = parsed.data;

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { team: true, period: true },
  });
  if (!assessment) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const goals = draft.goals
    .map((g) => `- ${getStrategicGoalFullLabel(g.id)}: heute ${g.today} (${getMaturityLabel(g.today)}), Prognose ${g.outlook}`)
    .join("\n");

  const focus =
    area === "SWOT"
      ? "Leite Massnahmen aus der SWOT ab: Stärken nutzen, Schwächen beheben, Chancen ergreifen, Risiken abwehren. " +
        "Bevorzugt Massnahmen, die auf die gewählten strategischen Ziele einzahlen."
      : "Schlage Massnahmen vor, die den Reifegrad Intern (Kompetenzen, Rekrutierung, Akquise, Substanz) und " +
        "Markt (Marktattraktivität, Portfolio, Marktstellung, Marktanteile) in einem Jahr um mindestens einen Punkt erhöhen.";

  try {
    const result = await aiJson<{ measures: Suggestion[] }>({
      instructions:
        `${focus} Drei bis fünf Massnahmen. Jede Massnahme ist konkret und überprüfbar: «title» als Tätigkeit ` +
        "(max. 12 Wörter), «indicator» als messbares Erfolgskriterium (Zahl, Ergebnis oder Lieferobjekt), " +
        "«dueInMonths» realistisch zwischen 1 und 12, «begruendung» ein Satz mit Bezug auf die Einschätzung. " +
        "Keine Personennamen. Keine Dubletten zu bestehenden Massnahmen.",
      schemaName: "massnahmen",
      schema: SCHEMA,
      input:
        `Team: ${assessment.team.name} (${assessment.team.category}), Periode ${assessment.period.label}.\n\n` +
        `Strategische Ziele:\n${goals || "–"}\nErläuterung: ${draft.maturityNotes || "–"}\n\n` +
        `SWOT\nStärken:\n${draft.strengths || "–"}\nSchwächen:\n${draft.gaps || "–"}\n` +
        `Chancen:\n${draft.opportunities || "–"}\nRisiken:\n${draft.risks || "–"}\n\n` +
        `Reifegrad: Intern ${draft.intern}/10, Markt ${draft.markt}/10. Notizen: ${draft.matrixNotes || "–"}\n\n` +
        `Bestehende Massnahmen:\n${draft.existing.map((e) => `- ${e}`).join("\n") || "–"}`,
    });
    await audit(user, "AI", `${assessment.team.name} · ${assessment.period.label}`, `Massnahmen vorgeschlagen (${area})`);
    return NextResponse.json(result);
  } catch (e) {
    if (!(e instanceof AiError)) console.error("[ai:measures]", e);
    return NextResponse.json(
      { error: e instanceof AiError ? e.message : "KI-Verarbeitung fehlgeschlagen." },
      { status: 502 }
    );
  }
}
