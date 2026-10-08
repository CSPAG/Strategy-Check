"use client";

import { Hint } from "@/components/ui";
import { GoalLegend, GoalProgress, type GoalRow } from "@/components/charts/GoalProgress";
import { PositioningMatrix, type MatrixPoint } from "@/components/charts/PositioningMatrix";
import { teamShapeClass } from "@/lib/team-colors";
import { STRATEGIC_GOALS, getStrategicGoalFullLabel } from "@/lib/constants";
import { round1, type TeamTrend } from "@/lib/dashboard-data";
import { getOutlookPeriodLabel, sortPeriodLabels } from "@/lib/period-labels";
import { GoalTimeline, TimelineLegend } from "@/components/charts/GoalTimeline";
import { averageTimelineRows } from "@/lib/timeline";
import { useMemo, useState } from "react";

type Filter = "Alle" | "Circle" | "Unit";
type Mode = "verlauf" | "periode";

/** CSP-Sicht: alle eingereichten Teams einer Periode in einer Matrix und konsolidiert pro Ziel. */
export function CspOverview({ teams, defaultPeriod }: { teams: TeamTrend[]; defaultPeriod?: string }) {
  // Auswahl: alle Perioden mit Abgaben plus die aktuelle (auch wenn dort noch nichts eingereicht ist).
  const periods = useMemo(
    () =>
      sortPeriodLabels([...teams.flatMap((t) => t.snapshots.map((s) => s.period)), ...(defaultPeriod ? [defaultPeriod] : [])]),
    [teams, defaultPeriod]
  );
  // Einzelansicht startet auf der neusten Periode mit Daten (eine frisch gestartete Periode ist noch leer)
  const [period, setPeriod] = useState(() => {
    const withData = sortPeriodLabels(teams.flatMap((t) => t.snapshots.map((s) => s.period)));
    return defaultPeriod && withData.includes(defaultPeriod) ? defaultPeriod : withData.at(-1) ?? defaultPeriod ?? "";
  });
  const [filter, setFilter] = useState<Filter>("Circle");
  const [showTrail, setShowTrail] = useState(true);
  // Standard: Verlauf über alle Perioden inkl. Prognose; «Einzelne Periode» zeigt den bisherigen Schnitt.
  const [mode, setMode] = useState<Mode>("verlauf");
  const [showForecast, setShowForecast] = useState(true);
  const [hoverIds, setHoverIds] = useState<string[]>([]);
  const [listHover, setListHover] = useState<string | null>(null);

  const inFilter = teams.filter((t) => filter === "Alle" || t.category === filter);
  // Verlauf: jedes Team mit seiner letzten Abgabe; Einzelne Periode: nur Teams mit Abgabe in dieser Periode.
  const visible =
    mode === "verlauf"
      ? inFilter.filter((t) => t.snapshots.length > 0)
      : inFilter.filter((t) => t.snapshots.some((s) => s.period === period));
  const snapOf = (t: TeamTrend) =>
    mode === "verlauf" ? t.snapshots[t.snapshots.length - 1] : t.snapshots.find((s) => s.period === period)!;
  const dataPeriods = sortPeriodLabels(inFilter.flatMap((t) => t.snapshots.map((s) => s.period)));
  const lastDataPeriod = dataPeriods.at(-1) ?? period;
  const prevPeriod = periods[periods.indexOf(period) - 1];

  const points: MatrixPoint[] = visible.map((t) => {
    const idx = t.snapshots.indexOf(snapOf(t));
    const s = t.snapshots[idx];
    return {
      id: t.id,
      label: mode === "verlauf" ? `${t.name} · ${s.period}` : t.name,
      x: s.markt,
      y: s.intern,
      color: t.color,
      shape: t.category === "Unit" ? "square" : "circle",
      detail: t.category,
      trail: showTrail
        ? t.snapshots.slice(0, idx).map((p) => ({ x: p.markt, y: p.intern, period: p.period }))
        : undefined,
      forecast:
        showForecast && s.internOutlook !== null && s.marktOutlook !== null
          ? { x: s.marktOutlook, y: s.internOutlook }
          : undefined,
    };
  });

  const goalRows: GoalRow[] = STRATEGIC_GOALS.flatMap((g) => {
    const entries = visible
      .map((t) => ({ team: t, value: t.snapshots.find((s) => s.period === period)?.goals.find((x) => x.id === g.id) }))
      .filter((e): e is { team: TeamTrend; value: NonNullable<typeof e.value> } => !!e.value);
    if (entries.length === 0) return [];
    const avg = (ns: number[]) => round1(ns.reduce((a, b) => a + b, 0) / ns.length);
    const prevValues = prevPeriod
      ? visible
          .map((t) => t.snapshots.find((s) => s.period === prevPeriod)?.goals.find((x) => x.id === g.id)?.today)
          .filter((v): v is number => v !== undefined)
      : [];
    return [
      {
        key: String(g.id),
        title: `${g.id}. ${g.short}`,
        fullTitle: getStrategicGoalFullLabel(g.id),
        period,
        today: avg(entries.map((e) => e.value.today)),
        outlook: avg(entries.map((e) => e.value.outlook)),
        previous: prevValues.length ? [{ period: prevPeriod!, value: avg(prevValues) }] : [],
        breakdown: entries.map((e) => ({
          name: e.team.name,
          color: e.team.color,
          square: e.team.category === "Unit",
          today: e.value.today,
          outlook: e.value.outlook,
        })),
        meta: (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Ø von {entries.length} {entries.length === 1 ? "Team" : "Teams"}</span>
            {entries.map((e) => (
              <Hint key={e.team.id} content={`${e.team.name}: heute ${e.value.today} → Prognose ${e.value.outlook}`}>
                <span className="inline-flex cursor-default items-center gap-1">
                  <span
                    className={`inline-block h-[8px] w-[8px] ${teamShapeClass(e.team.category)}`}
                    style={{ background: e.team.color }}
                  />
                  {e.team.name.replace(/^(CIR|Unit) /, "")}
                </span>
              </Hint>
            ))}
          </span>
        ),
      },
    ];
  });

  if (periods.length === 0) {
    return <p className="nebentext">Noch keine eingereichten Selbsteinschätzungen.</p>;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          options={["verlauf", "periode"] as Mode[]}
          labels={{ verlauf: "Verlauf · alle Perioden", periode: "Einzelne Periode" }}
          value={mode}
          onChange={setMode}
        />
        {mode === "periode" && <Segmented options={periods} value={period} onChange={setPeriod} />}
        <Segmented
          options={["Circle", "Unit", "Alle"] as Filter[]}
          labels={{ Circle: "Circles", Unit: "Units", Alle: "Alle" }}
          value={filter}
          onChange={setFilter}
        />
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-bold text-csp-grau">
          <input
            type="checkbox"
            checked={showTrail}
            onChange={(e) => setShowTrail(e.target.checked)}
            className="h-4 w-4 accent-csp-ink"
          />
          Entwicklung aus Vorperioden
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-bold text-csp-grau">
          <input
            type="checkbox"
            checked={showForecast}
            onChange={(e) => setShowForecast(e.target.checked)}
            className="h-4 w-4 accent-csp-ink"
          />
          Prognose +6 Monate
        </label>
      </div>

      <div>
        <h3 className="label">
          Reifegrad-Matrix · {mode === "verlauf" ? `Verlauf ${dataPeriods[0] ?? ""} – ${lastDataPeriod}` : period}
        </h3>
        {visible.length === 0 ? (
          <p className="nebentext">Für diese Auswahl ist noch nichts eingereicht.</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <PositioningMatrix
              points={points}
              highlightId={listHover}
              onHover={(ids) => setHoverIds(ids ?? [])}
              className="max-w-[520px]"
            />
            <ul className="self-start text-[13.5px]">
              {visible.map((t) => {
                const s = snapOf(t);
                return (
                  <li
                    key={t.id}
                    onMouseEnter={() => setListHover(t.id)}
                    onMouseLeave={() => setListHover(null)}
                    className={`flex cursor-default items-center justify-between gap-3 rounded-xl px-3 py-1.5 font-bold ${
                      hoverIds.includes(t.id) || listHover === t.id ? "bg-white" : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`inline-block h-[10px] w-[10px] shrink-0 ${teamShapeClass(t.category)}`}
                        style={{ background: t.color }}
                      />
                      <span className="truncate">{t.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-csp-grau">
                      {mode === "verlauf" && s.period !== lastDataPeriod && (
                        <span className="text-csp-grau-titel">{s.period} · </span>
                      )}
                      Intern {s.intern} · Markt {s.markt}
                      {showForecast && s.internOutlook !== null && (
                        <span className="text-csp-ink">
                          {" "}
                          → {s.internOutlook} · {s.marktOutlook}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
              <li className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-3 text-[12px] text-csp-grau">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-[9px] w-[9px] rounded-full bg-csp-grau" /> Circle
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-[9px] w-[9px] rounded-[1px] bg-csp-grau" /> Unit
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-[9px] w-[9px] rounded-full border-2 border-csp-grau-titel" /> Vorperiode
                </span>
                <span>Zahl = mehrere Teams auf derselben Position</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {mode === "verlauf" && dataPeriods.length > 0 && (
        <div>
          <h3 className="label">
            Strategische Ziele · Verlauf, Durchschnitt{" "}
            {filter === "Alle" ? "aller Teams" : filter === "Unit" ? "der Units" : "der Circles"}
          </h3>
          <GoalTimeline
            periods={dataPeriods}
            outlookLabel={`Prognose ${getOutlookPeriodLabel(lastDataPeriod)}`}
            rows={averageTimelineRows(inFilter, dataPeriods)}
          />
          <TimelineLegend />
          <p className="nebentext mt-2">
            Pro Periode der Durchschnitt aller Teams (gemäss Auswahl oben), die das Ziel verfolgen. Mouse-over auf einen
            Punkt zeigt die Einzelwerte dieser Periode.
          </p>
        </div>
      )}

      {mode === "periode" && goalRows.length > 0 && (
        <div>
          <h3 className="label">
            Strategische Ziele · Durchschnitt {filter === "Alle" ? "aller Teams" : filter === "Unit" ? "der Units" : "der Circles"} ·{" "}
            {period}
          </h3>
          <GoalProgress rows={goalRows} />
          <GoalLegend />
          <p className="nebentext mt-2">Grundlage ist die Auswahl oben (Circles, Units oder alle). Gezählt werden nur Teams, die das Ziel in dieser Periode verfolgen. Mouse-over auf die Zeile zeigt alle Einzelwerte, auf den Zieltitel den vollen Wortlaut.</p>
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-inset ring-csp-linie">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition ${
            o === value ? "bg-csp-ink text-white" : "text-csp-grau hover:text-csp-ink"
          }`}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}
