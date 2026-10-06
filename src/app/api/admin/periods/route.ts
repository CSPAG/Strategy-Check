import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { PERIOD_COOKIE, sortPeriods } from "@/lib/period-scope";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  half: z.union([z.literal(1), z.literal(2)]),
  year: z.number().int().min(2024).max(2100),
  closePrevious: z.boolean(),
  carryOver: z.boolean(),
});

/**
 * Neue Periode starten: legt die Periode und für jedes Team eine leere Selbsteinschätzung an.
 * Optional werden die bisherigen Perioden abgeschlossen (nur noch Admins können dort bearbeiten)
 * und Ziel-Auswahl, SWOT und Reifegrad aus der letzten Abgabe als Entwurf übernommen.
 */
export async function POST(req: Request) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });
  const { half, year, closePrevious, carryOver } = parsed.data;

  const name = `H${half}-${year}`;
  const label = `H${half} ${year}`;
  if (await prisma.period.findUnique({ where: { name } })) {
    return NextResponse.json({ error: `Die Periode ${label} gibt es bereits.` }, { status: 409 });
  }

  const previous = sortPeriods(await prisma.period.findMany()).at(-1);
  const teams = await prisma.team.findMany();

  const period = await prisma.$transaction(async (tx) => {
    if (closePrevious) await tx.period.updateMany({ data: { isActive: false } });
    const created = await tx.period.create({ data: { name, label, isActive: true } });

    for (const team of teams) {
      const source =
        carryOver && previous
          ? await tx.assessment.findUnique({ where: { teamId_periodId: { teamId: team.id, periodId: previous.id } } })
          : null;
      await tx.assessment.create({
        data: {
          teamId: team.id,
          periodId: created.id,
          teamType: team.teamType,
          status: "DRAFT",
          ...(source
            ? {
                strategicGoals: source.strategicGoals,
                strengths: source.strengths,
                gaps: source.gaps,
                opportunities: source.opportunities,
                risks: source.risks,
                matrixXToday: source.matrixXToday,
                matrixYToday: source.matrixYToday,
              }
            : {}),
        },
      });
    }
    return created;
  });

  await audit(
    user,
    "ADMIN",
    label,
    `Neue Periode gestartet${closePrevious ? ", bisherige abgeschlossen" : ""}${
      carryOver && previous ? `, Entwürfe aus ${previous.label} übernommen` : ""
    }`
  );

  // Alle sehen nach dem Start die neue Periode («Aktuell»).
  const res = NextResponse.json({ id: period.id, label: period.label });
  res.cookies.delete(PERIOD_COOKIE);
  return res;
}
