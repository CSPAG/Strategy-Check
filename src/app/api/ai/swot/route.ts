import { AiError, aiJson, obj, str } from "@/lib/ai";
import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import mammoth from "mammoth";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;

type Swot = { strengths: string; gaps: string; opportunities: string; risks: string; hinweis: string };

const SCHEMA = obj({ strengths: str, gaps: str, opportunities: str, risks: str, hinweis: str });

const FORMAT =
  "Jedes SWOT-Feld als kurze Stichwortliste, eine Zeile pro Punkt, Zeilen beginnen mit «– ». " +
  "Drei bis sechs Punkte pro Feld, je höchstens 15 Wörter. Stärken/Schwächen = intern (Team), " +
  "Chancen/Risiken = extern (Markt, Kundschaft, Konkurrenz, Technologie, Regulierung). " +
  "Im Feld «hinweis» in ein bis zwei Sätzen erklären, was geändert oder woher etwas übernommen wurde.";

/**
 * mode=extract: SWOT aus hochgeladenem Dokument (PDF, DOCX, TXT/MD) ableiten.
 * mode=optimize: vorhandene SWOT-Texte schärfen, richtig zuordnen, Dubletten entfernen.
 */
export async function POST(req: Request) {
  const { user, error } = await requireUser("edit");
  if (error) return error;

  const form = await req.formData();
  const mode = form.get("mode") === "extract" ? "extract" : "optimize";
  const assessmentId = String(form.get("assessmentId") ?? "");
  const current = JSON.parse(String(form.get("current") ?? "{}")) as Partial<Swot>;

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { team: true, period: true },
  });
  if (!assessment) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const context =
    `Team: ${assessment.team.name} (${assessment.team.category}), Periode ${assessment.period.label}.\n` +
    `Aktuelle SWOT:\nStärken:\n${current.strengths || "–"}\nSchwächen:\n${current.gaps || "–"}\n` +
    `Chancen:\n${current.opportunities || "–"}\nRisiken:\n${current.risks || "–"}`;

  try {
    let result: Swot;
    if (mode === "extract") {
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "Datei ist grösser als 10 MB." }, { status: 400 });
      const name = file.name.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      const instructions =
        "Leite aus dem beigefügten Dokument eine SWOT-Analyse für das genannte Team ab. Übernimm nur, was im " +
        "Dokument steht oder klar daraus folgt. Bestehende SWOT-Punkte beibehalten und sinnvoll ergänzen. " +
        FORMAT;

      if (name.endsWith(".pdf")) {
        result = await aiJson<Swot>({
          instructions,
          schemaName: "swot",
          schema: SCHEMA,
          input: [
            { type: "input_text", text: context },
            { type: "input_file", filename: file.name, file_data: `data:application/pdf;base64,${buffer.toString("base64")}` },
          ],
        });
      } else {
        let text: string;
        if (name.endsWith(".docx")) text = (await mammoth.extractRawText({ buffer })).value;
        else if (/\.(txt|md|csv)$/.test(name)) text = buffer.toString("utf8");
        else return NextResponse.json({ error: "Erlaubt sind PDF, DOCX, TXT oder MD." }, { status: 400 });
        result = await aiJson<Swot>({
          instructions,
          schemaName: "swot",
          schema: SCHEMA,
          input: `${context}\n\nDokument «${file.name}»:\n${text.slice(0, 60_000)}`,
        });
      }
      await audit(user, "AI", `${assessment.team.name} · ${assessment.period.label}`, `SWOT aus Dokument «${file.name}»`);
    } else {
      const notes = String(form.get("text") ?? "");
      result = await aiJson<Swot>({
        instructions:
          "Überarbeite die SWOT-Analyse: Punkte schärfen und konkret formulieren, falsch zugeordnete Punkte ins " +
          "richtige Feld verschieben, Dubletten zusammenführen. Zusätzliche Notizen des Teams einarbeiten. " +
          "Inhalt nicht erfinden. " +
          FORMAT,
        schemaName: "swot",
        schema: SCHEMA,
        input: `${context}${notes ? `\n\nZusätzliche Notizen des Teams:\n${notes}` : ""}`,
      });
      await audit(user, "AI", `${assessment.team.name} · ${assessment.period.label}`, "SWOT optimiert");
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof AiError ? e.message : "KI-Verarbeitung fehlgeschlagen.";
    if (!(e instanceof AiError)) console.error("[ai:swot]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
