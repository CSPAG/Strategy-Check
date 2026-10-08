"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PeriodRow = {
  id: string;
  label: string;
  isActive: boolean;
  total: number;
  submitted: number;
};

/** Perioden verwalten: neue Periode starten, bestehende abschliessen oder wieder öffnen. */
export function PeriodManager({ periods, suggestion }: { periods: PeriodRow[]; suggestion: { half: 1 | 2; year: number } }) {
  const router = useRouter();
  const [half, setHalf] = useState<1 | 2>(suggestion.half);
  const [year, setYear] = useState(suggestion.year);
  const [closePrevious, setClosePrevious] = useState(true);
  const [carryOver, setCarryOver] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const label = `H${half} ${year}`;
  const exists = periods.some((p) => p.label === label);

  const start = async () => {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/admin/periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ half, year, closePrevious, carryOver }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setConfirming(false);
    if (!res.ok) {
      setMessage(json.error ?? "Die Periode konnte nicht angelegt werden.");
      return;
    }
    setMessage(`${json.label} ist gestartet. Alle Teams haben einen neuen Entwurf.`);
    router.refresh();
  };

  const toggle = async (p: PeriodRow) => {
    const res = await fetch(`/api/admin/periods/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (res.ok) router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[22px] bg-white p-5 sm:p-6">
        <p className="label">Neue Periode starten</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="inline-flex rounded-full bg-csp-sand/70 p-1">
            {([1, 2] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHalf(h)}
                className={`rounded-full px-4 py-1.5 text-[13.5px] font-bold ${
                  half === h ? "bg-csp-ink text-white" : "text-csp-grau hover:text-csp-ink"
                }`}
              >
                H{h}
              </button>
            ))}
          </div>
          <input
            type="number"
            className="eingabe w-28 py-2"
            value={year}
            min={2024}
            max={2100}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Jahr"
          />
          <span className="pb-2 text-[22px] font-extrabold tracking-[-0.03em]">{label}</span>
        </div>

        <div className="mt-5 space-y-2.5">
          <label className="flex cursor-pointer items-start gap-3 text-[14px] font-semibold">
            <input
              type="checkbox"
              checked={closePrevious}
              onChange={(e) => setClosePrevious(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-csp-ink"
            />
            <span>
              <span className="font-extrabold">Bisherige Perioden abschliessen.</span>{" "}
              <span className="text-csp-grau">
                Sie bleiben über den Umschalter oben einsehbar und im Dashboard auswertbar, sind aber nur noch für Admins
                bearbeitbar. Massnahmen-Status lässt sich weiterhin nachführen.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-[14px] font-semibold">
            <input
              type="checkbox"
              checked={carryOver}
              onChange={(e) => setCarryOver(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-csp-ink"
            />
            <span>
              <span className="font-extrabold">Letzte Abgabe als Ausgangspunkt übernehmen.</span>{" "}
              <span className="text-csp-grau">
                Ziel-Auswahl übernommen, Zielerreichung und Reifegrad starten bei der damaligen Prognose. SWOT und offene
                Massnahmen übernehmen die Teams selbst per Button; die Vorperiode bleibt in der Erfassung grau sichtbar.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!confirming ? (
            <button type="button" className="btn-primaer" disabled={exists || busy} onClick={() => setConfirming(true)}>
              {exists ? `${label} gibt es bereits` : `${label} starten`}
            </button>
          ) : (
            <>
              <span className="text-[14px] font-bold">
                {label} für alle {periods[0]?.total ?? ""} Teams anlegen
                {closePrevious ? " und bisherige Perioden abschliessen" : ""}?
              </span>
              <button type="button" className="btn-primaer" disabled={busy} onClick={start}>
                {busy ? "Wird angelegt…" : "Ja, starten"}
              </button>
              <button type="button" className="btn-sekundaer" onClick={() => setConfirming(false)}>
                Abbrechen
              </button>
            </>
          )}
        </div>
        {message && <p className="mt-3 text-[13.5px] font-bold text-csp-grau">{message}</p>}
      </div>

      <div className="overflow-x-auto rounded-[22px] bg-white p-5">
        <p className="label">Alle Perioden</p>
        <table className="w-full min-w-[520px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-csp-ink text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-csp-grau">
              <th className="py-2 pr-3">Periode</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Eingereicht</th>
              <th className="py-2 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-csp-linie font-semibold">
            {[...periods].reverse().map((p) => (
              <tr key={p.id}>
                <td className="py-2.5 pr-3 font-extrabold">{p.label}</td>
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-block h-[7px] w-[7px] rounded-full ${p.isActive ? "bg-csp-gruen" : "bg-csp-grau-titel"}`} />
                    {p.isActive ? "Offen" : "Abgeschlossen"}
                  </span>
                </td>
                <td className="py-2.5 pr-3 tabular-nums">
                  {p.submitted} / {p.total}
                </td>
                <td className="py-2.5 text-right">
                  <button type="button" className="btn-sekundaer py-1 text-[12.5px]" onClick={() => toggle(p)}>
                    {p.isActive ? "Abschliessen" : "Wieder öffnen"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
