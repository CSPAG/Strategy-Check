import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
// Beispielwerte für die lokale Vorschau (nicht echt), u. a. die Fälle aus dem Feedback (Cyber Security, Social Impact).
const data: Record<string, Record<string, { g: Record<number, [number, number]>; i: number; m: number }>> = {
  "CIR Cyber Security": { "H1 2026": { g: { 1: [2, 2], 3: [2, 3], 4: [4, 4], 8: [3, 2] }, i: 1, m: 1 }, "H2 2026": { g: { 1: [2, 3], 3: [2, 3], 4: [4, 4], 8: [2, 3] }, i: 2, m: 1 } },
  "CIR Social Impact": { "H1 2026": { g: { 1: [2, 3], 4: [4, 4], 5: [2, 3], 10: [4, 4] }, i: 6, m: 4 }, "H2 2026": { g: { 1: [3, 3], 4: [4, 5], 5: [2, 3], 10: [3, 4] }, i: 6, m: 5 } },
  "CIR AIDA": { "H1 2026": { g: { 2: [3, 4], 8: [3, 4], 9: [2, 3] }, i: 7, m: 6 }, "H2 2026": { g: { 2: [4, 4], 8: [4, 5], 9: [2, 3] }, i: 7, m: 7 } },
  "CIR NRJ": { "H1 2026": { g: { 4: [3, 3], 10: [3, 4] }, i: 5, m: 7 } },
  "CIR Pulse": { "H1 2026": { g: { 1: [3, 4], 7: [2, 3] }, i: 4, m: 3 }, "H2 2026": { g: { 1: [4, 4], 7: [2, 2] }, i: 5, m: 3 } },
  "CIR OE": { "H2 2026": { g: { 7: [3, 4], 4: [3, 3] }, i: 4, m: 3 } },
  "Unit People & Culture": { "H2 2026": { g: { 1: [3, 4], 3: [2, 3] }, i: 6, m: 4 } },
};
// Beispiel-SWOTs mit überlappenden Themen, damit die qualitative Auswertung etwas zu bündeln hat.
const SWOT: Record<string, { s: string; w: string; o: string; t: string }> = {
  "CIR Cyber Security": { s: "– Zertifizierte Security-Spezialisten\n– Erfahrung mit ISO 27001 in Gemeinden", w: "– Zu wenig Kapazität für Akquise\n– Kaum Marketing-Material", o: "– Neue Regulierung (nDSG, NIS2) erhöht Nachfrage\n– Gemeinden brauchen Unterstützung bei Informationssicherheit", t: "– Fachkräftemangel im Security-Bereich\n– Grosse Anbieter mit Tiefpreisen" },
  "CIR Social Impact": { s: "– Tiefes Verständnis sozialer Institutionen\n– Gutes Netzwerk zu Verbänden", w: "– Abhängigkeit von zwei Schlüsselpersonen\n– Wenig Akquise-Zeit", o: "– Soziale Institutionen digitalisieren\n– Fördergelder für Digitalisierung", t: "– Knappe Budgets der Kundschaft\n– Fachkräftemangel" },
  "CIR AIDA": { s: "– Starke KI- und Datenkompetenz\n– Moderne Entwicklungsmethoden", w: "– Junge Marke, wenig Referenzen\n– Abhängigkeit von Schlüsselpersonen", o: "– Hohe Nachfrage nach KI-Anwendungen\n– Verwaltung will Prozesse automatisieren", t: "– Schnelle Technologiewechsel\n– Preisdruck durch Offshore-Anbieter" },
};

async function main() {
  for (const [team, periods] of Object.entries(data)) for (const [label, v] of Object.entries(periods)) {
    const a = await prisma.assessment.findFirstOrThrow({ where: { team: { name: team }, period: { label } } });
    const ids = Object.keys(v.g).map(Number);
    await prisma.assessment.update({ where: { id: a.id }, data: {
      status: "SUBMITTED", submittedAt: new Date(), matrixYToday: v.i, matrixXToday: v.m,
      matrixYOutlook: Math.min(10, v.i + 1), matrixXOutlook: Math.min(10, v.m + (v.m % 2)), matrixOutlookSet: label === "H2 2026",
      strategicGoals: JSON.stringify(ids),
      strategicGoalMaturity: JSON.stringify(Object.fromEntries(ids.map((id) => [id, { today: v.g[id][0], outlook: v.g[id][1] }]))),
      strengths: SWOT[team]?.s ?? "– Hohe Fachkompetenz im Kernthema\n– Langjährige Kundenbeziehungen",
      gaps: SWOT[team]?.w ?? "– Wenig Kapazität für Akquise\n– Abhängigkeit von wenigen Schlüsselpersonen",
      opportunities: SWOT[team]?.o ?? "– Steigende Nachfrage nach KI-Unterstützung\n– Digitalisierungsdruck in der Verwaltung",
      risks: SWOT[team]?.t ?? "– Fachkräftemangel\n– Preisdruck bei Ausschreibungen",
      maturityNotes: "Beispiel-Erläuterung (Demo-Daten).",
    } });
    await prisma.measure.deleteMany({ where: { assessmentId: a.id } });
    await prisma.measure.createMany({ data: [
      { assessmentId: a.id, area: "SWOT", title: "Zwei Referenzprojekte gezielt akquirieren", indicator: "2 unterschriebene Aufträge", owner: "Circle-Lead", dueDate: new Date("2027-03-31"), status: label === "H1 2026" ? "IN_ARBEIT" : "OFFEN", sort: 0 },
      { assessmentId: a.id, area: "SWOT", title: "Wissen der Schlüsselpersonen dokumentieren", indicator: "", owner: "", dueDate: null, status: "OFFEN", sort: 1 },
      { assessmentId: a.id, area: "REIFEGRAD", title: "Rekrutierung einer Senior-Fachperson", indicator: "Stelle besetzt", owner: "Circle-Lead", dueDate: new Date("2027-06-30"), status: label === "H1 2026" ? "ERLEDIGT" : "OFFEN", sort: 2 },
    ] });
  }
}
main().finally(() => prisma.$disconnect());
