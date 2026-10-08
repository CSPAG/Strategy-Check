"use client";

import { AiBadge, callAi } from "@/components/assessment/ai-client";
import type { StoredTeamSummary } from "@/lib/team-summary";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Management Summary oben im Factsheet. Entsteht automatisch beim Einreichen; Editoren können sie hier
 * erstellen oder aktualisieren. Die Kapitel-Einordnungen kommen aus derselben Auswertung (ChapterNote).
 */
export function ManagementSummary({
  assessmentId,
  summary,
  canGenerate,
  submitted,
}: {
  assessmentId: string;
  summary: StoredTeamSummary | null;
  canGenerate: boolean;
  submitted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      await callAi<StoredTeamSummary>("/api/ai/team-summary", { assessmentId });
      router.refresh(); // lädt Summary, Kapitel-Einordnungen und Druckansicht neu
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[28px] bg-csp-sand/60 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="zwischentitel">
          Management Summary. <span className="text-csp-grau-titel">Das Wichtigste in Kürze.</span>
        </h2>
        <div className="no-print flex flex-wrap items-center gap-3">
          {summary && (
            <span className="flex items-center gap-2 text-[12.5px] font-bold text-csp-grau">
              <span className={`inline-block h-[7px] w-[7px] rounded-full ${summary.stale ? "bg-csp-gelb" : "bg-csp-gruen"}`} />
              {summary.stale ? "Abgabe seither geändert" : "Aktuell"} · Stand{" "}
              {new Date(summary.updatedAt).toLocaleString("de-CH", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}
          {canGenerate && (
            <button type="button" className="btn-sekundaer bg-white" disabled={busy} onClick={run}>
              <AiBadge />
              {busy ? "KI wertet aus…" : summary ? "Aktualisieren" : "Jetzt erstellen"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-[13px] font-bold text-csp-rot">{error}</p>}

      {!summary ? (
        <p className="nebentext mt-4">
          {submitted
            ? "Die KI-Auswertung wird beim Einreichen automatisch erstellt. Für diese Abgabe liegt noch keine vor."
            : "Die KI-Auswertung entsteht automatisch, sobald die Abgabe eingereicht ist."}
        </p>
      ) : (
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <p className="fliesstext">{summary.data.managementSummary}</p>
            <List label="Kernpunkte" items={summary.data.kernpunkte} />
          </div>
          <div>
            <List label="Empfehlungen" items={summary.data.empfehlungen} />
            <p className="nebentext mt-5">
              KI-generiert auf Basis dieser Abgabe und der Vorperiode — zur Diskussion, nicht als Bewertung.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-5 first:mt-0">
      <p className="label">{label}</p>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-[14.5px] font-semibold leading-snug text-csp-text">
            <span className="mt-[7px] inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-csp-blau" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Kurze KI-Einordnung am Anfang eines Kapitels. */
export function ChapterNote({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <div className="mb-6 flex max-w-4xl gap-3 rounded-2xl bg-csp-blau/[0.07] px-4 py-3">
      <AiBadge />
      <p className="text-[14px] font-semibold leading-relaxed text-csp-text">
        <span className="font-extrabold text-csp-ink">KI-Einordnung: </span>
        {text}
      </p>
    </div>
  );
}
