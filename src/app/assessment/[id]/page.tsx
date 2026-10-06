import { getSession } from "@/lib/session";
import {
  canEditAssessment,
  canViewAssessment,
  isAssessmentReadOnly,
} from "@/lib/assessment-access";
import { prisma } from "@/lib/prisma";
import { AssessmentForm } from "@/components/AssessmentForm";
import { PageTitle } from "@/components/ui";
import { isAiEnabled } from "@/lib/ai";
import { formatTeamCategory } from "@/lib/constants";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { team: true, period: true, measureItems: { orderBy: { sort: "asc" } } },
  });

  if (!assessment) notFound();

  if (!canViewAssessment(session.user, assessment)) {
    redirect("/");
  }

  const readOnly = isAssessmentReadOnly(session.user, assessment);
  const canEdit = canEditAssessment(session.user, assessment);

  return (
    <>
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-[14px] font-bold text-csp-grau hover:text-csp-ink">
          ← Übersicht
        </Link>
        <Link href={`/factsheet/${assessment.id}`} className="btn-sekundaer">
          Factsheet anzeigen
        </Link>
      </div>
      <PageTitle
        kicker={<>Selbsteinschätzung · {formatTeamCategory(assessment.team.category)}</>}
        title={`${assessment.team.name}.`}
        sub={`${assessment.period.label}.`}
      >
        {readOnly && canEdit && assessment.period.isActive && assessment.status === "SUBMITTED" && (
          <span className="flex items-center gap-2">
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-csp-blau" />
            Eingereicht — nur Admins können weiter bearbeiten.
          </span>
        )}
        {readOnly && canEdit && !assessment.period.isActive && (
          <span className="flex items-center gap-2">
            <span className="inline-block h-[7px] w-[7px] rounded-full bg-csp-grau-titel" />
            Periode abgeschlossen — nur Admins können noch bearbeiten.
          </span>
        )}
        {readOnly && !canEdit && <span>Nur Lesen (Viewer).</span>}
      </PageTitle>
      <AssessmentForm assessment={assessment} readOnly={readOnly} aiEnabled={isAiEnabled()} />
    </>
  );
}
