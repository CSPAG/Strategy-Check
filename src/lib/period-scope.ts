import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sortPeriodLabels } from "@/lib/period-labels";
import type { Period } from "@prisma/client";

export const PERIOD_COOKIE = "strategie-periode";

export type PeriodScope = {
  /** Alle Perioden chronologisch (älteste zuerst). */
  all: Period[];
  /** Gewählte Periode aus dem Umschalter; null = «Aktuell» (alle aktiven Perioden). */
  selected: Period | null;
  /** Perioden, die Übersicht und Erinnerungen zeigen. */
  visible: Period[];
  /** Neueste Periode, bis zu der das Dashboard auswertet. */
  until: Period | null;
};

export function sortPeriods<T extends { label: string }>(periods: T[]): T[] {
  const order = sortPeriodLabels(periods.map((p) => p.label));
  return [...periods].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

/** Liest die im Header gewählte Periode (Cookie) und leitet ab, was angezeigt wird. */
export async function getPeriodScope(): Promise<PeriodScope> {
  const all = sortPeriods(await prisma.period.findMany());
  const id = (await cookies()).get(PERIOD_COOKIE)?.value;
  const selected = all.find((p) => p.id === id) ?? null;
  const active = all.filter((p) => p.isActive);
  const visible = selected ? [selected] : active.length ? active : all.slice(-1);
  return { all, selected, visible, until: selected ?? visible.at(-1) ?? null };
}

/** Labels bis und mit der gewählten Periode (für Dashboard-Auswertungen). */
export function labelsUntil(scope: PeriodScope): Set<string> {
  if (!scope.until) return new Set();
  const idx = scope.all.findIndex((p) => p.id === scope.until!.id);
  return new Set(scope.all.slice(0, idx + 1).map((p) => p.label));
}
