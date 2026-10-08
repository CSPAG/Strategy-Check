"use client";

import { GoalProgress, type GoalRow } from "@/components/charts/GoalProgress";
import { IconChevronRight } from "@/components/icons";
import { PositioningMatrix } from "@/components/charts/PositioningMatrix";
import { teamShapeClass } from "@/lib/team-colors";
import { SWOT_FIELDS, getStrategicGoalFullLabel, getStrategicGoalShortLabel } from "@/lib/constants";
import { MEASURE_STATUS, type MeasureStatus } from "@/lib/measure-labels";
import { forecastChecks, type TeamTrend } from "@/lib/dashboard-data";

/** Ein Circle / eine Unit: Matrix mit Entwicklung und Zielerreichung der aktuellsten Periode. */
export function TeamCard({ team }: { team: TeamTrend }) {
  const current = team.snapshots.at(-1)!;
  const earlier = team.snapshots.slice(0, -1);
  const checks = forecastChecks(team).filter((c) => c.toPeriod === current.period);

  const rows: GoalRow[] = current.goals.map((g) => {
    const check = checks.find((c) => c.goalId === g.id);
    return {
      key: String(g.id),
      title: getStrategicGoalShortLabel(g.id),
      fullTitle: getStrategicGoalFullLabel(g.id),
      period: current.period,
      today: g.today,
      outlook: g.outlook,
      previous: earlier.flatMap((s) => {
        const prev = s.goals.find((x) => x.id === g.id);
        return prev ? [{ period: s.period, value: prev.today }] : [];
      }),
      check: check ? { fromPeriod: check.fromPeriod, forecast: check.forecast } : undefined,
    };
  });

  return (
    <article className="rounded-[24px] bg-white p-5 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="zwischentitel flex items-center gap-2.5">
          <span className={`inline-block h-[12px] w-[12px] ${teamShapeClass(team.category)}`} style={{ background: team.color }} />
          {team.name}
        </h3>
        <p className="text-[12.5px] font-bold text-csp-grau">
          {team.category} · Stand {current.period}
          {earlier.length > 0 && ` · Vergleich ${earlier.map((s) => s.period).join(", ")}`}
        </p>
      </header>

      <div className="mt-5 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <p className="label mb-2">Reifegrad</p>
          <PositioningMatrix
            points={[
              {
                id: team.id,
                label: `${team.name} · ${current.period}`,
                x: current.markt,
                y: current.intern,
                color: team.color,
                shape: team.category === "Unit" ? "square" : "circle",
                trail: earlier.map((s) => ({ x: s.markt, y: s.intern, period: s.period })),
              },
            ]}
          />
          <p className="mt-1 text-center text-[12.5px] font-bold tabular-nums text-csp-grau">
            Intern {current.intern} · Markt {current.markt}
          </p>
        </div>
        <div className="min-w-0">
          <p className="label mb-2">Strategische Ziele</p>
          {rows.length === 0 ? (
            <p className="nebentext">Keine strategischen Ziele ausgewählt.</p>
          ) : (
            <GoalProgress rows={rows} />
          )}
        </div>
      </div>

      <details className="group mt-5 border-t border-csp-linie pt-4">
        <summary className="cursor-pointer list-none text-[13.5px] font-extrabold text-csp-grau hover:text-csp-ink">
          <IconChevronRight size={14} className="mr-1 inline-block align-[-2px] transition group-open:rotate-90" />
          Abgabe {current.period}: SWOT und {current.measures.length} Massnahmen
          {current.measures.length > 0 &&
            ` · ${current.measures.filter((m) => m.status === "ERLEDIGT").length} erledigt`}
        </summary>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(SWOT_FIELDS) as (keyof typeof SWOT_FIELDS)[]).map((k) => (
            <div key={k}>
              <p className="label mb-1">{SWOT_FIELDS[k].label}</p>
              <p className="whitespace-pre-wrap text-[13px] font-semibold leading-relaxed text-csp-text">
                {current.swot[k] || "–"}
              </p>
            </div>
          ))}
        </div>
        {current.measures.length > 0 && (
          <div className="mt-5">
            <p className="label mb-1">Massnahmen</p>
            <ul className="space-y-1 text-[13px] font-semibold">
              {current.measures.map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <span
                    className={`mt-[6px] inline-block h-[7px] w-[7px] shrink-0 rounded-full ${
                      m.status === "ERLEDIGT" ? "bg-csp-gruen" : m.status === "IN_ARBEIT" ? "bg-csp-gelb" : "bg-csp-linie"
                    }`}
                  />
                  <span>
                    <span className="font-extrabold">{m.title}</span>
                    <span className="text-csp-grau">
                      {" "}
                      · {MEASURE_STATUS[m.status as MeasureStatus]}
                      {m.dueDate ? ` · bis ${new Date(m.dueDate).toLocaleDateString("de-CH")}` : ""}
                      {m.owner ? ` · ${m.owner}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>
    </article>
  );
}
