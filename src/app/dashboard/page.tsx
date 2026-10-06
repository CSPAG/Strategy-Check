import { getSession } from "@/lib/session";
import { canAccessDashboard, canEditAnyAssessment } from "@/lib/auth";
import { formatTeamCategory } from "@/lib/constants";
import { buildTeamColors } from "@/lib/team-colors";
import { getStoredInsight } from "@/lib/insights";
import { isAiEnabled } from "@/lib/ai";
import { QualitativeInsights } from "@/components/dashboard/QualitativeInsights";
import { MeasuresOverview } from "@/components/dashboard/MeasuresOverview";
import { prisma } from "@/lib/prisma";
import { auditOnce } from "@/lib/audit";
import { getPeriodScope, labelsUntil } from "@/lib/period-scope";
import { redirect } from "next/navigation";
import { buildTeamTrends } from "@/lib/dashboard-data";
import { sortPeriodLabels } from "@/lib/period-labels";
import { PageTitle, Section } from "@/components/ui";
import { CspOverview } from "@/components/dashboard/CspOverview";
import { TeamCard } from "@/components/dashboard/TeamCard";
import { GoalLegend } from "@/components/charts/GoalProgress";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!canAccessDashboard(session.user.role)) redirect("/");
  await auditOnce(session.user, "VIEW", "Dashboard");

  const scope = await getPeriodScope();
  const inScope = labelsUntil(scope);
  const assessments = await prisma.assessment.findMany({
    where: { period: { label: { in: [...inScope] } } },
    include: { team: true, period: true, measureItems: { orderBy: { sort: "asc" } } },
    orderBy: [{ period: { createdAt: "asc" } }, { team: { name: "asc" } }],
  });

  const submitted = assessments.filter((a) => a.status === "SUBMITTED");
  const allTeams = await prisma.team.findMany();
  const colors = buildTeamColors(allTeams.map((t) => ({ ...t, category: formatTeamCategory(t.category) })));
  const teams = buildTeamTrends(submitted).map((t) => ({ ...t, color: colors[t.id] ?? t.color }));
  const submittedPeriods = sortPeriodLabels(submitted.map((a) => a.period.label));
  const insights = Object.fromEntries(
    await Promise.all(submittedPeriods.map(async (p) => [p, await getStoredInsight(p)] as const))
  );
  const canEdit = canEditAnyAssessment(session.user.role);
  const periods = sortPeriodLabels(assessments.map((a) => a.period.label));
  const progress = periods.map((p) => ({
    period: p,
    total: assessments.filter((a) => a.period.label === p).length,
    done: submitted.filter((a) => a.period.label === p).length,
  }));

  return (
    <div className="space-y-8">
      <PageTitle
        kicker={scope.selected ? `CSPstrategie 2026+ · Stand ${scope.selected.label}` : "CSPstrategie 2026+"}
        title="Dashboard."
        sub={scope.selected && !scope.selected.isActive ? `Rückblick ${scope.selected.label}.` : "Wo CSP heute steht."}
      >
        Oben die CSP-Sicht über alle Circles und Units, dann die qualitative Auswertung und die Massnahmen,
        zuletzt jedes Team einzeln. Es zählen nur
        eingereichte Selbsteinschätzungen — Entwürfe erscheinen erst nach dem Einreichen.
      </PageTitle>

      <div className="flex flex-wrap gap-x-10 gap-y-4">
        {progress.map((p) => (
          <div key={p.period}>
            <p className="text-[34px] font-extrabold leading-none tracking-titel tabular-nums">
              {p.done}
              <span className="text-csp-grau-titel"> / {p.total}</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-[13px] font-bold text-csp-grau">
              <span className="inline-block h-[7px] w-[7px] rounded-full bg-csp-gruen" />
              eingereicht {p.period}
            </p>
          </div>
        ))}
      </div>

      <Section nr="01" title="CSP-Sicht." sub="Alle Teams auf einen Blick.">
        <CspOverview teams={teams} />
      </Section>

      <Section
        nr="02"
        title="Qualitative Auswertung."
        sub="Was die Teams nennen."
        intro="Die KI bündelt die SWOT-Nennungen und Massnahmen aller eingereichten Abgaben zu Themen. Die Zahl zeigt, wie viele Teams ein Thema nennen; Mouse-over zeigt die Originalformulierungen."
      >
        <QualitativeInsights
          teams={teams}
          periods={submittedPeriods}
          initial={insights}
          canRefresh={canEdit}
          aiEnabled={isAiEnabled()}
        />
      </Section>

      <Section
        nr="03"
        title="Massnahmen."
        sub="Wer macht was bis wann."
        intro="Alle Massnahmen pro Circle und Unit. Überprüfbar ist eine Massnahme mit Erfolgskriterium, Verantwortung und Termin. Der Status lässt sich hier direkt nachführen — auch nach dem Einreichen."
      >
        <MeasuresOverview teams={teams} canEdit={canEdit} />
      </Section>

      <Section
        nr="04"
        title="Pro Circle und Unit."
        sub="Entwicklung und Prognose-Check."
        intro="Pro Ziel: Ist heute und Prognose in sechs Monaten. Liegt eine Folgeperiode vor, wird die damalige Prognose dem neuen Ist gegenübergestellt."
      >
        {teams.length === 0 ? (
          <p className="nebentext">Noch keine eingereichten Halbjahresdaten vorhanden.</p>
        ) : (
          <>
            <div className="space-y-5">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
            <GoalLegend />
          </>
        )}
      </Section>
    </div>
  );
}
