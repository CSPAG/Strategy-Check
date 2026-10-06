import "server-only";
import nodemailer from "nodemailer";

/**
 * E-Mail-Versand direkt aus dem Tool. Zwei Wege, der erste konfigurierte gewinnt:
 *
 * 1. Microsoft 365 über Microsoft Graph (empfohlen für CSP):
 *    MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MAIL_FROM (Absender-Postfach).
 *    Entra-ID-App mit Anwendungsberechtigung «Mail.Send» (Admin-Zustimmung), idealerweise per
 *    Application Access Policy auf das Absender-Postfach beschränkt.
 * 2. SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
 *
 * Ohne Konfiguration erstellt der Admin-Bereich Mail-Entwürfe für das eigene Mailprogramm.
 */

export type MailTransport = "graph" | "smtp";

export function mailTransport(): MailTransport | null {
  const e = process.env;
  if (e.MS_GRAPH_TENANT_ID && e.MS_GRAPH_CLIENT_ID && e.MS_GRAPH_CLIENT_SECRET && e.MAIL_FROM) return "graph";
  if (e.SMTP_HOST && e.MAIL_FROM) return "smtp";
  return null;
}

export function isMailConfigured(): boolean {
  return mailTransport() !== null;
}

export const MAIL_TRANSPORT_LABEL: Record<MailTransport, string> = {
  graph: "Microsoft 365",
  smtp: "SMTP",
};

/** Absenderadresse ohne Anzeigenamen («Name <a@b.ch>» → «a@b.ch»). */
function senderAddress(): string {
  const from = (process.env.MAIL_FROM ?? "").trim();
  return from.match(/<([^>]+)>/)?.[1] ?? from.trim();
}

export type Mail = { to: string[]; subject: string; text: string; html: string };

export async function sendMail(mail: Mail): Promise<void> {
  const transport = mailTransport();
  if (transport === "graph") return sendViaGraph(mail);
  if (transport === "smtp") return sendViaSmtp(mail);
  throw new Error("Kein E-Mail-Versand konfiguriert.");
}

/** Env-Wert ohne mitkopierte Leerzeichen, Zeilenumbrüche oder Anführungszeichen. */
function env(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^["']|["']$/g, "");
}

/**
 * Hinweise zum hinterlegten Clientschlüssel, ohne ihn preiszugeben (für Fehlermeldungen im Admin).
 * Ein Schlüssel-Wert aus Entra ID hat ~40 Zeichen; die Geheimnis-ID ist eine GUID (36 Zeichen mit Bindestrichen).
 */
export function describeClientSecret(): string {
  const raw = process.env.MS_GRAPH_CLIENT_SECRET ?? "";
  const v = env("MS_GRAPH_CLIENT_SECRET");
  const parts = [`hinterlegt: ${v.length} Zeichen`];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    parts.push("hat das Format einer Geheimnis-ID (GUID) — eingetragen werden muss der «Wert»");
  } else if (v === env("MS_GRAPH_CLIENT_ID") || v === env("MS_GRAPH_TENANT_ID")) {
    parts.push("ist identisch mit Client- bzw. Tenant-ID");
  } else if (v.length < 30) {
    parts.push("ungewöhnlich kurz für einen Schlüssel-Wert");
  } else {
    parts.push(`Format plausibel (beginnt mit «${v.slice(0, 3)}…»)`);
  }
  if (raw !== v) parts.push("enthielt Leerzeichen/Zeilenumbruch, wurde bereinigt");
  return parts.join(", ");
}

async function graphToken(): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${env("MS_GRAPH_TENANT_ID")}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("MS_GRAPH_CLIENT_ID"),
      client_secret: env("MS_GRAPH_CLIENT_SECRET"),
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    const code = (json?.error_codes?.[0] as number | undefined) ?? 0;
    const hint = code === 7000215 || code === 7000222 ? ` — Schlüssel ${describeClientSecret()}.` : "";
    throw new Error(`Microsoft-Anmeldung fehlgeschlagen: ${json?.error_description?.split("\r")[0] ?? res.status}${hint}`);
  }
  return json.access_token as string;
}

async function sendViaGraph(mail: Mail): Promise<void> {
  const token = await graphToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderAddress())}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: mail.subject,
        body: { contentType: "HTML", content: mail.html },
        toRecipients: mail.to.map((address) => ({ emailAddress: { address } })),
      },
      saveToSentItems: true,
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(`Versand über Microsoft 365 fehlgeschlagen: ${json?.error?.message ?? res.status}`);
  }
}

async function sendViaSmtp(mail: Mail): Promise<void> {
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Schlichte HTML-Mail im CSP-Stil aus Klartext: Absätze, Links als Button, Fusszeile mit blauen Punkten.
 * Inline-Styles, damit Outlook sie darstellt.
 */
export function renderMailHtml(text: string): string {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((line) => {
        const url = line.trim().match(/^https?:\/\/\S+$/)?.[0];
        if (url) {
          return `<a href="${escapeHtml(url)}" style="display:inline-block;margin:6px 0;padding:11px 20px;border-radius:999px;background:#141413;color:#ffffff;text-decoration:none;font-weight:700">Zur Selbsteinschätzung →</a>`;
        }
        return escapeHtml(line).replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" style="color:#0093D3">$1</a>'
        );
      });
      return `<p style="margin:0 0 14px">${lines.join("<br>")}</p>`;
    })
    .join("");
  const dot = '<span style="display:inline-block;width:6px;height:6px;border-radius:3px;background:#0093D3;margin:0 3px 3px 0"></span>';
  const dots = `${dot.repeat(3)}<br>${dot.repeat(3)}`;

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f6f3">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;font-family:Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#141413">
<p style="margin:0 0 18px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#55534e">CSP Strategie-Check</p>
${paragraphs}
<p style="margin:22px 0 0;padding-top:14px;border-top:1px solid #dcd9d2;font-size:12px;color:#55534e">${dots}<br>CSP AG · Strategie-Zyklus 2026–2028</p>
</div></body></html>`;
}
