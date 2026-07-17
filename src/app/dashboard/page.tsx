import { getSession } from "@/lib/session";
import { isGlRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getStrategicMaturityRows } from "@/lib/assessment-mapper";
import { formatTeamCategory, getStrategicGoalShortLabel, getStrategicGoalFullLabel, parseStrategicGoals } from "@/lib/constants";
import { parseStrategicGoalMaturity } from "@/lib/strategic-maturity";
import { getOutlookPeriodLabel, sortPeriodLabels } from "@/lib/period-labels";
import { CSP_CYAN, CSP_CYAN_LIGHT } from "@/lib/brand";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!isGlRole(session.user.role)) redirect("/");

  const assessments = await prisma.assessment.findMany({
    where: { status: "SUBMITTED" },
    include: { team: true, period: true },
    orderBy: [{ period: { createdAt: "asc" } }, { team: { name: "asc" } }],
  });

  const trendsByTeam = new Map<
    string,
    {
      teamName: string;
      category: string;
      maturityByPeriod: Record<string, { intern: number; markt: number }>;
      goalsByPeriod: Record<string, { id: number; value: number }[]>;
      submittedPeriods: Set<string>;
    }
  >();

  for (const a of assessments) {
    const category = formatTeamCategory(a.team.category);
    if (category !== "Circle" && category !== "Unit") continue;
    const row = getStrategicMaturityRows(a);
    const checkedGoalIds = parseStrategicGoals(a.strategicGoals);
    const maturity = parseStrategicGoalMaturity(a.strategicGoalMaturity ?? "{}");
    const entry = trendsByTeam.get(a.teamId) ?? {
      teamName: a.team.name,
      category,
      maturityByPeriod: {},
      goalsByPeriod: {},
      submittedPeriods: new Set<string>(),
    };
    entry.submittedPeriods.add(a.period.label);
    entry.maturityByPeriod[a.period.label] = {
      intern: a.matrixYToday,
      markt: a.matrixXToday,
    };
    entry.goalsByPeriod[a.period.label] = checkedGoalIds.map((id) => ({
      id,
      value: maturity[String(id)]?.today ?? row.goals.find((g) => g.id === id)?.today ?? 2,
    }));

    const outlookLabel = getOutlookPeriodLabel(a.period.label);
    if (!entry.submittedPeriods.has(outlookLabel)) {
      entry.goalsByPeriod[outlookLabel] = checkedGoalIds.map((id) => ({
        id,
        value: maturity[String(id)]?.outlook ?? row.goals.find((g) => g.id === id)?.outlook ?? 2,
      }));
    }

    trendsByTeam.set(a.teamId, entry);
  }

  const teamTrends = Array.from(trendsByTeam.values()).sort((a, b) =>
    a.teamName.localeCompare(b.teamName)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-csp-navy">Dashboard</h1>
        <p className="text-gray-600">
          Entwicklung der strategischen Ziele sowie von Intern und Markt (Positionierung) pro Halbjahr.
        </p>
      </div>

      <section>
        {teamTrends.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine eingereichten Halbjahresdaten vorhanden.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {teamTrends.map((team) => (
              <div key={team.teamName} className="rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-csp-navy">
                  {team.teamName} <span className="text-xs text-gray-500">({team.category})</span>
                </h3>
                <div className="mt-3 space-y-3">
                  <GoalTrendChart
                    title="Strategische Ziele"
                    periods={sortPeriodLabels(Object.keys(team.goalsByPeriod))}
                    goalsByPeriod={team.goalsByPeriod}
                  />
                  <MaturityTrendChart
                    title="Reifegrad (Positionierung)"
                    periods={sortPeriodLabels(Object.keys(team.maturityByPeriod))}
                    byPeriod={team.maturityByPeriod}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MaturityTrendChart({
  title,
  periods,
  byPeriod,
}: {
  title: string;
  periods: string[];
  byPeriod: Record<string, { intern: number; markt: number }>;
}) {
  const series = [
    { key: "intern" as const, label: "Intern (Y)", color: CSP_CYAN },
    { key: "markt" as const, label: "Markt (X)", color: CSP_CYAN_LIGHT },
  ];
  const width = 420;
  const height = 190;
  const padLeft = 46;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const min = 1;
  const max = 10;
  const yTicks = [2, 4, 6, 8, 10];

  if (periods.length === 0) return null;

  const toX = (idx: number) =>
    padLeft + (periods.length === 1 ? plotW / 2 : (idx / (periods.length - 1)) * plotW);
  const toY = (v: number) =>
    padTop + plotH - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * plotH;

  return (
    <div>
      <p className="text-xs font-medium text-gray-700">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 h-auto w-full">
        <rect
          x={padLeft}
          y={padTop}
          width={plotW}
          height={plotH}
          fill="#f8fafc"
          stroke="#e2e8f0"
        />
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padLeft}
              y1={toY(v)}
              x2={padLeft + plotW}
              y2={toY(v)}
              stroke="#e2e8f0"
              strokeDasharray="3"
            />
            <text
              x={padLeft - 8}
              y={toY(v) + 3}
              textAnchor="end"
              className="fill-gray-500 text-[10px]"
            >
              {v}
            </text>
          </g>
        ))}
        {series.map((s) => {
          const pts = periods
            .map((period, idx) => {
              const values = byPeriod[period];
              if (!values) return null;
              return {
                x: toX(idx),
                y: toY(values[s.key]),
                value: values[s.key],
              };
            })
            .filter((p): p is { x: number; y: number; value: number } => p !== null);
          if (pts.length === 0) return null;
          return (
            <g key={s.key}>
              {pts.length > 1 && (
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                />
              )}
              {pts.map((p, i) => (
                <g key={`${s.key}-${i}`}>
                  <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={s.color} strokeWidth="2" />
                  <text
                    x={p.x}
                    y={p.y - 9}
                    textAnchor="middle"
                    className="fill-gray-700 text-[9px] font-medium"
                  >
                    {p.value}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
        {periods.map((period, idx) => (
          <text
            key={period}
            x={toX(idx)}
            y={height - 8}
            textAnchor="middle"
            className="fill-gray-500 text-[10px]"
          >
            {period}
          </text>
        ))}
        <text
          x={10}
          y={padTop + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${padTop + plotH / 2})`}
          className="fill-gray-600 text-[10px]"
        >
          Bewertung
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalTrendChart({
  title,
  periods,
  goalsByPeriod,
}: {
  title: string;
  periods: string[];
  goalsByPeriod: Record<string, { id: number; value: number }[]>;
}) {
  const palette = [CSP_CYAN, CSP_CYAN_LIGHT, "#0077A8", "#66C4F0", "#005F8F", "#99D7F5"];
  const goalIds = Array.from(
    new Set(
      Object.values(goalsByPeriod).flatMap((goals) => goals.map((g) => g.id))
    )
  ).sort((a, b) => a - b);
  const width = 420;
  const height = 200;
  const padLeft = 46;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const min = 1;
  const max = 5;

  if (periods.length === 0 || goalIds.length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-700">{title}</p>
        <p className="mt-1 text-xs text-gray-500">Keine strategischen Ziele über die Zeit ausgewählt.</p>
      </div>
    );
  }

  const toX = (idx: number) =>
    padLeft + (periods.length === 1 ? plotW / 2 : (idx / (periods.length - 1)) * plotW);
  const xJitter = (goalIndex: number) => {
    if (periods.length !== 1 || goalIds.length <= 1) return 0;
    const spread = Math.min(plotW * 0.55, goalIds.length * 16);
    return (goalIndex - (goalIds.length - 1) / 2) * (spread / (goalIds.length - 1));
  };
  const toY = (v: number) =>
    padTop + plotH - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * plotH;

  return (
    <div>
      <p className="text-xs font-medium text-gray-700">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-1 h-auto w-full">
        <rect
          x={padLeft}
          y={padTop}
          width={plotW}
          height={plotH}
          fill="#f8fafc"
          stroke="#e2e8f0"
        />
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line
              x1={padLeft}
              y1={toY(v)}
              x2={padLeft + plotW}
              y2={toY(v)}
              stroke="#e2e8f0"
              strokeDasharray="3"
            />
            <text
              x={padLeft - 8}
              y={toY(v) + 3}
              textAnchor="end"
              className="fill-gray-500 text-[10px]"
            >
              {v}
            </text>
          </g>
        ))}
        {goalIds.map((goalId, gi) => {
          const pts = periods
            .map((period, idx) => {
              const found = (goalsByPeriod[period] ?? []).find((g) => g.id === goalId);
              if (!found) return null;
              return {
                x: toX(idx) + (periods.length === 1 ? xJitter(gi) : 0),
                y: toY(found.value),
                value: found.value,
              };
            })
            .filter((p): p is { x: number; y: number; value: number } => p !== null);
          if (pts.length === 0) return null;
          const color = palette[gi % palette.length];
          return (
            <g key={goalId}>
              {pts.length > 1 && (
                <polyline
                  fill="none"
                  stroke={color}
                  strokeWidth="2.2"
                  points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                />
              )}
              {pts.map((p, i) => (
                <g key={`${goalId}-${i}`}>
                  <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={color} strokeWidth="2" />
                  <text
                    x={p.x}
                    y={p.y - 9}
                    textAnchor="middle"
                    className="fill-gray-700 text-[9px] font-medium"
                  >
                    {p.value}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
        {periods.map((period, idx) => (
          <text
            key={period}
            x={toX(idx)}
            y={height - 8}
            textAnchor="middle"
            className="fill-gray-500 text-[10px]"
          >
            {period}
          </text>
        ))}
        <text
          x={10}
          y={padTop + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${padTop + plotH / 2})`}
          className="fill-gray-600 text-[10px]"
        >
          Zielerreichung
        </text>
      </svg>
      <div className="mt-2 space-y-1.5">
        {goalIds.map((goalId, gi) => (
          <div
            key={goalId}
            className="flex items-start gap-2 text-[10px] leading-snug text-gray-600"
          >
            <span
              className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: palette[gi % palette.length] }}
            />
            <span title={getStrategicGoalFullLabel(goalId)}>
              {getStrategicGoalShortLabel(goalId)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
