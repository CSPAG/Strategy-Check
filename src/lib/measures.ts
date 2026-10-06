import { prisma } from "@/lib/prisma";
import { z } from "zod";

export { MEASURE_STATUS, MEASURE_AREA, measureGaps } from "@/lib/measure-labels";
export type { MeasureStatus } from "@/lib/measure-labels";

export const measureInputSchema = z.object({
  id: z.string().optional(),
  area: z.enum(["SWOT", "REIFEGRAD"]),
  title: z.string().trim().min(1).max(500),
  indicator: z.string().max(500).default(""),
  owner: z.string().max(200).default(""),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["OFFEN", "IN_ARBEIT", "ERLEDIGT", "VERWORFEN"]).default("OFFEN"),
});
export type MeasureInput = z.infer<typeof measureInputSchema>;

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Gleicht die Massnahmen eines Assessments mit der Liste aus dem Formular ab (IDs bleiben erhalten). */
export async function syncMeasures(assessmentId: string, items: MeasureInput[]): Promise<void> {
  const existing = await prisma.measure.findMany({ where: { assessmentId }, select: { id: true } });
  const keep = new Set(items.map((i) => i.id).filter(Boolean));
  await prisma.$transaction([
    prisma.measure.deleteMany({
      where: { assessmentId, id: { in: existing.map((e) => e.id).filter((id) => !keep.has(id)) } },
    }),
    ...items.map((item, sort) => {
      const data = {
        area: item.area,
        title: item.title,
        indicator: item.indicator,
        owner: item.owner,
        dueDate: toDate(item.dueDate),
        status: item.status,
        sort,
      };
      return item.id && existing.some((e) => e.id === item.id)
        ? prisma.measure.update({ where: { id: item.id }, data })
        : prisma.measure.create({ data: { ...data, assessmentId } });
    }),
  ]);
}
