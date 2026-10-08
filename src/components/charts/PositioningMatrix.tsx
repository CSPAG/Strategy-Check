"use client";

import { CSP } from "@/lib/brand";
import { useState } from "react";

/**
 * Reifegrad-Matrix: Markt (X) × Intern (Y), Skala 1–10.
 * Dieselbe Grafik in Eingabe, Factsheet und Dashboard (einzeln oder alle Teams).
 */

export type MatrixPoint = {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  /** Circle = Kreis (Standard), Unit = Quadrat. */
  shape?: "circle" | "square";
  detail?: string;
  /** Frühere Positionen (chronologisch), werden grau mit Pfeil zur aktuellen verbunden. */
  trail?: { x: number; y: number; period: string }[];
  /** Prognose +6 Monate — Pfeil vom Status quo dorthin (Teamfarbe), Ring als Zielpunkt. */
  forecast?: { x: number; y: number };
  /** Beschriftung am aktuellen Punkt (z. B. «H2 2026 · heute»), nur mit pathLabels. */
  currentLabel?: string;
};

const W = 400;
const H = 396;
const PAD_L = 48;
const PAD_T = 12;
const PLOT = 340;
const CELL = PLOT / 10;
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Anordnung von n Marken innerhalb einer Zelle (Versatz in px um den Mittelpunkt). */
function clusterOffsets(n: number): [number, number][] {
  if (n === 1) return [[0, 0]];
  if (n === 2) return [[-5.5, 0], [5.5, 0]];
  if (n === 3) return [[-5.5, 4], [5.5, 4], [0, -5.5]];
  if (n === 4) return [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * 9, Math.sin(a) * 9] as [number, number];
  });
}

const toX = (v: number) => PAD_L + (v - 0.5) * CELL;
const toY = (v: number) => PAD_T + PLOT - (v - 0.5) * CELL;

