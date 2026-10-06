"use client";

import type { TeamTrend } from "@/lib/dashboard-data";
import { MEASURE_AREA, MEASURE_STATUS, measureGaps, type MeasureStatus } from "@/lib/measure-labels";
import { teamShapeClass } from "@/lib/team-colors";
import { useMemo, useState } from "react";

type Row = {
  id: string;
  team: TeamTrend;
  period: string;
  area: string;
  title: string;
  indicator: string;
  owner: string;
  dueDate: string | null;
  status: MeasureStatus;
  freeText?: boolean;
};

const STATUS_DOT: Record<MeasureStatus, string> = {
  OFFEN: "bg-csp-linie",
  IN_ARBEIT: "bg-csp-gelb",
  ERLEDIGT: "bg-csp-gruen",
  VERWORFEN: "bg-csp-grau-titel",
};

/** Alle Massnahmen pro Circle / Unit mit Überprüfbarkeit, Termin und Status (Status direkt nachführbar). */
export function MeasuresOverview({ teams, canEdit }: { teams: TeamTrend[]; canEdit: boolean }) {
  const periods = useMemo(
    () => Array.from(new Set(teams.flatMap((t) => t.snapshots.map((s) => s.period)))),
    [teams]
  );
  const [period, setPeriod] = useState<string>("Alle");
  const [onlyAction, setOnlyAction] = useState(false);
  const [statusOverride, setStatusOverride] = useState<Record<string, MeasureStatus>>({});
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const rows: Row[] = teams.flatMap((team) =>
    team.snapshots
      .filter((s) => period === "Alle" || s.period === period)
      .flatMap((s) => [
        ...s.measures.map((m) => ({
          ...m,
          team,
          period: s.period,
          status: (statusOverride[m.id] ?? m.status) as MeasureStatus,
        })),
        ...(s.measures.length === 0 && s.measuresText
          ? [
              {
                id: `${s.assessmentId}-text`,
                team,
                period: s.period,
                area: "SWOT",
                title: s.measuresText,
                indicator: "",
                owner: "",
                dueDate: null,
                status: "OFFEN" as MeasureStatus,
                freeText: true,
              },
            ]
          : []),
      ])
  );

  const isOverdue = (r: Row) => !!r.dueDate && r.dueDate.slice(0, 10) < today && r.status !== "ERLEDIGT" && r.status !== "VERWORFEN";
  const needsAction = (r: Row) => isOverdue(r) || measureGaps(r).length > 0;
  const visible = onlyAction ? rows.filter(needsAction) : rows;

  const counts = {
    total: rows.length,
    done: rows.filter((r) => r.status === "ERLEDIGT").length,
    overdue: rows.filter(isOverdue).length,
    unverifiable: rows.filter((r) => measureGaps(r).length > 0).length,
  };

  const setStatus = async (id: string, status: MeasureStatus) => {
    const before = statusOverride[id];
    setStatusOverride({ ...statusOverride, [id]: status });
    setError("");
    const res = await fetch(`/api/measures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setStatusOverride((s) => ({ ...s, [id]: before }));
      setError("Status konnte nicht gespeichert werden.");
    }
  };

  const grouped = teams
    .map((t) => ({ team: t, items: visible.filter((r) => r.team.id === t.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Kpi wert={counts.total} was="Massnahmen" dot="bg-csp-ink" />
        <Kpi wert={counts.done} was="erledigt" dot="bg-csp-gruen" />
        <Kpi wert={counts.overdue} was="überfällig" dot="bg-csp-rot" />
        <Kpi wert={counts.unverifiable} was="nicht überprüfbar" dot="bg-csp-gelb" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-inset ring-csp-linie">
          {["Alle", ...periods].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${
                p === period ? "bg-csp-ink text-white" : "text-csp-grau hover:text-csp-ink"
              }`}
            >
              {p === "Alle" ? "Alle Perioden" : p}
            </button>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-bold text-csp-grau">
          <input type="checkbox" checked={onlyAction} onChange={(e) => setOnlyAction(e.target.checked)} className="h-4 w-4 accent-csp-ink" />
          Nur Handlungsbedarf (überfällig oder nicht überprüfbar)
        </label>
      </div>
      {error && <p className="text-[13px] font-bold text-csp-rot">{error}</p>}

      {grouped.length === 0 ? (
        <p className="nebentext">Keine Massnahmen für diese Auswahl.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ team, items }) => (
            <div key={team.id} className="overflow-x-auto rounded-[22px] bg-white p-5">
              <p className="mb-3 flex items-center gap-2 text-[16px] font-extrabold">
                <span className={`inline-block h-[11px] w-[11px] ${teamShapeClass(team.category)}`} style={{ background: team.color }} />
                {team.name}
                <span className="text-[12.5px] font-bold text-csp-grau">
                  · {items.filter((i) => i.status === "ERLEDIGT").length} von {items.length} erledigt
                </span>
              </p>
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-csp-ink text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-csp-grau">
                    <th className="py-2 pr-3">Massnahme</th>
                    <th className="py-2 pr-3">Erfolgskriterium</th>
                    <th className="py-2 pr-3">Verantwortung</th>
                    <th className="py-2 pr-3">Termin</th>
                    <th className="py-2 pr-3">Überprüfbar</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-csp-linie font-semibold">
                  {items.map((r) => {
                    const gaps = measureGaps(r);
                    const overdue = isOverdue(r);
                    return (
                      <tr key={r.id} className="align-top">
                        <td className="max-w-[320px] py-2.5 pr-3">
                          <span className={`font-extrabold ${r.freeText ? "whitespace-pre-wrap font-semibold" : ""}`}>{r.title}</span>
                          <span className="block text-[11.5px] font-bold text-csp-grau">
                            {r.period} · {r.freeText ? "Freitext" : MEASURE_AREA[r.area as keyof typeof MEASURE_AREA]}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">{r.indicator || "–"}</td>
                        <td className="py-2.5 pr-3">{r.owner || "–"}</td>
                        <td className="whitespace-nowrap py-2.5 pr-3">
                          {r.dueDate ? new Date(r.dueDate).toLocaleDateString("de-CH") : "–"}
                          {overdue && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-[11.5px] font-extrabold">
                              <span className="inline-block h-[7px] w-[7px] rounded-full bg-csp-rot" /> überfällig
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="inline-flex items-start gap-1.5" title={gaps.length ? `Fehlt: ${gaps.join(", ")}` : undefined}>
                            <span className={`mt-[5px] inline-block h-[7px] w-[7px] shrink-0 rounded-full ${gaps.length ? "bg-csp-gelb" : "bg-csp-gruen"}`} />
                            {gaps.length ? `fehlt: ${gaps.join(", ")}` : "ja"}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {canEdit && !r.freeText ? (
                            <select
                              value={r.status}
                              onChange={(e) => setStatus(r.id, e.target.value as MeasureStatus)}
                              className="rounded-full bg-csp-sand/70 px-3 py-1 text-[12.5px] font-bold focus:outline-none focus:ring-2 focus:ring-csp-ink"
                            >
                              {Object.entries(MEASURE_STATUS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`inline-block h-[7px] w-[7px] rounded-full ${STATUS_DOT[r.status]}`} />
                              {MEASURE_STATUS[r.status]}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ wert, was, dot }: { wert: number; was: string; dot: string }) {
  return (
    <div>
      <p className="text-[34px] font-extrabold leading-none tracking-titel tabular-nums">{wert}</p>
      <p className="mt-1 flex items-center gap-2 text-[13px] font-bold text-csp-grau">
        <span className={`inline-block h-[7px] w-[7px] rounded-full ${dot}`} />
        {was}
      </p>
    </div>
  );
}
