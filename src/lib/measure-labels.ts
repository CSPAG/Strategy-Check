export const MEASURE_STATUS = {
  OFFEN: "Offen",
  IN_ARBEIT: "In Arbeit",
  ERLEDIGT: "Erledigt",
  VERWORFEN: "Verworfen",
} as const;
export type MeasureStatus = keyof typeof MEASURE_STATUS;

export const MEASURE_AREA = { SWOT: "SWOT", REIFEGRAD: "Reifegrad" } as const;

/** Überprüfbar = Erfolgskriterium, Verantwortung und Termin sind gesetzt. */
export function measureGaps(m: { indicator: string; owner: string; dueDate: Date | string | null }): string[] {
  const gaps: string[] = [];
  if (!m.indicator.trim()) gaps.push("Erfolgskriterium");
  if (!m.owner.trim()) gaps.push("Verantwortung");
  if (!m.dueDate) gaps.push("Termin");
  return gaps;
}
