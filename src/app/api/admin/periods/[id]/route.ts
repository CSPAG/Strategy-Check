import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Periode abschliessen (nur noch lesbar) oder wieder öffnen. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const parsed = z.object({ isActive: z.boolean() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const { id } = await params;
  const period = await prisma.period.update({ where: { id }, data: { isActive: parsed.data.isActive } });
  await audit(user, "ADMIN", period.label, parsed.data.isActive ? "Periode wieder geöffnet" : "Periode abgeschlossen");
  return NextResponse.json({ id: period.id, isActive: period.isActive });
}
