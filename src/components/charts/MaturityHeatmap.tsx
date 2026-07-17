"use client";

import { getMaturityLabel } from "@/lib/constants";

export type StrategicMaturityRow = {
  teamName: string;
  category: string;
  goals: { id: number; label: string; today: number; outlook: number }[];
};

const levelColor = (v: number) => {
  const colors = ["#fee2e2", "#fed7aa", "#fef08a", "#bbf7d0", "#99f6e4"];
  return colors[Math.min(Math.max(v - 1, 0), 4)] ?? "#f1f5f9";
};

export function MaturityHeatmap({ rows }: { rows: StrategicMaturityRow[] }) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.teamName} className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="font-medium text-csp-navy">
            {row.teamName}
            <span className="ml-2 text-xs font-normal text-gray-400">({row.category})</span>
          </p>
          {row.goals.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Keine strategischen Ziele ausgewählt.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {row.goals.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <span>
                    <strong>Ziel {g.id}:</strong> {g.label}
                  </span>
                  <span
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={{ background: levelColor(g.today) }}
                    title={`Heute: ${getMaturityLabel(g.today)}, +6M: ${getMaturityLabel(g.outlook)}`}
                  >
                    {getMaturityLabel(g.today)} → {getMaturityLabel(g.outlook)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
