import { getSession } from "@/lib/session";
import { IconArrowRight } from "@/components/icons";
import { canEditAnyAssessment, canAccessDashboard } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatTeamCategory } from "@/lib/constants";
import { buildTeamColors, teamShapeClass } from "@/lib/team-colors";
import { PageTitle, StatusPill } from "@/components/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPeriodScope } from "@/lib/period-scope";

export default async function HomePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const scope = await getPeriodScope();
  const periods = scope.visible;

  if (periods.length === 0) {
    return <p className="nebentext">Keine aktive Periode konfiguriert.</p>;
  }

  const canEdit = canEditAnyAssessment(session.user.role);
  const canDash = canAccessDashboard(session.user.role);
  const assessments = await prisma.assessment.findMany({
    where: {
      periodId: { in: periods.map((p) => p.id) },
    },
    include: { team: true, period: true },
    orderBy: [{ period: { createdAt: "asc" } }, { team: { name: "asc" } }],
  });

  const colors = buildTeamColors(
    (await prisma.team.findMany()).map((t) => ({ ...t, category: formatTeamCategory(t.category) }))
  );
  const byPeriod = periods.map((period) => ({
    period,
    items: assessments.filter((a) => a.periodId === period.id),
  }));

  return (
    <div>
      <PageTitle kicker="CSPstrategie 2026+" title="Strategie-Check." sub="Jedes Halbjahr, jedes Team.">
        {scope.selected && !scope.selected.isActive ? (
          <>
            Rückblick auf die abgeschlossene Periode {scope.selected.label}. Zurück zur aktuellen Periode über den
            Umschalter oben.
          </>
        ) : (
          <>
            Selbsteinschätzung zur CSPstrategie 2026+. Auszufüllen für{" "}
            {periods.map((p) => p.label).join(" und ")}
            {periods.some((p) => p.name === "H1-2026") ? " (H1 2026 retrospektiv)" : ""}.
          </>
        )}
        {canDash && (
          <span className="mt-6 block">
            <Link href="/dashboard" className="btn-primaer">
              Zum Dashboard <IconArrowRight />
            </Link>
          </span>
        )}
      </PageTitle>

      <div className="grid gap-12 lg:grid-cols-2">
        {byPeriod.map(({ period, items }) => {
          const done = items.filter((a) => a.status === "SUBMITTED").length;
          return (
            <section key={period.id}>
              <div className="flex items-baseline justify-between gap-4 border-b border-csp-ink pb-3">
                <h2 className="zwischentitel">
                  {period.label}.
                  {period.name === "H1-2026" && period.isActive && (
                    <span className="text-csp-grau-titel"> Retrospektiv.</span>
                  )}
                  {!period.isActive && <span className="text-csp-grau-titel"> Abgeschlossen.</span>}
                </h2>
                <span className="text-[13px] font-bold tabular-nums text-csp-grau">
                  {done} / {items.length} eingereicht
                </span>
              </div>
              <ul className="divide-y divide-csp-linie">
                {items.map((a) => {
                  const category = formatTeamCategory(a.team.category);
                  return (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`inline-block h-[9px] w-[9px] shrink-0 ${teamShapeClass(category)}`}
                          style={{ background: colors[a.team.id] }}
                          title={category}
                        />
                        <span className="truncate text-[15px] font-extrabold">{a.team.name}</span>
                        <StatusPill status={a.status} />
                      </div>
                      <div className="flex gap-1.5">
                        <Link href={`/assessment/${a.id}`} className="btn-primaer px-4 py-1.5 text-[13px]">
                          {!canEdit || !period.isActive ? "Ansehen" : a.status === "SUBMITTED" ? "Aktualisieren" : "Bearbeiten"}
                        </Link>
                        <Link href={`/factsheet/${a.id}`} className="btn-sekundaer px-4 py-1.5 text-[13px]">
                          Factsheet
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
