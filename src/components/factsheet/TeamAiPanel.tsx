"use client";

import { AiBadge, callAi } from "@/components/assessment/ai-client";
import type { StoredTeamSummary } from "@/lib/team-summary";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** KI-Auswertung einer Abgabe im Factsheet: anzeigen, erstellen, aktualisieren. */
export function TeamAiPanel({
  assessmentId,
  initial,
  canGenerate,
}: {
  assessmentId: string;
  initial: StoredTeamSummary | null;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setSummary(await callAi<StoredTeamSummary>("/api/ai/team-summary", { assessmentId }));
      router.refresh(); // damit auch die Druckansicht den neuen Text hat
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        {canGenerate && (
          <button type="button" className="btn-sekundaer" disabled={busy} onClick={run}>
            <AiBadge />
            {busy ? "KI wertet aus…" : summary ? "Auswertung aktualisieren" : "Mit KI auswerten"}
          </button>
        )}
        {summary && (
          <span className="flex items-center gap-2 text-[12.5px] font-bold text-csp-grau">
            <span className={`inline-block h-[7px] w-[7px] rounded-full ${summary.stale ? "bg-csp-gelb" : "bg-csp-gruen"}`} />
            {summary.stale ? "Abgabe wurde seither geändert" : "Aktuell"} · Stand{" "}
            {new Date(summary.updatedAt).toLocaleString("de-CH", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </div>
      {error && <p className="text-[13px] font-bold text-csp-rot">{error}</p>}

      {!summary ? (
        <p className="nebentext">
          Noch keine KI-Auswertung für diese Abgabe.
          {canGenerate ? " Sie erscheint nach dem Erstellen auch im PDF." : ""}
        </p>
      ) : (
        <div className="space-y-6">
          <p className="fliesstext max-w-3xl">{summary.data.kurzfassung}</p>
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <ListBlock label="Stärken" items={summary.data.staerken} />
            <ListBlock label="Handlungsfelder" items={summary.data.handlungsfelder} />
          </div>
          {summary.data.plausibilitaet && (
            <div className="max-w-3xl">
              <p className="label">Plausibilität</p>
              <p className="fliesstext">{summary.data.plausibilitaet}</p>
            </div>
          )}
          <ListBlock label="Empfehlungen" items={summary.data.empfehlungen} />
          <p className="nebentext">KI-generiert auf Basis dieser Abgabe und der Vorperiode — zur Diskussion, nicht als Bewertung.</p>
        </div>
      )}
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
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
