"use client";

import { teamShapeClass } from "@/lib/team-colors";
import { useState } from "react";

type TeamRow = {
  id: string;
  name: string;
  category: string;
  color: string;
  status: string;
  contactEmail: string;
};

type Draft = { team: string; to: string[]; subject: string; text: string };
type Result =
  | { mode: "draft"; drafts: Draft[]; missing: string[] }
  | { mode: "sent"; sent: string[]; failed: string[]; missing: string[]; error?: string };

const DEFAULT_SUBJECT = "Erinnerung: Strategie-Check {periode} für {team}";
const DEFAULT_BODY =
  "Guten Tag\n\nDie Selbsteinschätzung zum Strategie-Check {periode} für {team} ist noch nicht eingereicht. " +
  "Bitte erfassen und einreichen bis [DATUM]:\n{link}\n\nBesten Dank und freundliche Grüsse";

/** Teams ohne Abgabe auswählen, Kontakt pflegen, Erinnerung senden (SMTP) oder als Mail-Entwurf öffnen. */
export function ReminderPanel({
  periodId,
  periodLabel,
  teams,
  mailConfigured,
  mailLabel,
}: {
  periodId: string;
  periodLabel: string;
  teams: TeamRow[];
  mailConfigured: boolean;
  mailLabel: string | null;
}) {
  const open = teams.filter((t) => t.status !== "SUBMITTED");
  const [selected, setSelected] = useState<Set<string>>(new Set(open.map((t) => t.id)));
  const [contacts, setContacts] = useState<Record<string, string>>(
    Object.fromEntries(teams.map((t) => [t.id, t.contactEmail]))
  );
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [testInfo, setTestInfo] = useState("");

  const sendTest = async () => {
    setTestInfo("Testmail wird gesendet…");
    const res = await fetch("/api/admin/mail-test", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setTestInfo(res.ok ? `Testmail an ${json.to} gesendet. Bitte Posteingang prüfen.` : json.error ?? "Fehler");
  };

  const saveContact = async (id: string) => {
    const res = await fetch(`/api/admin/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactEmail: contacts[id] ?? "" }),
    });
    if (!res.ok) setError("Kontakt konnte nicht gespeichert werden.");
  };

  const send = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId, teamIds: [...selected], subject, body, appUrl: window.location.origin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setResult(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-6">
      <p className="nebentext">
        {open.length} von {teams.length} Teams haben {periodLabel} noch nicht eingereicht.{" "}
        {mailConfigured
          ? `Versand direkt aus dem Tool über ${mailLabel}: Jedes Team erhält eine eigene E-Mail an seine Kontaktadresse(n).`
          : "Kein Mailversand konfiguriert — es werden Mail-Entwürfe für das eigene Mailprogramm erstellt."}
      </p>

      <div className="overflow-x-auto rounded-[22px] bg-white p-5">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-csp-ink text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-csp-grau">
              <th className="w-8 py-2" />
              <th className="py-2 pr-3">Team</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2">Kontakt für Erinnerungen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-csp-linie font-semibold">
            {teams.map((t) => (
              <tr key={t.id}>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggle(t.id)}
                    className="h-4 w-4 accent-csp-ink"
                    aria-label={`${t.name} auswählen`}
                  />
                </td>
                <td className="py-2 pr-3 font-extrabold">
                  <span className="inline-flex items-center gap-2">
                    <span className={`inline-block h-[10px] w-[10px] ${teamShapeClass(t.category)}`} style={{ background: t.color }} />
                    {t.name}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-csp-grau">
                    <span
                      className={`inline-block h-[7px] w-[7px] rounded-full ${
                        t.status === "SUBMITTED" ? "bg-csp-gruen" : "bg-csp-linie"
                      }`}
                    />
                    {t.status === "SUBMITTED" ? "Eingereicht" : "Offen"}
                  </span>
                </td>
                <td className="py-1.5">
                  <input
                    className="eingabe py-1.5 text-[13.5px]"
                    value={contacts[t.id] ?? ""}
                    placeholder="name@csp-ag.ch, weitere mit Komma"
                    onChange={(e) => setContacts({ ...contacts, [t.id]: e.target.value })}
                    onBlur={() => saveContact(t.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 rounded-[22px] bg-white p-5">
        <label>
          <span className="label mb-2 block">Betreff</span>
          <input className="eingabe" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label>
          <span className="label mb-2 block">Text · Platzhalter {"{team}"}, {"{periode}"}, {"{link}"}</span>
          <textarea className="eingabe" rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {mailConfigured && confirming ? (
            <>
              <span className="text-[14px] font-bold">
                {selected.size} E-Mails jetzt versenden (eine pro Team)?
              </span>
              <button
                type="button"
                className="btn-primaer"
                disabled={busy}
                onClick={async () => {
                  await send();
                  setConfirming(false);
                }}
              >
                {busy ? "Wird gesendet…" : "Ja, senden"}
              </button>
              <button type="button" className="btn-sekundaer" onClick={() => setConfirming(false)}>
                Abbrechen
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-primaer"
              disabled={busy || selected.size === 0}
              onClick={() => (mailConfigured ? setConfirming(true) : send())}
            >
              {busy ? "Wird vorbereitet…" : `${mailConfigured ? "Erinnerung senden" : "Mail-Entwürfe erstellen"} (${selected.size})`}
            </button>
          )}
          {mailConfigured && !confirming && (
            <button type="button" className="btn-sekundaer" onClick={sendTest}>
              Testmail an mich
            </button>
          )}
        </div>
        {testInfo && <p className="text-[13px] font-bold text-csp-grau">{testInfo}</p>}
        {error && <p className="text-[13px] font-bold text-csp-rot">{error}</p>}
      </div>

      {result?.mode === "sent" && (
        <div className="rounded-[22px] bg-white p-5 text-[14px] font-semibold">
          <p>
            <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-csp-gruen" />
            Gesendet an: {result.sent.join(", ") || "–"}
          </p>
          {result.failed.length > 0 && (
            <p className="mt-1">
              <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-csp-rot" />
              Fehler bei: {result.failed.join(", ")}
              {result.error && <span className="block text-[13px] text-csp-grau">{result.error}</span>}
            </p>
          )}
          {result.missing.length > 0 && <p className="mt-1">Ohne Kontaktadresse: {result.missing.join(", ")}</p>}
        </div>
      )}
      {result?.mode === "draft" && (
        <div className="space-y-3">
          {result.missing.length > 0 && (
            <p className="nebentext">Ohne Kontaktadresse (Entwurf ohne Empfänger): {result.missing.join(", ")}</p>
          )}
          {result.drafts.map((d) => (
            <div key={d.team} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4">
              <span className="text-[14px] font-extrabold">
                {d.team}
                <span className="block text-[12.5px] font-semibold text-csp-grau">{d.to.join(", ") || "kein Empfänger"}</span>
              </span>
              <a
                className="btn-sekundaer py-1.5 text-[13px]"
                href={`mailto:${d.to.join(",")}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.text)}`}
              >
                Im Mailprogramm öffnen
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
