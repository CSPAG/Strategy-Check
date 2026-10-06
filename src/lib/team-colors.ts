/**
 * Eigene Farbe pro Team, abgeleitet aus den vier Logo-Farben (Grundton, dunkel, hell).
 * Die Form unterscheidet die Kategorie: Circle = Kreis, Unit = Quadrat.
 * Zuordnung stabil über die alphabetische Reihenfolge innerhalb der Kategorie.
 */
export const TEAM_PALETTE = [
  "#0093D3", // Blau
  "#D5362F", // Rot
  "#00A81A", // Grün
  "#F2A200", // Gelb
  "#00577D", // Blau dunkel
  "#8E1F1A", // Rot dunkel
  "#0B6B22", // Grün dunkel
  "#A86F00", // Gelb dunkel
  "#6CC2EA", // Blau hell
  "#EC8A84", // Rot hell
  "#73D985", // Grün hell
  "#FFD066", // Gelb hell
] as const;

export type TeamColorMap = Record<string, string>;

export function buildTeamColors(teams: { id: string; name: string; category: string }[]): TeamColorMap {
  const map: TeamColorMap = {};
  for (const category of ["Circle", "Unit"]) {
    teams
      .filter((t) => (t.category === "Unit" ? "Unit" : "Circle") === category)
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .forEach((t, i) => {
        map[t.id] = TEAM_PALETTE[i % TEAM_PALETTE.length];
      });
  }
  return map;
}

/** Kleines Farbzeichen: Kreis für Circles, Quadrat für Units. */
export function teamShapeClass(category: string): string {
  return category === "Unit" ? "rounded-[2px]" : "rounded-full";
}
