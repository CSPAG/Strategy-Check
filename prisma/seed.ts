import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEAMS = [
  { name: "CIR Pulse", category: "Circle", teamType: "Circle" },
  { name: "CIR NRJ", category: "Circle", teamType: "Circle" },
  { name: "CIR Cyber Security", category: "Circle", teamType: "Circle" },
  { name: "CIR Beschaffung", category: "Circle", teamType: "Circle" },
  { name: "CIR STRAGOV", category: "Circle", teamType: "Circle" },
  { name: "CIR OE", category: "Circle", teamType: "Circle" },
  { name: "CIR AIDA", category: "Circle", teamType: "Circle" },
  { name: "CIR SiJu", category: "Circle", teamType: "Circle" },
  { name: "CIR Social Impact", category: "Circle", teamType: "Circle" },
  { name: "CIR APEX", category: "Circle", teamType: "Circle" },
  { name: "Unit GL", category: "Unit", teamType: "Unit" },
  { name: "Unit MA-Einsatz", category: "Unit", teamType: "Unit" },
  { name: "Unit Innovation & Services", category: "Unit", teamType: "Unit" },
  { name: "Unit Quality & Excellence", category: "Unit", teamType: "Unit" },
  { name: "Unit Ziele & Allignment", category: "Unit", teamType: "Unit" },
  { name: "Unit People & Culture", category: "Unit", teamType: "Unit" },
  { name: "Unit Akquise", category: "Unit", teamType: "Unit" },
  { name: "Unit Marketing & Kommunikation", category: "Unit", teamType: "Unit" },
  { name: "Unit Simap", category: "Unit", teamType: "Unit" },
];

const PERIODS = [
  { name: "H1-2026", label: "H1 2026", isActive: true },
  { name: "H2-2026", label: "H2 2026", isActive: true },
];

const EMPTY_ASSESSMENT = {
  status: "DRAFT",
  summary: "",
  strengths: "",
  gaps: "",
  opportunities: "",
  risks: "",
  measures: "",
  strategicGoalMaturity: "{}",
  maturityNotes: "",
  matrixNotes: "",
  matrixXToday: 3,
  matrixYToday: 3,
  matrixXOutlook: 3,
  matrixYOutlook: 3,
  maturityToday: 2,
  maturityOutlook: 2,
  strategicGoals: "[]",
  submittedAt: null,
  updatedBy: null,
};

async function main() {
  for (const team of TEAMS) {
    await prisma.team.upsert({
      where: { name: team.name },
      update: { category: team.category, teamType: team.teamType },
      create: team,
    });
  }

  for (const period of PERIODS) {
    await prisma.period.upsert({
      where: { name: period.name },
      // Status (offen/abgeschlossen) wird im Admin-Bereich verwaltet und beim Deploy nicht überschrieben.
      update: { label: period.label },
      create: period,
    });
  }

  const teams = await prisma.team.findMany();
  const periods = await prisma.period.findMany({
    where: { name: { in: PERIODS.map((p) => p.name) } },
  });

  for (const period of periods) {
    for (const team of teams) {
      await prisma.assessment.upsert({
        where: {
          teamId_periodId: { teamId: team.id, periodId: period.id },
        },
        update: {
          teamType: team.teamType,
        },
        create: {
          teamId: team.id,
          periodId: period.id,
          teamType: team.teamType,
          ...EMPTY_ASSESSMENT,
        },
      });
    }
  }

  console.log(
    `Seeded ${teams.length} teams, periods ${PERIODS.map((p) => p.label).join(" / ")}, assessments ensured`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
