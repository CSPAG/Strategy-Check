import { getSession } from "@/lib/session";
import { IconArrowLeft } from "@/components/icons";
import { canViewAssessment } from "@/lib/assessment-access";
import { prisma } from "@/lib/prisma";
import { auditOnce } from "@/lib/audit";
import { FactsheetView } from "@/components/FactsheetView";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { FactsheetPrint, factsheetDocumentName } from "@/components/FactsheetPrint";
import type { Metadata } from "next";
import { SummaryWaiter } from "@/components/factsheet/SummaryWaiter";
import { loadFactsheetContext } from "@/lib/factsheet-context";
import { isAiEnabled } from "@/lib/ai";
import { canEditAnyAssessment } from "@/lib/keycloak-roles";

/** Seitentitel = Dokumentname, damit «Als PDF speichern» den richtigen Dateinamen vorschlägt. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = await prisma.assessment.findUnique({ where: { id }, select: { team: { select: { name: true } } } });
  return { title: a ? factsheetDocumentName(a.team.name) : "Factsheet Strategie-Check" };
}

export default async function FactsheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nach?: string }>;
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
  const context = await loadFactsheetContext(assessment);
  const canGenerate = isAiEnabled() && canEditAnyAssessment(session.user.role);
  // Direkt nach dem Einreichen warten, bis die KI-Auswertung fertig ist (sie läuft im Hintergrund).
  const waiting =
    (await searchParams).nach === "einreichen" &&
    isAiEnabled() &&
    assessment.status === "SUBMITTED" &&
    !(context.summary && !context.summary.stale);

  return (
    <SummaryWaiter assessmentId={assessment.id} waiting={waiting}>
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[14px] font-bold text-csp-grau hover:text-csp-ink">
          <IconArrowLeft /> Übersicht
        </Link>
        <PrintButton />
      </div>
      <div className="nur-bildschirm">
        <FactsheetView assessment={assessment} context={context} canGenerate={canGenerate} />
      </div>
      <FactsheetPrint assessment={assessment} context={context} />
    </SummaryWaiter>
  );
}
