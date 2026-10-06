import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { MEASURE_STATUS } from "@/lib/measures";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["OFFEN", "IN_ARBEIT", "ERLEDIGT", "VERWORFEN"]),
});

/** Status einer Massnahme nachführen — auch nach dem Einreichen (Überprüfbarkeit). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser("edit");
  if (error) return error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });

  const { id } = await params;
  const measure = await prisma.measure.update({
    where: { id },
    data: { status: parsed.data.status },
    include: { assessment: { include: { team: true, period: true } } },
  });
  await audit(
    user,
    "MEASURE",
    `${measure.assessment.team.name} · ${measure.assessment.period.label}`,
    `«${measure.title}» → ${MEASURE_STATUS[parsed.data.status]}`
  );
  return NextResponse.json({ id: measure.id, status: measure.status });
}
