import { getSession } from "@/lib/session";
import { isGlRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FactsheetView } from "@/components/FactsheetView";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";

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
    include: { team: true, period: true },
  });

  if (!assessment) notFound();

  const canView =
    isGlRole(session.user.role) || assessment.teamId === session.user.teamId;
  if (!canView) redirect("/");

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-csp-cyan hover:underline">
          ← Zurück
        </Link>
        <PrintButton />
      </div>
      <FactsheetView assessment={assessment} />
    </>
  );
}
