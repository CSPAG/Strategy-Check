import { getSession } from "@/lib/session";
import { IconArrowLeft } from "@/components/icons";
import {
  canEditAssessment,
  canViewAssessment,
  isAssessmentReadOnly,
} from "@/lib/assessment-access";
import { prisma } from "@/lib/prisma";
import { auditOnce } from "@/lib/audit";
import { AssessmentForm } from "@/components/AssessmentForm";
import { PageTitle, StatusPill } from "@/components/ui";
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

  await auditOnce(session.user, "VIEW", `${assessment.team.name} · ${assessment.period.label}`, "Selbsteinschätzung");
  const readOnly = isAssessmentReadOnly(session.user, assessment);
  const canEdit = canEditAssessment(session.user, assessment);

  return (
    <>
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-csp-grau hover:text-csp-ink">
          <IconArrowLeft /> Übersicht
        </Link>
        <Link href={`/factsheet/${assessment.id}`} className="btn-sekundaer">
          Factsheet anzeigen
        </Link>
      </div>
      <PageTitle
        kicker={
          <span className="flex flex-wrap items-center gap-3">
            Selbsteinschätzung · {formatTeamCategory(assessment.team.category)}
            <StatusPill status={assessment.status} />
          </span>
        }
        title={`${assessment.team.name}.`}
        sub={`${assessment.period.label}.`}
      >
        {!readOnly && assessment.status === "SUBMITTED" && (
          <span>
            Bereits eingereicht. Änderungen gelten erst mit «Aktualisierung einreichen».
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
