import { AiError } from "@/lib/ai";
import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { computeTeamSummary } from "@/lib/team-summary";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

/** KI-Auswertung einer Abgabe neu erstellen (wird gespeichert und im Factsheet/PDF gezeigt). */
export async function POST(req: Request) {
  const { user, error } = await requireUser("edit");
  if (error) return error;
  const parsed = z.object({ assessmentId: z.string() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const a = await prisma.assessment.findUnique({
    where: { id: parsed.data.assessmentId },
    include: { team: true, period: true },
  });
  if (!a) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  try {
    const result = await computeTeamSummary(a.id);
    await audit(user, "AI", `${a.team.name} · ${a.period.label}`, "KI-Auswertung Factsheet erstellt");
    return NextResponse.json(result);
  } catch (e) {
    if (!(e instanceof AiError)) console.error("[ai:team-summary]", e);
    return NextResponse.json(
      { error: e instanceof AiError ? e.message : "KI-Verarbeitung fehlgeschlagen." },
      { status: 502 }
    );
  }
}
