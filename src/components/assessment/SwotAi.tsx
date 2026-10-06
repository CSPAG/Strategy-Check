"use client";

import { AiBadge, callAi } from "@/components/assessment/ai-client";
import { SWOT_FIELDS } from "@/lib/constants";
import { useRef, useState } from "react";

type SwotKey = keyof typeof SWOT_FIELDS;
type SwotValues = Record<SwotKey, string>;
type Proposal = SwotValues & { hinweis: string };

/** KI-Werkzeuge für die SWOT: Dokument hochladen oder vorhandene Texte optimieren. Nichts wird ohne Klick übernommen. */
export function SwotAi({
  assessmentId,
  values,
  onApply,
}: {
  assessmentId: string;
  values: SwotValues;
  onApply: (patch: Partial<SwotValues>) => void;
}) {
  const [busy, setBusy] = useState<"" | "extract" | "optimize">("");
  const [error, setError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [source, setSource] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (mode: "extract" | "optimize", file?: File) => {
    setBusy(mode);
    setError("");
    try {
      const form = new FormData();
      form.set("mode", mode);
      form.set("assessmentId", assessmentId);
      form.set("current", JSON.stringify(values));
      if (file) form.set("file", file);
      if (notes) form.set("text", notes);
      setProposal(await callAi<Proposal>("/api/ai/swot", form));
      setSource(file ? `aus «${file.name}»` : "optimiert");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const keys = Object.keys(SWOT_FIELDS) as SwotKey[];
  const applyAll = () => {
    if (!proposal) return;
    onApply(Object.fromEntries(keys.map((k) => [k, proposal[k]])) as SwotValues);
    setProposal(null);
  };

  return (
    <div className="mb-6 rounded-[22px] bg-white p-4 sm:p-5">
      <p className="label mb-3 flex items-center">
        <AiBadge /> KI-Unterstützung
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) run("extract", f);
          }}
        />
        <button type="button" className="btn-sekundaer" disabled={!!busy} onClick={() => fileRef.current?.click()}>
          {busy === "extract" ? "Dokument wird gelesen…" : "Dokument hochladen (PDF, DOCX, TXT)"}
        </button>
        <button
          type="button"
          className="btn-sekundaer"
          disabled={!!busy}
          onClick={() => (notesOpen ? run("optimize") : setNotesOpen(true))}
        >
          {busy === "optimize" ? "KI optimiert…" : notesOpen ? "Jetzt optimieren" : "SWOT mit KI optimieren"}
        </button>
      </div>
      {notesOpen && (
        <textarea
          className="eingabe mt-3"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional: Stichworte, Gesprächsnotizen oder Workshop-Ergebnisse, die die KI einarbeiten soll."
        />
      )}
      <p className="nebentext mt-2">
        Die KI macht einen Vorschlag — übernommen wird erst, was Sie bestätigen. Inhalte werden zur Verarbeitung an
        OpenAI übermittelt.
      </p>
      {error && <p className="mt-2 text-[13px] font-bold text-csp-rot">{error}</p>}

      {proposal && (
        <div className="mt-4 rounded-2xl ring-2 ring-inset ring-csp-ink">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-csp-linie p-4">
            <p className="kicker">Vorschlag der KI · {source}</p>
            <div className="flex gap-2">
              <button type="button" className="btn-primaer py-1.5 text-[13px]" onClick={applyAll}>
                Alle übernehmen
              </button>
              <button type="button" className="btn-sekundaer py-1.5 text-[13px]" onClick={() => setProposal(null)}>
                Verwerfen
              </button>
            </div>
          </div>
          {proposal.hinweis && <p className="nebentext px-4 pt-3">{proposal.hinweis}</p>}
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {keys.map((k) => (
              <div key={k}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="label mb-0">
                    {SWOT_FIELDS[k].label} ({SWOT_FIELDS[k].letter})
                  </span>
                  <button
                    type="button"
                    className="text-[12.5px] font-bold text-csp-grau underline-offset-2 hover:text-csp-ink hover:underline"
                    onClick={() => onApply({ [k]: proposal[k] })}
                  >
                    übernehmen
                  </button>
                </div>
                <p className="whitespace-pre-wrap rounded-xl bg-csp-sand/50 p-3 text-[13.5px] font-semibold leading-relaxed">
                  {proposal[k] || "–"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
