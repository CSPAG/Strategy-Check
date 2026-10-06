import { AiError } from "@/lib/ai";
import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { computeInsight } from "@/lib/insights";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

/** Qualitative Auswertung einer Periode neu berechnen (Ergebnis wird gespeichert). */
export async function POST(req: Request) {
  const { user, error } = await requireUser("edit");
  if (error) return error;
  const parsed = z.object({ period: z.string().min(1) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  try {
    const insight = await computeInsight(parsed.data.period);
    await audit(user, "AI", parsed.data.period, "Qualitative Auswertung aktualisiert");
    return NextResponse.json(insight);
  } catch (e) {
    if (!(e instanceof AiError)) console.error("[ai:insights]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 502 });
  }
}
