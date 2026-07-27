import { getSession } from "@/lib/session";
import { isGlRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatTeamCategory } from "@/lib/constants";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const periods = await prisma.period.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  if (periods.length === 0) {
    return <p>Keine aktive Periode konfiguriert.</p>;
  }

  const isGl = isGlRole(session.user.role);
  const assessments = await prisma.assessment.findMany({
    where: {
      periodId: { in: periods.map((p) => p.id) },
      ...(!isGl ? { teamId: session.user.teamId ?? "__unassigned__" } : {}),
    },
    include: { team: true, period: true },
    orderBy: [{ period: { createdAt: "asc" } }, { team: { name: "asc" } }],
  });

  const byPeriod = periods.map((period) => ({
    period,
    items: assessments.filter((a) => a.periodId === period.id),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-csp-navy">Übersicht</h1>
      <p className="mt-1 text-gray-600">
        Selbsteinschätzung zur CSP-Strategie 2026+ für den Strategie-Check. Der Strategie-Check
        ist für H1 2026 retrospektiv und für H2 2026 auszufüllen.
      </p>

      {!session.user.teamId && !isGl && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ihrem Benutzer ist noch kein Team zugewiesen. Bitte wenden Sie sich an die GL /
          IT, damit Ihr Konto einem Team zugeordnet wird.
        </p>
      )}

      <div className="mt-8 space-y-10">
        {byPeriod.map(({ period, items }) => (
          <section key={period.id}>
            <h2 className="text-lg font-semibold text-csp-navy">
              {period.label}
              {period.name === "H1-2026" && (
                <span className="ml-2 text-sm font-normal text-gray-500">(retrospektiv)</span>
              )}
            </h2>
            <ul className="mt-3 space-y-3">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm"
                >
                  <div>
                    <span className="font-semibold text-csp-navy">{a.team.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({formatTeamCategory(a.team.category)})
                    </span>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="flex gap-2">
                    {(isGl || a.teamId === session.user.teamId) && (
                      <Link
                        href={`/assessment/${a.id}`}
                        className="rounded-md bg-csp-cyan px-3 py-1.5 text-sm text-white hover:opacity-90"
                      >
                        {a.status === "SUBMITTED" ? "Ansehen" : "Bearbeiten"}
                      </Link>
                    )}
                    <Link
                      href={`/factsheet/${a.id}`}
                      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      Factsheet
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {isGl && (
        <p className="mt-6">
          <Link href="/dashboard" className="font-medium text-csp-cyan hover:underline">
            → Zum Dashboard (Entwicklung pro Halbjahr)
          </Link>
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const submitted = status === "SUBMITTED";
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
        submitted ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
      }`}
    >
      {submitted ? "Eingereicht" : "Entwurf"}
    </span>
  );
}
