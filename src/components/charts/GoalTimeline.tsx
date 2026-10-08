import { Hint } from "@/components/ui";
import { CSP, trendColor } from "@/lib/brand";
import { getMaturityLabel } from "@/lib/constants";
import { formatNumber } from "@/lib/dashboard-data";
import type { CSSProperties, ReactNode } from "react";

/**
 * Verlauf der Zielerreichung über alle Perioden (abgestimmter Entwurf A):
 * Ist pro Periode als Punkt, schwarze Linie mit Pfeil dazwischen, Prognose der letzten Periode gestrichelt in
 * Grün/Rot mit Pfeil zum Ring. Die damalige Prognose steht als gestrichelter grauer Ring an der Folgeperiode
 * (Prognose-Check auf einen Blick). Mouse-over zeigt Wert und — bei Durchschnitten — die Einzelwerte.
 */

export type TimelineValue = {
  name: string;
  color: string;
  square?: boolean;
  value: number;
};

export type TimelineRow = {
  key: string;
  title: string;
  fullTitle?: string;
  meta?: ReactNode;
  /** Ein Eintrag pro Spalte (Periode), null = Ziel in dieser Periode nicht verfolgt. */
  ist: (number | null)[];
  /** Damalige Prognose für diese Periode (aus der Vorperiode), null = keine. */
  forecastFromPrev: (number | null)[];
  /** Prognose der letzten Periode (+6 Monate). */
  outlook: number | null;
  /** Optional: Einzelwerte pro Spalte (bei Durchschnitten); letzte Spalte = Prognose. */
  breakdown?: TimelineValue[][];
};

const ROW_H = 58;
const PAD = 9;
const y = (v: number) => PAD + ((5 - Math.min(5, Math.max(1, v))) / 4) * (ROW_H - 2 * PAD);

function columnX(i: number, n: number) {
  // Spalten gleichmässig verteilt, mit Rand links/rechts
  return `${((i + 0.5) / n) * 100}%`;
}

function fmt(v: number) {
  return Number.isInteger(v) ? `${v} · ${getMaturityLabel(v)}` : formatNumber(v);
}

