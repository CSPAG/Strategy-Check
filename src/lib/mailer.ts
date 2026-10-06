import "server-only";
import nodemailer from "nodemailer";

/**
 * E-Mail-Versand über SMTP (z. B. Microsoft 365: smtp.office365.com, Port 587).
 * Konfiguration: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
 * Ohne Konfiguration bietet der Admin-Bereich einen Mail-Entwurf im eigenen Mailprogramm an.
 */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

export async function sendMail({ to, subject, text }: { to: string[]; subject: string; text: string }) {
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
