import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  periodId: z.string(),
  teamIds: z.array(z.string()).min(1).max(50),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  appUrl: z.string().url(),
});

function splitEmails(value: string): string[] {
  return value
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

/**
 * Erinnerung an Teams ohne Abgabe. Platzhalter im Text: {team}, {periode}, {link}.
 * Mit SMTP-Konfiguration wird pro Team eine E-Mail an die hinterlegte Kontaktadresse gesendet,
 * sonst liefert die Antwort die Entwürfe für das eigene Mailprogramm.
 */
export async function POST(req: Request) {
  const { user, error } = await requireUser("admin");
  if (error) return error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  const { periodId, teamIds, subject, body, appUrl } = parsed.data;

  const assessments = await prisma.assessment.findMany({
    where: { periodId, teamId: { in: teamIds } },
    include: { team: true, period: true },
  });

  const drafts = assessments.map((a) => {
    const fill = (t: string) =>
      t
        .replaceAll("{team}", a.team.name)
        .replaceAll("{periode}", a.period.label)
        .replaceAll("{link}", `${appUrl.replace(/\/$/, "")}/assessment/${a.id}`);
    return { team: a.team.name, to: splitEmails(a.team.contactEmail), subject: fill(subject), text: fill(body) };
  });

  const missing = drafts.filter((d) => d.to.length === 0).map((d) => d.team);
  const sendable = drafts.filter((d) => d.to.length > 0);

  if (!isMailConfigured()) {
    await audit(user, "REMINDER", assessments[0]?.period.label, `Entwurf für ${drafts.map((d) => d.team).join(", ")}`);
    return NextResponse.json({ mode: "draft", drafts, missing });
  }

  const sent: string[] = [];
  const failed: string[] = [];
  for (const d of sendable) {
    try {
      await sendMail({ to: d.to, subject: d.subject, text: d.text });
      sent.push(d.team);
    } catch (e) {
      console.error("[reminder]", d.team, e);
      failed.push(d.team);
    }
  }
  await audit(
    user,
    "REMINDER",
    assessments[0]?.period.label,
    `Gesendet: ${sent.join(", ") || "–"}${failed.length ? ` · Fehler: ${failed.join(", ")}` : ""}${
      missing.length ? ` · Ohne Kontakt: ${missing.join(", ")}` : ""
    }`
  );
  return NextResponse.json({ mode: "sent", sent, failed, missing });
}
