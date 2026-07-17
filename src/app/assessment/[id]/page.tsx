import { getSession } from "@/lib/session";
import { canEditAssessment } from "@/lib/assessment-access";
import { isGlRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssessmentForm } from "@/components/AssessmentForm";
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
    include: { team: true, period: true },
  });

  if (!assessment) notFound();

  const canEdit = canEditAssessment(session.user, assessment);
  const readOnly =
    !canEdit || (assessment.status === "SUBMITTED" && !isGlRole(session.user.role));

  if (!canEdit && !isGlRole(session.user.role)) {
    redirect("/");
  }

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-csp-cyan hover:underline">
            ← Zurück
          </Link>
          <h1 className="text-2xl font-bold text-csp-navy">
            Selbsteinschätzung: {assessment.team.name}
          </h1>
          <p className="text-gray-600">{assessment.period.label}</p>
        </div>
        <Link
          href={`/factsheet/${assessment.id}`}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Factsheet anzeigen
        </Link>
      </div>
      <AssessmentForm assessment={assessment} readOnly={readOnly} />
    </>
  );
}
