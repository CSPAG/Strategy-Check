import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { PERIOD_COOKIE } from "@/lib/period-scope";
import { prisma } from "@/lib/prisma";
import { findPreviousSource } from "@/lib/previous-assessment";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseStrategicGoalMaturity, serializeStrategicGoalMaturity } from "@/lib/strategic-maturity";

/** Zielerreichung der neuen Periode startet bei der damaligen Prognose (heute = Prognose = alte Prognose). */
function forecastAsStart(raw: string) {
  const m = parseStrategicGoalMaturity(raw ?? "{}");
  return serializeStrategicGoalMaturity(
    Object.fromEntries(Object.entries(m).map(([id, v]) => [id, { today: v.outlook, outlook: v.outlook }]))
  );
}

const schema = z.object({
  half: z.union([z.literal(1), z.literal(2)]),
  year: z.number().int().min(2024).max(2100),
  closePrevious: z.boolean(),
  carryOver: z.boolean(),
});

/**
 * Neue Periode starten: legt die Periode und für jedes Team eine leere Selbsteinschätzung an.
 * Optional werden die bisherigen Perioden abgeschlossen (nur noch Admins können dort bearbeiten)
 * und Ziel-Auswahl sowie die damalige Prognose (Ziele, Reifegrad) als Startwerte übernommen.
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

  const teams = await prisma.team.findMany();

  // Quelle je Team: letzte eingereichte Abgabe (sonst jüngster Entwurf) vor der neuen Periode
  const sources = new Map(
    await Promise.all(teams.map(async (t) => [t.id, await findPreviousSource(t.id, label)] as const))
  );

  const period = await prisma.$transaction(async (tx) => {
    if (closePrevious) await tx.period.updateMany({ data: { isActive: false } });
    const created = await tx.period.create({ data: { name, label, isActive: true } });

    for (const team of teams) {
      const source = carryOver ? sources.get(team.id) ?? null : null;
      await tx.assessment.create({
        data: {
          teamId: team.id,
          periodId: created.id,
          teamType: team.teamType,
          status: "DRAFT",
          ...(source
            ? {
                // Startwerte = damalige Prognose; SWOT und Massnahmen übernimmt das Team per Button
                strategicGoals: source.strategicGoals,
                strategicGoalMaturity: forecastAsStart(source.strategicGoalMaturity),
                matrixXToday: source.matrixOutlookSet ? source.matrixXOutlook : source.matrixXToday,
                matrixYToday: source.matrixOutlookSet ? source.matrixYOutlook : source.matrixYToday,
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
      carryOver ? ", Ziele und Prognosen der letzten Abgaben als Start übernommen" : ""
    }`
  );

  // Alle sehen nach dem Start die neue Periode («Aktuell»).
  const res = NextResponse.json({ id: period.id, label: period.label });
  res.cookies.delete(PERIOD_COOKIE);
  return res;
}
