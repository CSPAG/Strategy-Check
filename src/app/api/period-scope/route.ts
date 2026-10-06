import { requireUser } from "@/lib/api-guard";
import { PERIOD_COOKIE } from "@/lib/period-scope";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Merkt sich die im Header gewählte Periode (null = aktuelle Perioden). */
export async function POST(req: Request) {
  const { error } = await requireUser("view");
  if (error) return error;
  const parsed = z.object({ periodId: z.string().nullable() }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  if (parsed.data.periodId) {
    res.cookies.set(PERIOD_COOKIE, parsed.data.periodId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 180 });
  } else {
    res.cookies.delete(PERIOD_COOKIE);
  }
  return res;
}
