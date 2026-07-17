import { getSession } from "@/lib/session";
import { canEditAssessment } from "@/lib/assessment-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const assessmentSchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED"]).optional(),
  summary: z.string().optional(),
  strengths: z.string().optional(),
  gaps: z.string().optional(),
  opportunities: z.string().optional(),
  risks: z.string().optional(),
  measures: z.string().optional(),
  matrixXToday: z.number().min(1).max(10).optional(),
  matrixYToday: z.number().min(1).max(10).optional(),
  maturityNotes: z.string().optional(),
  matrixNotes: z.string().optional(),
  strategicGoals: z.string().optional(),
  strategicGoalMaturity: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { team: true, period: true },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(assessment);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { team: true },
  });

  if (!assessment) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  if (!canEditAssessment(session.user, assessment)) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = assessmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const updated = await prisma.assessment.update({
    where: { id },
    data: {
      ...data,
      submittedAt:
        data.status === "SUBMITTED" ? new Date() : assessment.submittedAt,
      updatedBy: session.user.email ?? undefined,
    },
    include: { team: true, period: true },
  });

  return NextResponse.json(updated);
}
