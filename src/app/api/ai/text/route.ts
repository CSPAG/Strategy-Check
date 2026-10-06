import { AiError, aiJson, obj, str } from "@/lib/ai";
import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const bodySchema = z.object({
  label: z.string().max(300),
  text: z.string().min(1).max(20_000),
  team: z.string().max(200).default(""),
});

/** Freitext klarer formulieren (z. B. Erläuterung zur Zielerreichung). */
export async function POST(req: Request) {
  const { user, error } = await requireUser("edit");
  if (error) return error;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  const { label, text, team } = parsed.data;

  try {
    const result = await aiJson<{ text: string; hinweis: string }>({
      instructions:
        "Überarbeite den Text für das Feld «" + label + "»: klar, konkret, kurze Sätze oder Stichworte. " +
        "Inhalt und Aussagen beibehalten, nichts hinzuerfinden, Länge etwa gleich oder kürzer. " +
        "Im Feld «hinweis» in einem Satz sagen, was verbessert wurde und was inhaltlich noch fehlt.",
      schemaName: "text",
      schema: obj({ text: str, hinweis: str }),
      input: `${team ? `Team: ${team}\n` : ""}Text:\n${text}`,
    });
    await audit(user, "AI", team, `Text verbessert: ${label}`);
    return NextResponse.json(result);
  } catch (e) {
    if (!(e instanceof AiError)) console.error("[ai:text]", e);
    return NextResponse.json(
      { error: e instanceof AiError ? e.message : "KI-Verarbeitung fehlgeschlagen." },
      { status: 502 }
    );
  }
}