export function PositioningMatrix({
  points,
  forecastLabels = false,
  pathLabels = false,
  onPick,
  highlightId,
  onHover,
  className = "",
}: {
  points: MatrixPoint[];
  /** Prognosewerte als Text neben dem Ring anzeigen (Einzelansichten). */
  forecastLabels?: boolean;
  /** Perioden am Pfad beschriften (Einzelansichten: Team-Karte, Factsheet). */
  pathLabels?: boolean;
  onPick?: (markt: number, intern: number) => void;
  highlightId?: string | null;
  /** Alle Teams der gehoverten Position (bei Überlappung mehrere). */
  onHover?: (ids: string[] | null) => void;
  className?: string;
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  // Teams auf derselben Position zu einer Gruppe zusammenfassen (sonst verdecken sie sich).
  const groups = new Map<string, MatrixPoint[]>();
  for (const p of points) {
    const key = `${p.x}-${p.y}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  const highlightKey = highlightId
    ? Array.from(groups.entries()).find(([, ps]) => ps.some((p) => p.id === highlightId))?.[0]
    : null;
  const activeKey = hoverKey ?? highlightKey ?? null;
  const activeGroup = activeKey ? groups.get(activeKey) : undefined;

  const enter = (key: string, ps: MatrixPoint[]) => {
    setHoverKey(key);
    onHover?.(ps.map((q) => q.id));
  };
  const leave = () => {
    setHoverKey(null);
    onHover?.(null);
  };

  return (
    <div className={`relative select-none ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Reifegrad-Matrix Markt und Intern">
        <defs>
          {/* Spitze endet am Rand des Status-quo-Punkts (refX = Spitze + Radius in Marker-Einheiten) */}
          <marker id="trail-pfeil" viewBox="0 0 10 10" refX="26" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={CSP.grauTitel} />
          </marker>
          {Array.from(new Set(points.filter((p) => p.forecast).map((p) => p.color))).map((c) => (
            <marker key={c} id={`prog-${c.replace("#", "")}`} viewBox="0 0 10 10" refX="22" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={c} />
            </marker>
          ))}
        </defs>

        {/* Fläche, oberes rechtes Feld leicht betont */}
        <rect x={PAD_L} y={PAD_T} width={PLOT} height={PLOT} fill="white" stroke={CSP.linie} />
        <rect x={toX(5.5)} y={PAD_T} width={PLOT / 2} height={PLOT / 2} fill={CSP.sand} opacity={0.55} />

        {/* Raster */}
        {VALUES.slice(1).map((v) => (
          <g key={v}>
            <line
              x1={PAD_L + (v - 1) * CELL}
              x2={PAD_L + (v - 1) * CELL}
              y1={PAD_T}
              y2={PAD_T + PLOT}
              stroke={v === 6 ? CSP.grauTitel : "#ebe8e2"}
              strokeDasharray={v === 6 ? "4 4" : undefined}
            />
            <line
              x1={PAD_L}
              x2={PAD_L + PLOT}
              y1={PAD_T + PLOT - (v - 1) * CELL}
              y2={PAD_T + PLOT - (v - 1) * CELL}
              stroke={v === 6 ? CSP.grauTitel : "#ebe8e2"}
              strokeDasharray={v === 6 ? "4 4" : undefined}
            />
          </g>
        ))}

        {/* Klickbare Felder (nur in der Eingabe) */}
        {onPick &&
          VALUES.map((x) =>
            VALUES.map((y) => (
              <rect
                key={`${x}-${y}`}
                x={PAD_L + (x - 1) * CELL}
                y={PAD_T + PLOT - y * CELL}
                width={CELL}
                height={CELL}
                fill={hoverCell?.x === x && hoverCell?.y === y ? CSP.sand : "transparent"}
                className="cursor-pointer"
                onMouseEnter={() => setHoverCell({ x, y })}
                onMouseLeave={() => setHoverCell(null)}
                onClick={() => onPick(x, y)}
              >
                <title>{`Markt ${x} · Intern ${y}`}</title>
              </rect>
            ))
          )}

        {/* Achsen-Skala */}
        {VALUES.map((v) => (
          <g key={`t${v}`} className="text-[11px] font-bold" fill={CSP.grau}>
            <text x={toX(v)} y={PAD_T + PLOT + 17} textAnchor="middle">
              {v}
            </text>
            <text x={PAD_L - 9} y={toY(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <text x={PAD_L + PLOT / 2} y={H - 4} textAnchor="middle" className="text-[12px] font-extrabold" fill={CSP.ink}>
          Markt (X) →
        </text>
        <text
          x={14}
          y={PAD_T + PLOT / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${PAD_T + PLOT / 2})`}
          className="text-[12px] font-extrabold"
          fill={CSP.ink}
        >
          Intern (Y) →
        </text>

        {/* Entwicklung über die Perioden */}
        {points.map((p) =>
          p.trail && p.trail.length > 0 ? (
            <g key={`trail-${p.id}`} opacity={highlightId && highlightId !== p.id ? 0.25 : 1}>
              <polyline
                points={[...p.trail, p].map((t) => `${toX(t.x)},${toY(t.y)}`).join(" ")}
                fill="none"
                stroke={CSP.grauTitel}
                strokeWidth={1.6}
                strokeDasharray="4 3"
                markerEnd={p.trail.at(-1)!.x === p.x && p.trail.at(-1)!.y === p.y ? undefined : "url(#trail-pfeil)"}
              />
              {p.trail.map((t) => (
                <g key={t.period}>
                  <circle cx={toX(t.x)} cy={toY(t.y)} r={4.5} fill="white" stroke={CSP.grauTitel} strokeWidth={1.6}>
                    <title>{`${p.label} · ${t.period}: Intern ${t.y} · Markt ${t.x}`}</title>
                  </circle>
                  {pathLabels && (
                    <text
                      x={toX(t.x)}
                      y={t.y >= 10 ? toY(t.y) + 17 : toY(t.y) - 9}
                      textAnchor="middle"
                      className="text-[10.5px] font-bold"
                      fill={CSP.grau}
                      stroke="white"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {t.period}
                    </text>
                  )}
                </g>
              ))}
            </g>
          ) : null
        )}

        {/* Prognose: Status quo → Prognose, durchgezogen in Teamfarbe */}
        {points.map((p) => {
          if (!p.forecast) return null;
          const fx = toX(p.forecast.x);
          const fy = toY(p.forecast.y);
          const same = p.forecast.x === p.x && p.forecast.y === p.y;
          return (
            <g key={`prog-${p.id}`} opacity={highlightId && highlightId !== p.id ? 0.25 : 1} className="pointer-events-none">
              {same ? (
                <circle cx={fx} cy={fy} r={15} fill="none" stroke={p.color} strokeWidth={2} strokeDasharray="3 3" />
              ) : (
                <>
                  <line
                    x1={toX(p.x)}
                    y1={toY(p.y)}
                    x2={fx}
                    y2={fy}
                    stroke={p.color}
                    strokeWidth={2.2}
                    markerEnd={`url(#prog-${p.color.replace("#", "")})`}
                  />
                  {p.shape === "square" ? (
                    <rect x={fx - 7.5} y={fy - 7.5} width={15} height={15} rx={2.5} fill="white" stroke={p.color} strokeWidth={2.5} />
                  ) : (
                    <circle cx={fx} cy={fy} r={8} fill="white" stroke={p.color} strokeWidth={2.5} />
                  )}
                </>
              )}
              {forecastLabels && (
                <text
                  x={p.forecast.x >= 7 ? fx - (same ? 19 : 13) : fx + (same ? 19 : 13)}
                  y={p.forecast.y >= 9 ? fy + (same ? 24 : 22) : fy - (same ? 10 : 8)}
                  textAnchor={p.forecast.x >= 7 ? "end" : "start"}
                  className="text-[11px] font-extrabold"
                  fill={CSP.ink}
                  stroke="white"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {same ? "Prognose = heute" : `Prognose I ${p.forecast.y} · M ${p.forecast.x}`}
                </text>
              )}
            </g>
          );
        })}

        {/* Punkte — mehrere Teams auf derselben Position werden als Gruppe in ihren Farben gezeichnet */}
        {Array.from(groups.entries()).map(([key, ps]) => {
          const p = ps[0];
          const multi = ps.length > 1;
          const active = key === activeKey;
          const dimmed = highlightKey && !active;
          const cx = toX(p.x);
          const cy = toY(p.y);
          const marks = clusterOffsets(ps.length);
          const size = multi ? (ps.length > 4 ? 7 : 9) : 17;
          return (
            <g
              key={key}
              tabIndex={0}
              className="cursor-pointer outline-none"
              opacity={dimmed ? 0.35 : 1}
              onMouseEnter={() => enter(key, ps)}
              onMouseLeave={leave}
              onFocus={() => enter(key, ps)}
              onBlur={leave}
              onClick={() => (hoverKey === key ? leave() : enter(key, ps))}
            >
              <title>{ps.map((q) => q.label).join(", ")}</title>
              {multi && <circle cx={cx} cy={cy} r={16} fill="white" stroke={CSP.linie} />}
              {active && <circle cx={cx} cy={cy} r={multi ? 18.5 : 13} fill="none" stroke={CSP.ink} strokeWidth={2} />}
              {ps.map((q, i) => {
                const x = cx + marks[i][0];
                const y = cy + marks[i][1];
                const isHighlighted = highlightId === q.id;
                const sw = isHighlighted ? 2.5 : multi ? 1.5 : 2;
                const stroke = isHighlighted ? CSP.ink : "white";
                return q.shape === "square" ? (
                  <rect
                    key={q.id}
                    x={x - size / 2}
                    y={y - size / 2}
                    width={size}
                    height={size}
                    rx={multi ? 1.5 : 2.5}
                    fill={q.color}
                    stroke={stroke}
                    strokeWidth={sw}
                  />
                ) : (
                  <circle key={q.id} cx={x} cy={y} r={size / 2} fill={q.color} stroke={stroke} strokeWidth={sw} />
                );
              })}
              {multi && (
                <g className="pointer-events-none">
                  <circle cx={cx + 14} cy={cy - 14} r={7.5} fill={CSP.ink} stroke="white" strokeWidth={1.5} />
                  <text x={cx + 14} y={cy - 10.6} textAnchor="middle" className="text-[9.5px] font-extrabold" fill="white">
                    {ps.length}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {pathLabels &&
          points.map((p) =>
            p.currentLabel ? (
              <text
                key={`cl-${p.id}`}
                x={toX(p.x) + (p.x >= 7 ? -14 : 14)}
                y={toY(p.y) + 18}
                textAnchor={p.x >= 7 ? "end" : "start"}
                className="pointer-events-none text-[11px] font-extrabold"
                fill={CSP.ink}
                stroke="white"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {p.currentLabel}
              </text>
            ) : null
          )}
      </svg>

      {activeGroup && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 w-max max-w-[240px] -translate-x-1/2 rounded-xl bg-csp-ink px-3 py-2 text-[12px] font-semibold leading-snug text-white shadow-lg"
          style={{
            left: `${(toX(activeGroup[0].x) / W) * 100}%`,
            top: `${(toY(activeGroup[0].y) / H) * 100}%`,
            transform: `translate(-50%, calc(-100% - ${activeGroup.length > 1 ? 26 : 18}px))`,
          }}
        >
          {activeGroup.map((p) => (
            <div key={p.id} className="flex items-baseline gap-2 py-0.5">
              <span
                className={`inline-block h-[8px] w-[8px] shrink-0 ${p.shape === "square" ? "rounded-[1px]" : "rounded-full"}`}
                style={{ background: p.color }}
              />
              <span>
                <span className="font-extrabold">{p.label}</span>
                <br />
                <span className="text-white/70">
                  Intern {p.y} · Markt {p.x}
                  {p.detail ? ` · ${p.detail}` : ""}
                </span>
                {p.forecast && (
                  <>
                    <br />
                    <span className="text-white/70">
                      Prognose: Intern {p.forecast.y} · Markt {p.forecast.x}
                    </span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
