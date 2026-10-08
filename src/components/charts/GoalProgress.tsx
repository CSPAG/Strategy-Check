import { Hint } from "@/components/ui";
import { IconArrowRight } from "@/components/icons";
import { CSP, trendColor } from "@/lib/brand";
import { MATURITY_LEVELS, getMaturityLabel } from "@/lib/constants";
import { formatNumber } from "@/lib/dashboard-data";
import type { ReactNode } from "react";

/**
 * Zielerreichung pro strategischem Ziel als eigene Zeile (statt überlagerter Linien):
 * Ist heute (gefüllt) → Prognose +6 Monate (Ring), frühere Ist-Werte grau.
 * Jede Zeile ist direkt beschriftet, damit nichts über Farben gesucht werden muss.
 */

export type GoalRow = {
  key: string;
  title: string;
  fullTitle?: string;
  period: string;
  today: number;
  outlook: number;
  previous?: { period: string; value: number }[];
  /** Prognose der Vorperiode vs. heutiges Ist. */
  check?: { fromPeriod: string; forecast: number };
  meta?: ReactNode;
  tooltip?: ReactNode;
  /** Einzelwerte hinter einem Durchschnitt (Mouse-over auf Spur und Prognose). */
  breakdown?: { name: string; color: string; square?: boolean; today: number; outlook: number }[];
};

const pos = (v: number) => `${((Math.min(5, Math.max(1, v)) - 1) / 4) * 100}%`;

function valueText(v: number) {
  return Number.isInteger(v) ? `${v} · ${getMaturityLabel(v)}` : formatNumber(v);
}

export function GoalScaleHeader() {
  return (
    <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_88px] gap-6 pb-2 sm:grid">
      <span />
      <div className="relative mx-2 h-8">
        {MATURITY_LEVELS.map((l) => (
          <span
            key={l.value}
            className="absolute top-0 -translate-x-1/2 text-center text-[10.5px] font-bold leading-tight text-csp-grau"
            style={{ left: pos(l.value) }}
          >
            <span className="block text-[12px] font-extrabold text-csp-ink">{l.value}</span>
            {l.label}
          </span>
        ))}
      </div>
      <span />
    </div>
  );
}

function LegendArrow({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden>
      <line x1="1" y1="5" x2="19" y2="5" stroke={color} strokeWidth={dashed ? 1.6 : 2.5} strokeDasharray={dashed ? "3 3" : undefined} />
      <path d="M17,1 L25,5 L17,9 z" fill={color} />
    </svg>
  );
}

export function GoalLegend() {
  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-bold text-csp-grau">
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full bg-csp-ink" /> Ist heute
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full border-[2.5px] border-csp-ink bg-white" /> Prognose +6 Monate
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-csp-grau-titel bg-white" /> Ist frühere Periode
      </span>
      <span className="inline-flex items-center gap-2">
        <LegendArrow color={CSP.gruen} /> Prognose steigend
      </span>
      <span className="inline-flex items-center gap-2">
        <LegendArrow color={CSP.rot} /> Prognose sinkend
      </span>
      <span className="inline-flex items-center gap-2">
        <LegendArrow color={CSP.grauTitel} dashed /> Entwicklung seit Vorperiode
      </span>
    </div>
  );
}

export function GoalProgress({ rows, showHeader = true }: { rows: GoalRow[]; showHeader?: boolean }) {
  return (
    <div>
      {showHeader && <GoalScaleHeader />}
      <ul className="divide-y divide-csp-linie border-y border-csp-linie">
        {rows.map((r) => (
          <GoalProgressRow key={r.key} row={r} />
        ))}
      </ul>
    </div>
  );
}