function TooltipList({ title, items }: { title: string; items?: TimelineValue[] }) {
  return (
    <span className="block">
      <span className="block font-extrabold">{title}</span>
      {items && items.length > 0 && (
        <span className="mt-1 block space-y-0.5">
          {[...items]
            .sort((a, b) => b.value - a.value)
            .map((b) => (
              <span key={b.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-[7px] w-[7px] ${b.square ? "rounded-[1px]" : "rounded-full"}`}
                    style={{ background: b.color }}
                  />
                  {b.name.replace(/^(CIR|Unit) /, "")}
                </span>
                <span className="font-extrabold tabular-nums">{b.value}</span>
              </span>
            ))}
        </span>
      )}
    </span>
  );
}

export function GoalTimeline({
  periods,
  outlookLabel,
  rows,
  showHeader = true,
  compact = false,
}: {
  /** Spalten (chronologisch), z. B. ["H1 2026", "H2 2026"]. */
  periods: string[];
  /** Beschriftung der Prognose-Spalte, z. B. «Prognose H1 2027». */
  outlookLabel: string;
  rows: TimelineRow[];
  showHeader?: boolean;
  /** Feste, schmale Spalten für den Druck (A4). */
  compact?: boolean;
}) {
  const n = periods.length + 1; // + Prognose-Spalte
  const grid = compact ? { gridTemplateColumns: "38mm minmax(0,1fr) 26mm", columnGap: "3mm", display: "grid" } : undefined;
  return (
    <div>
      {showHeader && (
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_120px] gap-5 pb-2 sm:grid" style={grid}>
          <span />
          <div className={`relative ${compact ? "h-7" : "h-5"}`}>
            {[...periods, outlookLabel].map((p, i) => (
              <span
                key={p}
                className={`absolute top-0 -translate-x-1/2 text-center font-extrabold ${
                  compact ? "whitespace-pre text-[7pt] leading-tight" : "whitespace-nowrap text-[11.5px]"
                } ${
                  i === n - 1 ? "text-csp-grau" : "text-csp-ink"
                }`}
                style={{ left: columnX(i, n) }}
              >
                {compact ? p.replace(/^Prognose /, "Prognose\n") : p}
              </span>
            ))}
          </div>
          <span />
        </div>
      )}
      <ul className="divide-y divide-csp-linie border-y border-csp-linie">
        {rows.map((r) => (
          <TimelineRowView key={r.key} row={r} periods={periods} outlookLabel={outlookLabel} grid={grid} compact={compact} />
        ))}
      </ul>
    </div>
  );
}

function TimelineRowView({
  row,
  periods,
  outlookLabel,
  grid,
  compact,
}: {
  row: TimelineRow;
  periods: string[];
  outlookLabel: string;
  grid?: CSSProperties;
  compact?: boolean;
}) {
  const n = periods.length + 1;
  const lastIdx = row.ist.reduce<number>((acc, v, i) => (v !== null ? i : acc), -1);
  const last = lastIdx >= 0 ? (row.ist[lastIdx] as number) : null;
  const delta = last !== null && row.outlook !== null ? row.outlook - last : 0;
  const values = row.ist.filter((v): v is number => v !== null);

  return (
    <li
      className={`grid gap-x-5 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_120px] sm:items-center ${compact ? "items-center py-1" : "py-3"}`}
      style={grid}
    >
      <div className="min-w-0">
        <div className={`font-extrabold leading-snug ${compact ? "text-[8pt]" : "text-[14.5px]"}`}>
          {row.fullTitle ? (
            <Hint content={row.fullTitle}>
              <span className="cursor-help">{row.title}</span>
            </Hint>
          ) : (
            row.title
          )}
        </div>
        {row.meta && <div className="mt-0.5 text-[12.5px] font-semibold text-csp-grau">{row.meta}</div>}
      </div>

      <div className="relative" style={{ height: ROW_H }}>
        {/* Hilfslinien 1 / 3 / 5 und Trennlinie vor der Prognose */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <marker id="tl-ink" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={CSP.ink} />
            </marker>
            {[
              ["tl-gruen", CSP.gruen],
              ["tl-rot", CSP.rot],
              ["tl-grau", CSP.grauTitel],
            ].map(([id, c]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="19" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={c} />
              </marker>
            ))}
          </defs>
          {[1, 3, 5].map((v) => (
            <line key={v} x1="0" x2="100%" y1={y(v)} y2={y(v)} stroke={v === 3 ? "#ebe8e2" : "#f1efea"} />
          ))}
          <line
            x1={`${((n - 1) / n) * 100}%`}
            x2={`${((n - 1) / n) * 100}%`}
            y1="0"
            y2={ROW_H}
            stroke={CSP.linie}
            strokeDasharray="3 3"
          />
          {/* Ist → Ist */}
          {row.ist.map((v, i) => {
            if (v === null || i === 0) return null;
            const prev = row.ist[i - 1];
            if (prev === null) return null;
            return (
              <line
                key={`l${i}`}
                x1={columnX(i - 1, n)}
                y1={y(prev)}
                x2={columnX(i, n)}
                y2={y(v)}
                stroke={CSP.ink}
                strokeWidth={2}
                markerEnd="url(#tl-ink)"
              />
            );
          })}
          {/* letztes Ist → Prognose */}
          {last !== null && row.outlook !== null && (
            <line
              x1={columnX(lastIdx, n)}
              y1={y(last)}
              x2={columnX(n - 1, n)}
              y2={y(row.outlook)}
              stroke={delta === 0 ? CSP.grauTitel : trendColor(delta)}
              strokeWidth={2.5}
              strokeDasharray="5 4"
              markerEnd={`url(#${delta > 0 ? "tl-gruen" : delta < 0 ? "tl-rot" : "tl-grau"})`}
            />
          )}
        </svg>

        {/* Damalige Prognose (gestrichelter Ring) */}
        {row.forecastFromPrev.map((f, i) =>
          f === null || row.ist[i] === null ? null : (
            <span
              key={`f${i}`}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: columnX(i, n), top: y(f) }}
            >
              <Hint
                content={`Prognose aus ${periods[i - 1] ?? "Vorperiode"}: ${fmt(f)} · Ist ${periods[i]}: ${fmt(row.ist[i] as number)}`}
              >
                <span
                  className={`block rounded-full border-[1.6px] border-dashed bg-transparent ${
                    f === row.ist[i] ? "h-[21px] w-[21px] border-csp-gruen" : "h-[13px] w-[13px] border-csp-grau-titel"
                  }`}
                />
              </Hint>
            </span>
          )
        )}

        {/* Ist-Punkte */}
        {row.ist.map((v, i) =>
          v === null ? null : (
            <span
              key={`p${i}`}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: columnX(i, n), top: y(v) }}
            >
              <Hint content={<TooltipList title={`${periods[i]} Ist: ${fmt(v)}`} items={row.breakdown?.[i]} />}>
                <span className="block h-[12px] w-[12px] rounded-full border-2 border-white bg-csp-ink" />
              </Hint>
            </span>
          )
        )}

        {/* Prognose-Ring */}
        {row.outlook !== null && (
          <span
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: columnX(n - 1, n), top: y(row.outlook) }}
          >
            <Hint content={<TooltipList title={`${outlookLabel}: ${fmt(row.outlook)}`} items={row.breakdown?.[n - 1]} />}>
              <span className="block h-[14px] w-[14px] rounded-full border-[2.5px] border-csp-ink bg-white" />
            </Hint>
          </span>
        )}
      </div>

      <div
        className={`flex flex-wrap items-center gap-1.5 font-extrabold tabular-nums sm:justify-end ${
          compact ? "justify-end text-[8pt]" : "text-[13.5px]"
        }`}
      >
        {values.map((v, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-csp-grau-titel">→</span>}
            {formatNumber(v)}
          </span>
        ))}
        {row.outlook !== null && (
          <>
            <span className="text-csp-grau-titel">⇢</span>
            <span>{formatNumber(row.outlook)}</span>
            <span
              className="ml-0.5 inline-block h-[7px] w-[7px] rounded-full"
              style={{ background: delta === 0 ? CSP.linie : trendColor(delta) }}
            />
          </>
        )}
      </div>
    </li>
  );
}

export function TimelineLegend() {
  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12px] font-bold text-csp-grau">
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full bg-csp-ink" /> Ist pro Periode
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full border-[2.5px] border-csp-ink bg-white" /> Prognose +6 Monate
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full border-[1.6px] border-dashed border-csp-grau-titel" /> damalige Prognose
        (grün = getroffen)
      </span>
      <span className="inline-flex items-center gap-2">
        <svg width="26" height="10" viewBox="0 0 26 10" aria-hidden>
          <line x1="1" y1="5" x2="19" y2="5" stroke={CSP.gruen} strokeWidth={2.5} strokeDasharray="4 3" />
          <path d="M17,1 L25,5 L17,9 z" fill={CSP.gruen} />
        </svg>
        Prognose steigend / sinkend
      </span>
    </div>
  );
}
