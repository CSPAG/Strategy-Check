import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { MAIL_TRANSPORT_LABEL, mailTransport, renderMailHtml, sendMail } from "@/lib/mailer";
import { NextResponse } from "next/server";

/** Testmail an die eigene Adresse — prüft die Mail-Konfiguration. */
export async function POST() {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const transport = mailTransport();
  if (!transport) return NextResponse.json({ error: "Kein E-Mail-Versand konfiguriert." }, { status: 400 });
  if (!user.email) return NextResponse.json({ error: "Für dein Konto ist keine E-Mail-Adresse bekannt." }, { status: 400 });

  const text =
    `Guten Tag\n\nDiese Testmail bestätigt, dass der Strategie-Check E-Mails über ${MAIL_TRANSPORT_LABEL[transport]} ` +
    `versenden kann.\n\nAbsender: ${process.env.MAIL_FROM}`;
  try {
    await sendMail({ to: [user.email], subject: "Testmail Strategie-Check", text, html: renderMailHtml(text) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Versand fehlgeschlagen" }, { status: 502 });
  }
  await audit(user, "REMINDER", user.email, "Testmail gesendet");
  return NextResponse.json({ ok: true, to: user.email });
}
