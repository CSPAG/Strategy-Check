import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Kontaktadresse(n) eines Teams für Erinnerungen setzen. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const parsed = z.object({ contactEmail: z.string().max(500) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const { id } = await params;
  const team = await prisma.team.update({ where: { id }, data: { contactEmail: parsed.data.contactEmail.trim() } });
  await audit(user, "ADMIN", team.name, `Kontakt gesetzt: ${team.contactEmail || "–"}`);
  return NextResponse.json({ id: team.id, contactEmail: team.contactEmail });
}
