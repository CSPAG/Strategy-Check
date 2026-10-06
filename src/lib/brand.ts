/** CSP-Farben für SVG-Grafiken (identisch mit tailwind.config.ts). */
export const CSP = {
  ink: "#141413",
  text: "#35332f",
  grau: "#55534e",
  grauTitel: "#9c9993",
  linie: "#dcd9d2",
  sand: "#EDEBE6",
  rot: "#D5362F",
  gelb: "#FFAE01",
  gruen: "#00C61C",
  blau: "#0093D3",
} as const;

/** Feste Bedeutung: Circles blau, Units dunkelblau — im ganzen Tool gleich. */
export function categoryColor(category: string): string {
  return category === "Unit" ? "#00577D" : CSP.blau;
}

/** Entwicklung: hoch = grün, runter = rot, gleich = grau. */
export function trendColor(delta: number): string {
  if (delta > 0) return CSP.gruen;
  if (delta < 0) return CSP.rot;
  return CSP.grauTitel;
}
