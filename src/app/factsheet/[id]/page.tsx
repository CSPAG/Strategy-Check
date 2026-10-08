import { getSession } from "@/lib/session";
import { IconArrowLeft } from "@/components/icons";
import { canViewAssessment } from "@/lib/assessment-access";
import { prisma } from "@/lib/prisma";
import { auditOnce } from "@/lib/audit";
import { FactsheetView } from "@/components/FactsheetView";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { FactsheetPrint } from "@/components/FactsheetPrint";

export default async function FactsheetPage({
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

  if (!canViewAssessment(session.user, assessment)) redirect("/");
  await auditOnce(session.user, "VIEW", `${assessment.team.name} · ${assessment.period.label}`, "Factsheet");

  return (
    <>
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-csp-grau hover:text-csp-ink">
          <IconArrowLeft /> Übersicht
        </Link>
        <PrintButton />
      </div>
      <div className="nur-bildschirm">
        <FactsheetView assessment={assessment} />
      </div>
      <FactsheetPrint assessment={assessment} />
    </>
  );
}
