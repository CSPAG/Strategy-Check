export function parsePeriodLabel(label: string): { half: 1 | 2; year: number } | null {
  const match = label.match(/^H([12])\s+(\d{4})$/);
  if (!match) return null;
  return { half: Number(match[1]) as 1 | 2, year: Number(match[2]) };
}

export function getOutlookPeriodLabel(periodLabel: string): string {
  const parsed = parsePeriodLabel(periodLabel);
  if (!parsed) return `${periodLabel} (Ausblick)`;
  if (parsed.half === 2) return `H1 ${parsed.year + 1}`;
  return `H2 ${parsed.year}`;
}

export function sortPeriodLabels(labels: string[]): string[] {
  return [...new Set(labels)].sort((a, b) => {
    const left = parsePeriodLabel(a);
    const right = parsePeriodLabel(b);
    if (!left || !right) return a.localeCompare(b, "de");
    if (left.year !== right.year) return left.year - right.year;
    return left.half - right.half;
  });
}
