"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Perioden-Umschalter im Header: «Aktuell» oder eine vergangene Periode ansehen. */
export function PeriodSwitcher({
  periods,
  selectedId,
  currentLabel,
}: {
  periods: { id: string; label: string; isActive: boolean }[];
  selectedId: string | null;
  currentLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const change = async (value: string) => {
    setBusy(true);
    await fetch("/api/period-scope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodId: value || null }),
    });
    router.refresh();
    setBusy(false);
  };

  const past = selectedId ? periods.find((p) => p.id === selectedId && !p.isActive) : undefined;

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Periode</span>
      <span
        className={`pointer-events-none absolute left-3 inline-block h-[7px] w-[7px] rounded-full ${
          past ? "bg-csp-gelb" : "bg-csp-gruen"
        }`}
      />
      <select
        value={selectedId ?? ""}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        className="appearance-none rounded-full bg-csp-sand/70 py-2 pl-7 pr-8 text-[13.5px] font-bold text-csp-ink hover:bg-csp-sand focus:outline-none focus:ring-2 focus:ring-csp-ink"
        title="Periode wählen"
      >
        <option value="">Aktuell · {currentLabel}</option>
        {[...periods].reverse().map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {p.isActive ? "" : " · abgeschlossen"}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-[11px] text-csp-grau">▾</span>
    </label>
  );
}
