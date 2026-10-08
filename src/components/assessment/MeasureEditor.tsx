"use client";

import { AiBadge, callAi } from "@/components/assessment/ai-client";
import { IconClose } from "@/components/icons";
import { MEASURE_STATUS, measureGaps, type MeasureStatus } from "@/lib/measure-labels";
import { useState } from "react";

export type MeasureDraft = {
  key: string;
  id?: string;
  area: "SWOT" | "REIFEGRAD";
  title: string;
  indicator: string;
  owner: string;
  dueDate: string; // yyyy-mm-dd oder ""
  status: MeasureStatus;
};

type Suggestion = { title: string; indicator: string; dueInMonths: number; begruendung: string };

export function newMeasureKey() {
  return Math.random().toString(36).slice(2);
}

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.min(24, Math.max(1, months)));
  return d.toISOString().slice(0, 10);
}

/** Liste überprüfbarer Massnahmen: Was, woran gemessen, wer, bis wann, Status. */
export function MeasureEditor({
  area,
  measures,
  onChange,
  disabled,
  aiEnabled,
  requestSuggestions,
}: {
  area: "SWOT" | "REIFEGRAD";
  measures: MeasureDraft[];
  onChange: (next: MeasureDraft[]) => void;
  disabled?: boolean;
  aiEnabled: boolean;
  requestSuggestions: (existing: string[]) => Promise<{ measures: Suggestion[] }>;
}) {
  const own = measures.filter((m) => m.area === area);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<(Suggestion & { pick: boolean })[] | null>(null);

  const patch = (key: string, p: Partial<MeasureDraft>) =>
    onChange(measures.map((m) => (m.key === key ? { ...m, ...p } : m)));
  const remove = (key: string) => onChange(measures.filter((m) => m.key !== key));
  const add = (items: Omit<MeasureDraft, "key" | "area">[]) =>
    onChange([...measures, ...items.map((i) => ({ ...i, key: newMeasureKey(), area }))]);

  const suggest = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await requestSuggestions(own.map((m) => m.title));
      setSuggestions(res.measures.map((s) => ({ ...s, pick: true })));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {own.length === 0 && <p className="nebentext mb-3">Noch keine Massnahmen erfasst.</p>}
      <ul className="space-y-3">
        {own.map((m, i) => {
          const gaps = measureGaps({ ...m, dueDate: m.dueDate || null });
          return (
            <li key={m.key} className="rounded-[20px] bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="pt-2.5 text-[13px] font-extrabold text-csp-grau-titel">{String(i + 1).padStart(2, "0")}</span>
                <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
                  <input
                    className="eingabe py-2 font-extrabold md:col-span-2"
                    value={m.title}
                    disabled={disabled}
                    placeholder="Massnahme, z. B. «Zwei Referenzprojekte im Markt Justiz akquirieren»"
                    onChange={(e) => patch(m.key, { title: e.target.value })}
                  />
                  <input
                    className="eingabe py-2 text-[14px]"
                    value={m.indicator}
                    disabled={disabled}
                    placeholder="Erfolgskriterium: woran überprüfen wir es?"
                    onChange={(e) => patch(m.key, { indicator: e.target.value })}
                  />
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
                    <input
                      className="eingabe py-2 text-[14px]"
                      value={m.owner}
                      disabled={disabled}
                      placeholder="Verantwortung"
                      onChange={(e) => patch(m.key, { owner: e.target.value })}
                    />
                    <input
                      type="date"
                      className="eingabe py-2 text-[14px]"
                      value={m.dueDate}
                      disabled={disabled}
                      onChange={(e) => patch(m.key, { dueDate: e.target.value })}
                      aria-label="Termin"
                    />
                    <select
                      className="eingabe py-2 text-[14px]"
                      value={m.status}
                      disabled={disabled}
                      onChange={(e) => patch(m.key, { status: e.target.value as MeasureStatus })}
                      aria-label="Status"
                    >
                      {Object.entries(MEASURE_STATUS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(m.key)}
                    className="rounded-full px-2 py-1.5 text-[18px] leading-none text-csp-grau-titel hover:bg-csp-sand hover:text-csp-ink"
                    aria-label="Massnahme entfernen"
                  >
                    <IconClose size={18} />
                  </button>
                )}
              </div>
              <p className="mt-2 flex items-center gap-1.5 pl-8 text-[12px] font-bold text-csp-grau">
                <span className={`inline-block h-[7px] w-[7px] rounded-full ${gaps.length ? "bg-csp-gelb" : "bg-csp-gruen"}`} />
                {gaps.length ? `Noch nicht überprüfbar: ${gaps.join(", ")} fehlt` : "Überprüfbar"}
              </p>
            </li>
          );
        })}
      </ul>

      {!disabled && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-sekundaer"
            onClick={() => add([{ title: "", indicator: "", owner: "", dueDate: "", status: "OFFEN" }])}
          >
            + Massnahme
          </button>
          {aiEnabled && (
            <button type="button" className="btn-sekundaer" disabled={busy} onClick={suggest}>
              <AiBadge />
              {busy ? "KI denkt nach…" : "Massnahmen vorschlagen"}
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-[13px] font-bold text-csp-rot">{error}</p>}

      {suggestions && (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-2 ring-inset ring-csp-ink">
          <p className="kicker mb-3">Vorschläge der KI · auswählen und übernehmen</p>
          <ul className="space-y-3">
            {suggestions.map((s, i) => (
              <li key={i}>
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={s.pick}
                    onChange={() => setSuggestions(suggestions.map((x, j) => (j === i ? { ...x, pick: !x.pick } : x)))}
                    className="mt-1 h-4 w-4 shrink-0 accent-csp-ink"
                  />
                  <span className="text-[14px] leading-snug">
                    <span className="font-extrabold">{s.title}</span>
                    <span className="block text-[13px] font-semibold text-csp-text">
                      Erfolgskriterium: {s.indicator} · in {s.dueInMonths} Monaten
                    </span>
                    <span className="block text-[12.5px] font-semibold text-csp-grau">{s.begruendung}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="btn-primaer py-1.5 text-[13px]"
              onClick={() => {
                add(
                  suggestions
                    .filter((s) => s.pick)
                    .map((s) => ({
                      title: s.title,
                      indicator: s.indicator,
                      owner: "",
                      dueDate: addMonths(s.dueInMonths),
                      status: "OFFEN" as const,
                    }))
                );
                setSuggestions(null);
              }}
            >
              Auswahl übernehmen
            </button>
            <button type="button" className="btn-sekundaer py-1.5 text-[13px]" onClick={() => setSuggestions(null)}>
              Verwerfen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