/** Tooltip mit den Einzelwerten aller Teams hinter einem Durchschnitt. */
function Breakdown({ row }: { row: GoalRow }) {
  const items = [...(row.breakdown ?? [])].sort((a, b) => b.today - a.today || a.name.localeCompare(b.name, "de"));
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-3 hidden w-max min-w-[220px] max-w-[300px] -translate-x-1/2 rounded-xl bg-csp-ink px-3 py-2.5 text-[12px] font-semibold leading-snug text-white shadow-lg group-hover/spur:block"
    >
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/60">
        Einzelwerte {row.period} · heute → Prognose
      </p>
      <ul className="space-y-1">
        {items.map((b) => (
          <li key={b.name} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={`inline-block h-[8px] w-[8px] shrink-0 ${b.square ? "rounded-[1px]" : "rounded-full"}`}
                style={{ background: b.color }}
              />
              <span className="truncate">{b.name.replace(/^(CIR|Unit) /, "")}</span>
            </span>
            <span className="shrink-0 font-extrabold tabular-nums">
              {b.today} → {b.outlook}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 border-t border-white/20 pt-1.5 font-extrabold tabular-nums">
        Ø {formatNumber(row.today)} → {formatNumber(row.outlook)}
        <span className="font-semibold text-white/60"> aus {items.length} {items.length === 1 ? "Team" : "Teams"}</span>
      </p>
    </div>
  );
}

/**
 * Pfeile auf der Spur: grau gestrichelt von der Vorperiode zum Ist (Entwicklung), farbig mit Spitze vom Ist zur
 * Prognose (grün steigend, rot sinkend). Die Spitze endet am Rand des Zielpunkts (refX), Linien liegen unter den Punkten.
 */
const SHORT_STEP = 0.5;

function TrackArrows({ row }: { row: GoalRow }) {
  const chain = [...(row.previous ?? []).map((p) => p.value), row.today];
  const delta = row.outlook - row.today;
  // Liegt die Vorperiode auf derselben Seite wie die Prognose, würden sich die Pfeile überdecken:
  // dann läuft die Entwicklungslinie leicht oberhalb der Spur.
  const lastPrev = chain.length > 1 ? chain[chain.length - 2] : row.today;
  const overlap = delta !== 0 && (lastPrev - row.today) * delta > 0;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <defs>
        {[
          ["pfeil-gruen", CSP.gruen],
          ["pfeil-rot", CSP.rot],
        ].map(([id, color]) => (
          <marker key={id} id={id} viewBox="0 0 10 10" refX="19" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={color} />
          </marker>
        ))}
        <marker id="pfeil-grau" viewBox="0 0 10 10" refX="21" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={CSP.grauTitel} />
        </marker>
      </defs>
      <g transform={overlap ? "translate(0,-7)" : undefined}>
      {chain.slice(1).map((to, i) =>
        chain[i] === to ? null : (
          <line
            key={i}
            x1={pos(chain[i])}
            x2={pos(to)}
            y1="50%"
            y2="50%"
            stroke={CSP.grauTitel}
            strokeWidth={1.6}
            strokeDasharray="3 3"
            markerEnd="url(#pfeil-grau)"
          />
        )
      )}
      </g>
      {delta !== 0 && (
        <line
          x1={pos(row.today)}
          x2={pos(row.outlook)}
          y1="50%"
          y2="50%"
          stroke={trendColor(delta)}
          strokeWidth={3}
          strokeLinecap="round"
          // Bei sehr kleinen Schritten fehlt der Platz für die Spitze — dann zeigt der farbige Ring die Richtung.
          markerEnd={Math.abs(delta) >= SHORT_STEP ? `url(#${delta > 0 ? "pfeil-gruen" : "pfeil-rot"})` : undefined}
        />
      )}
    </svg>
  );
}

/** Hint für einzelne Punkte — entfällt, wenn die ganze Spur schon die Einzelwerte zeigt. */
function MarkerHint({ off, content, children }: { off: boolean; content: ReactNode; children: ReactNode }) {
  return off ? <>{children}</> : <Hint content={content}>{children}</Hint>;
}

function GoalProgressRow({ row }: { row: GoalRow }) {
  const hasBreakdown = Boolean(row.breakdown?.length);
  const delta = row.outlook - row.today;
  const same = delta === 0;
  const checkDelta = row.check ? row.today - row.check.forecast : 0;

  return (
    <li className="grid gap-x-6 gap-y-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_88px] sm:items-center">
      <div className="min-w-0">
        <p className="text-[14.5px] font-extrabold leading-snug">
          {row.fullTitle ? (
            <Hint content={row.fullTitle}>
              <span className="cursor-help">{row.title}</span>
            </Hint>
          ) : (
            row.title
          )}
        </p>
        {row.meta && <div className="mt-0.5 text-[12.5px] font-semibold text-csp-grau">{row.meta}</div>}
        {row.check && (
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12.5px] font-semibold text-csp-grau">
            <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: trendColor(checkDelta) }} />
            Prognose aus {row.check.fromPeriod}: {formatNumber(row.check.forecast)} · Ist: {formatNumber(row.today)}
            {checkDelta !== 0 && (
              <span className="font-extrabold text-csp-ink">
                ({checkDelta > 0 ? "+" : "−"}
                {formatNumber(Math.abs(checkDelta))})
              </span>
            )}
            {checkDelta === 0 && <span className="font-extrabold text-csp-ink">(getroffen)</span>}
          </p>
        )}
      </div>

      {/* Spur 1–5 (Mouse-over zeigt bei Durchschnitten alle Einzelwerte) */}
      <div className="group/spur relative mx-2 h-6">
        {row.breakdown && row.breakdown.length > 0 && <Breakdown row={row} />}
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded bg-csp-linie" />
        {[1, 2, 3, 4, 5].map((v) => (
          <span
            key={v}
            className="absolute top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-csp-linie"
            style={{ left: pos(v) }}
          />
        ))}
        <TrackArrows row={row} />
        {(row.previous ?? []).map((p) => (
          <span key={p.period} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(p.value) }}>
            <MarkerHint off={hasBreakdown} content={`${p.period} Ist: ${valueText(p.value)}`}>
              <span className="block h-[11px] w-[11px] rounded-full border-2 border-csp-grau-titel bg-white" />
            </MarkerHint>
          </span>
        ))}
        <span className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(row.outlook) }}>
          <MarkerHint off={hasBreakdown} content={<>{row.tooltip}Prognose +6 Monate: {valueText(row.outlook)}</>}>
            <span
              className={`block rounded-full border-[2.5px] bg-white ${same ? "h-[22px] w-[22px]" : "h-[15px] w-[15px]"}`}
              style={{
                borderColor: !same && Math.abs(delta) < SHORT_STEP ? trendColor(delta) : CSP.ink,
              }}
            />
          </MarkerHint>
        </span>
        <span className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(row.today) }}>
          <MarkerHint off={hasBreakdown} content={<>{row.tooltip}{row.period} Ist: {valueText(row.today)}</>}>
            <span className="block h-[15px] w-[15px] rounded-full border-2 border-white bg-csp-ink" />
          </MarkerHint>
        </span>
      </div>

      <div className="flex items-center gap-2 text-[14px] font-extrabold tabular-nums sm:justify-end">
        <span>{formatNumber(row.today)}</span>
        <IconArrowRight size={14} className="text-csp-grau-titel" />
        <span>{formatNumber(row.outlook)}</span>
        <span
          className="ml-1 inline-block h-[7px] w-[7px] rounded-full"
          style={{ background: same ? CSP.linie : trendColor(delta) }}
          aria-label={same ? "gleich" : delta > 0 ? "steigend" : "sinkend"}
        />
      </div>
    </li>
  );
}
