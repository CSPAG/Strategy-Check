import { requireUser } from "@/lib/api-guard";
import { audit } from "@/lib/audit";
import { isFixedAdmin, normalizeEmail } from "@/lib/admins";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ email: z.string().email().max(200) });

/** Admin ernennen (auch für Personen, die sich noch nie angemeldet haben). */
export async function POST(req: Request) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  if (isFixedAdmin(email)) return NextResponse.json({ ok: true });
  await prisma.adminGrant.upsert({
    where: { email },
    create: { email, grantedBy: user.email ?? null },
    update: {},
  });
  await audit(user, "ADMIN", email, "Zum Admin ernannt");
  return NextResponse.json({ ok: true });
}

/** Admin-Recht entziehen (feste Admins und sich selbst ausgenommen). */
export async function DELETE(req: Request) {
  const { user, error } = await requireUser("admin");
  if (error) return error;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  if (isFixedAdmin(email)) {
    return NextResponse.json({ error: "Feste Admins können nicht entfernt werden." }, { status: 400 });
  }
  if (email === normalizeEmail(user.email)) {
    return NextResponse.json({ error: "Das eigene Admin-Recht kann man nicht selbst entziehen." }, { status: 400 });
  }
  await prisma.adminGrant.deleteMany({ where: { email } });
  await audit(user, "ADMIN", email, "Admin-Recht entzogen");
  return NextResponse.json({ ok: true });
}
