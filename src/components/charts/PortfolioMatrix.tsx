"use client";

import { MATRIX_LABELS } from "@/lib/constants";

export type MatrixPoint = {
  id: string;
  name: string;
  category: string;
  xToday: number;
  yToday: number;
  xOutlook: number;
  yOutlook: number;
  status: string;
};

const COLORS: Record<string, string> = {
  Circle: "#0093D3",
  CIR: "#0093D3",
  Unit: "#4DB8E8",
};

export function PortfolioMatrix({ points }: { points: MatrixPoint[] }) {
  const size = 400;
  const pad = 48;
  const plot = size - pad * 2;

  const toX = (v: number) => pad + ((v - 1) / 4) * plot;
  const toY = (v: number) => pad + plot - ((v - 1) / 4) * plot;

  return (
    <div className="overflow-x-auto rounded-xl border bg-white p-4 shadow-sm">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-lg">
        <rect x={pad} y={pad} width={plot} height={plot} fill="#f8fafc" stroke="#e2e8f0" />
        {[2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1={toX(i)}
              y1={pad}
              x2={toX(i)}
              y2={pad + plot}
              stroke="#e2e8f0"
              strokeDasharray="4"
            />
            <line
              x1={pad}
              y1={toY(i)}
              x2={pad + plot}
              y2={toY(i)}
              stroke="#e2e8f0"
              strokeDasharray="4"
            />
          </g>
        ))}
        <text x={pad + plot / 2} y={size - 8} textAnchor="middle" className="fill-gray-600 text-[11px]">
          {MATRIX_LABELS.x} →
        </text>
        <text
          x={12}
          y={pad + plot / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${pad + plot / 2})`}
          className="fill-gray-600 text-[11px]"
        >
          {MATRIX_LABELS.y}
        </text>
        {points.map((p) => {
          const color = COLORS[p.category] ?? "#64748b";
          const x1 = toX(p.xToday);
          const y1 = toY(p.yToday);
          const x2 = toX(p.xOutlook);
          const y2 = toY(p.yOutlook);
          return (
            <g key={p.id}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1.5} opacity={0.6} />
              <circle cx={x1} cy={y1} r={6} fill={color} />
              <circle cx={x2} cy={y2} r={5} fill="white" stroke={color} strokeWidth={2} />
              <text x={x2 + 8} y={y2 + 4} className="fill-gray-700 text-[9px]">
                {p.name.length > 18 ? p.name.slice(0, 16) + "…" : p.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-gray-600">
        <span>● Heute</span>
        <span>○ +6 Monate</span>
        <span className="text-csp-cyan">■ Circle</span>
        <span className="text-csp-navy">■ Unit</span>
      </div>
    </div>
  );
}
