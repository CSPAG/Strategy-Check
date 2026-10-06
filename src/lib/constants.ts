export const MATURITY_LEVELS = [
  { value: 1, label: "Initial", description: "Kaum strategische Verankerung, reaktiv" },
  { value: 2, label: "Bewusst", description: "Strategie bekannt, wenig systematische Umsetzung" },
  { value: 3, label: "Definiert", description: "Ziele an Strategie gekoppelt, wiederholbare Prozesse" },
  { value: 4, label: "Gesteuert", description: "Messung, Review, Verbesserung im Zyklus" },
  { value: 5, label: "Optimierend", description: "Wiederverwendbare Bausteine, Firmenlernkurve" },
] as const;

/** Skala Zielerreichung: 1 = nicht erreicht … 5 = erreicht, benannt nach dem Reifegradmodell. */
export const GOAL_SCALE_ENDS = { min: "nicht erreicht", max: "erreicht" } as const;

export const SWOT_FIELDS = {
  strengths: {
    label: "Stärken",
    letter: "S",
    hint: "Was können wir heute besser als andere? Kompetenzen, Referenzen, Kundenbeziehungen.",
  },
  gaps: {
    label: "Schwächen",
    letter: "W",
    hint: "Wo fehlt uns heute etwas? Know-how, Kapazität, Angebot, Sichtbarkeit.",
  },
  opportunities: {
    label: "Chancen",
    letter: "O",
    hint: "Welche Entwicklungen im Markt können wir nutzen? Nachfrage, Regulierung, Technologie.",
  },
  risks: {
    label: "Risiken",
    letter: "T",
    hint: "Was von aussen gefährdet uns? Konkurrenz, Preisdruck, Abhängigkeiten, Fachkräftemangel.",
  },
} as const;

export const SWOT_INTRO =
  "Die SWOT-Analyse beschreibt die Ausgangslage des Teams mit Blick auf die CSPstrategie 2026+. " +
  "Stärken und Schwächen schauen nach innen: was das Team heute kann – oder noch nicht. " +
  "Chancen und Risiken schauen nach aussen: Markt, Kundschaft, Konkurrenz, Technologie. " +
  "Drei bis fünf Stichworte pro Feld genügen; die Massnahmen leiten sich daraus ab.";

export const MATURITY_INTRO =
  "Intern: Einschätzung im Vergleich zu den anderen Circles bezüglich Kompetenzen der Personen, " +
  "Rekrutierungsfähigkeit, Akquisekompetenz und Substanz. Markt: Einschätzung im Vergleich zu den " +
  "direkten Konkurrenten bezüglich Marktattraktivität, Leistungsportfolio, Marktstellung und Marktanteilen. " +
  "Skala 1 (tief) bis 10 (hoch).";

export const STRATEGIC_GOALS = [
  {
    id: 1,
    short: "Arbeitgeberin & Bindung",
    label: "Attraktive Arbeitgeberin, hohe Mitarbeitenden-Happiness und Bindung (Retention >80%)",
  },
  {
    id: 2,
    short: "Innovationsumgebung",
    label: "Innovationsfreundliche Arbeitsumgebung mit starker Mitarbeitenden-Einbindung",
  },
  {
    id: 3,
    short: "Talentmanagement",
    label: "Umfassendes Talentmanagement für Gewinnung und Weiterentwicklung",
  },
  {
    id: 4,
    short: "Leistungsportfolio & Qualität",
    label: "Geschärftes Leistungsportfolio, Fokus strategische Märkte und Qualität",
  },
  {
    id: 5,
    short: "Markt Soziale Institutionen",
    label: "Aufbau strategischer Markt «Soziale Institutionen»",
  },
  { id: 6, short: "Markt Justiz", label: "Aufbau strategischer Markt «Justiz»" },
  {
    id: 7,
    short: "Beratung strategisch",
    label: "Ausbau Beratungs-Kompetenzen auf strategischer Ebene",
  },
  {
    id: 8,
    short: "KI & Digitalisierung",
    label: "Modernisierung Leistungserbringung durch KI und Digitalisierung",
  },
  {
    id: 9,
    short: "Neue Verrechnungsmodelle",
    label: "Neue Geschäfts- und Verrechnungsmodelle (weg von reinen Stunden)",
  },
  {
    id: 10,
    short: "Wachstum & EBIT-Marge",
    label: "Umsatzwachstum min. 10% und EBIT-Marge 8–10% pro Jahr",
  },
] as const;

/** Anzeige: Circle oder Unit (DB kann noch „CIR“ enthalten). */
export function formatTeamCategory(category: string): string {
  if (category === "CIR" || category === "Circle") return "Circle";
  return "Unit";
}

export const MATRIX_LABELS = {
  x: "Strategischer Beitrag",
  y: "Umsetzungsreife",
} as const;

export function getMaturityLabel(value: number): string {
  return MATURITY_LEVELS.find((l) => l.value === value)?.label ?? `Stufe ${value}`;
}

export function getStrategicGoalShortLabel(id: number): string {
  const goal = STRATEGIC_GOALS.find((g) => g.id === id);
  return goal ? `${id}. ${goal.short}` : `Ziel ${id}`;
}

export function getStrategicGoalFullLabel(id: number): string {
  const goal = STRATEGIC_GOALS.find((g) => g.id === id);
  return goal?.label ?? `Ziel ${id}`;
}

export function parseStrategicGoals(json: string): number[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}
