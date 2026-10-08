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
        <span className="inline-block h-1 w-5 rounded bg-csp-gruen" /> steigend
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-1 w-5 rounded bg-csp-rot" /> sinkend
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

/** Hint für einzelne Punkte — entfällt, wenn die ganze Spur schon die Einzelwerte zeigt. */
function MarkerHint({ off, content, children }: { off: boolean; content: ReactNode; children: ReactNode }) {
  return off ? <>{children}</> : <Hint content={content}>{children}</Hint>;
}

function GoalProgressRow({ row }: { row: GoalRow }) {
  const hasBreakdown = Boolean(row.breakdown?.length);
  const delta = row.outlook - row.today;
  const lo = Math.min(row.today, row.outlook);
  const hi = Math.max(row.today, row.outlook);
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
        {!same && (
          <div
            className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded"
            style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})`, background: trendColor(delta) }}
          />
        )}
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
              className={`block rounded-full border-[2.5px] border-csp-ink bg-white ${same ? "h-[22px] w-[22px]" : "h-[15px] w-[15px]"}`}
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
