"use client";

import { AiBadge, callAi } from "@/components/assessment/ai-client";
import { useState } from "react";

/** «Mit KI verbessern» für ein Freitextfeld: Vorschlag zeigen, erst auf Wunsch übernehmen. */
export function AiTextButton({
  label,
  text,
  team,
  onApply,
}: {
  label: string;
  text: string;
  team: string;
  onApply: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<{ text: string; hinweis: string } | null>(null);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      setProposal(await callAi("/api/ai/text", { label, text, team }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={run}
        disabled={busy || !text.trim()}
        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-bold text-csp-grau hover:bg-white hover:text-csp-ink disabled:opacity-40"
        title={!text.trim() ? "Zuerst Text erfassen" : undefined}
      >
        <AiBadge />
        {busy ? "KI überarbeitet…" : "Mit KI verbessern"}
      </button>
      {error && <p className="mt-1 text-[12.5px] font-bold text-csp-rot">{error}</p>}
      {proposal && (
        <div className="mt-2 rounded-2xl bg-white p-4 ring-2 ring-inset ring-csp-ink">
          <p className="kicker mb-2">Vorschlag der KI</p>
          <p className="fliesstext whitespace-pre-wrap">{proposal.text}</p>
          {proposal.hinweis && <p className="nebentext mt-2">{proposal.hinweis}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-primaer py-1.5 text-[13px]"
              onClick={() => {
                onApply(proposal.text);
                setProposal(null);
              }}
            >
              Übernehmen
            </button>
            <button type="button" className="btn-sekundaer py-1.5 text-[13px]" onClick={() => setProposal(null)}>
              Verwerfen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
