export type GoalMaturity = { today: number; outlook: number };
export type StrategicGoalMaturityMap = Record<string, GoalMaturity>;

export function parseStrategicGoalMaturity(json: string): StrategicGoalMaturityMap {
  try {
    const parsed = JSON.parse(json || "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const result: StrategicGoalMaturityMap = {};
    for (const [key, val] of Object.entries(parsed)) {
      if (val && typeof val === "object" && "today" in val && "outlook" in val) {
        result[key] = {
          today: clamp(Number((val as GoalMaturity).today) || 2),
          outlook: clamp(Number((val as GoalMaturity).outlook) || 2),
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

function clamp(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function serializeStrategicGoalMaturity(map: StrategicGoalMaturityMap): string {
  return JSON.stringify(map);
}

export function updateGoalMaturity(
  map: StrategicGoalMaturityMap,
  goalId: number,
  field: "today" | "outlook",
  value: number
): StrategicGoalMaturityMap {
  const key = String(goalId);
  const current = map[key] ?? { today: 2, outlook: 2 };
  return { ...map, [key]: { ...current, [field]: clamp(value) } };
}

export function pruneGoalMaturity(
  map: StrategicGoalMaturityMap,
  selectedGoalIds: number[]
): StrategicGoalMaturityMap {
  const allowed = new Set(selectedGoalIds.map(String));
  const next: StrategicGoalMaturityMap = {};
  for (const id of selectedGoalIds) {
    const key = String(id);
    next[key] = map[key] ?? { today: 2, outlook: 2 };
  }
  for (const key of Object.keys(map)) {
    if (!allowed.has(key)) delete next[key];
  }
  return next;
}

export function averageMaturityToday(map: StrategicGoalMaturityMap, goalIds: number[]): number | null {
  if (goalIds.length === 0) return null;
  const values = goalIds.map((id) => map[String(id)]?.today ?? 2);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}
