"use client";

import { AiBadge, callAi } from "@/components/assessment/ai-client";
import { Hint } from "@/components/ui";
import type { TeamTrend } from "@/lib/dashboard-data";
import type { StoredInsight, Theme } from "@/lib/insights";
import { MEASURE_STATUS, type MeasureStatus } from "@/lib/measure-labels";
import { teamShapeClass } from "@/lib/team-colors";
import { useState } from "react";

const CATEGORIES = [
  { key: "strengths", label: "Stärken", color: "bg-csp-rot" },
  { key: "gaps", label: "Schwächen", color: "bg-csp-gelb" },
  { key: "opportunities", label: "Chancen", color: "bg-csp-gruen" },
  { key: "risks", label: "Risiken", color: "bg-csp-blau" },
] as const;
type SwotKey = (typeof CATEGORIES)[number]["key"];

const STATUS_DOT: Record<MeasureStatus, string> = {
  OFFEN: "bg-csp-linie",
  IN_ARBEIT: "bg-csp-gelb",
  ERLEDIGT: "bg-csp-gruen",
  VERWORFEN: "bg-csp-grau-titel",
};

type View = "ki" | "manuell";

/**
 * Qualitative Auswertung mit zwei Sichten:
 * - KI: Nennungen zu Themen gebündelt («5× Fachkräftemangel»), Originalformulierungen aufklappbar.
 * - Manuell: alle Originalnennungen und Massnahmen pro Team, ohne KI.
 * Jede Nennung verlinkt auf die Stelle im Factsheet des Teams (Nachverfolgbarkeit).
 */
export function QualitativeInsights({
  teams,
  periods,
  initial,
  canRefresh,
  aiEnabled,
}: {
  teams: TeamTrend[];
  periods: string[];
  initial: Record<string, StoredInsight | null>;
  canRefresh: boolean;
  aiEnabled: boolean;
}) {
  const [period, setPeriod] = useState(periods.at(-1) ?? "");
  const [insights, setInsights] = useState(initial);
  const [view, setView] = useState<View>(initial[periods.at(-1) ?? ""] ? "ki" : "manuell");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submitted = teams.filter((t) => t.snapshots.some((s) => s.period === period));
  const byName = new Map(teams.map((t) => [t.name, t]));
  const current = insights[period];

  /** Link auf die Quelle: Factsheet des Teams in dieser Periode, an die passende Stelle. */
  const source = (team: TeamTrend | undefined, anchor: string) => {
    const snap = team?.snapshots.find((s) => s.period === period);
    return snap ? `/factsheet/${snap.assessmentId}#${anchor}` : undefined;
  };

  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await callAi<StoredInsight>("/api/ai/insights", { period });
      setInsights({ ...insights, [period]: result });
      setView("ki");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (periods.length === 0) return <p className="nebentext">Noch keine eingereichten Selbsteinschätzungen.</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented options={periods.map((p) => [p, p])} value={period} onChange={setPeriod} />
        <Segmented
          options={[
            ["ki", "KI-Auswertung"],
            ["manuell", "Manuell · Originalnennungen"],
          ]}
          value={view}
          onChange={(v) => setView(v as View)}
        />
        {view === "ki" && aiEnabled && canRefresh && (
          <button type="button" className="btn-sekundaer" disabled={busy || submitted.length === 0} onClick={refresh}>
            <AiBadge />
            {busy ? "KI wertet aus… (bis 1 Minute)" : current ? "Auswertung aktualisieren" : "Mit KI auswerten"}
          </button>
        )}
        {view === "ki" && current && (
          <span className="flex items-center gap-2 text-[12.5px] font-bold text-csp-grau">
            <span className={`inline-block h-[7px] w-[7px] rounded-full ${current.stale ? "bg-csp-gelb" : "bg-csp-gruen"}`} />
            {current.stale ? "Neue Eingaben seit der letzten Auswertung" : "Aktuell"} · Stand{" "}
            {new Date(current.updatedAt).toLocaleString("de-CH", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
      </div>
      {error && <p className="text-[13px] font-bold text-csp-rot">{error}</p>}

      {view === "ki" ? (
        current ? (
          <>
            <div className="rounded-[22px] bg-white p-5 sm:p-6">
              <p className="label">Zusammenfassung CSP-Sicht · {period}</p>
              <p className="fliesstext max-w-4xl">{current.data.summary}</p>
              <p className="nebentext mt-3">
                KI-generiert aus {submitted.length} Abgaben. Für die Originalaussagen auf «Manuell» umschalten oder bei
                einem Thema die Nennungen aufklappen.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {CATEGORIES.map((c) => (
                <ThemeColumn
                  key={c.key}
                  label={c.label}
                  dot={c.color}
                  themes={current.data[c.key]}
                  byName={byName}
                  link={(team) => source(team, `swot-${c.key}`)}
                />
              ))}
            </div>
            <ThemeColumn
              label="Massnahmen-Schwerpunkte"
              dot="bg-csp-ink"
              themes={current.data.measures}
              byName={byName}
              link={(team) => source(team, "massnahmen")}
            />
          </>
        ) : (
          <div className="rounded-[22px] bg-white p-5">
            <p className="fliesstext">
              {aiEnabled
                ? "Für diese Periode gibt es noch keine KI-Auswertung."
                : "KI ist nicht konfiguriert (OPENAI_API_KEY fehlt)."}{" "}
              <button type="button" className="font-extrabold underline underline-offset-2" onClick={() => setView("manuell")}>
                Manuelle Auswertung anzeigen
              </button>
            </p>
          </div>
        )
      ) : (
        <ManualView teams={submitted} period={period} source={source} />
      )}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-inset ring-csp-linie">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${
            key === value ? "bg-csp-ink text-white" : "text-csp-grau hover:text-csp-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Teamname als Link zur Quelle (neuer Tab), mit Teamfarbe und -form. */
function TeamLink({ name, team, href }: { name: string; team?: TeamTrend; href?: string }) {
  const body = (
    <>
      <span
        className={`inline-block h-[8px] w-[8px] shrink-0 ${teamShapeClass(team?.category ?? "Circle")}`}
        style={{ background: team?.color ?? "#9c9993" }}
      />
      {name.replace(/^(CIR|Unit) /, "")}
    </>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`Quelle öffnen: Factsheet ${name}`}
      className="inline-flex items-center gap-1 whitespace-nowrap underline-offset-2 hover:underline"
    >
      {body}
      <span aria-hidden className="text-csp-grau-titel">↗</span>
    </a>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">{body}</span>
  );
}

function ThemeColumn({
  label,
  dot,
  themes,
  byName,
  link,
}: {
  label: string;
  dot: string;
  themes: Theme[];
  byName: Map<string, TeamTrend>;
  link: (team: TeamTrend | undefined) => string | undefined;
}) {
  return (
    <div className="rounded-[22px] bg-white p-5">
      <p className="label flex items-center gap-2">
        <span className={`inline-block h-[7px] w-[7px] rounded-full ${dot}`} />
        {label}
      </p>
      {themes.length === 0 ? (
        <p className="nebentext">Keine wiederkehrenden Themen.</p>
      ) : (
        <ul className="divide-y divide-csp-linie">
          {themes.map((t) => (
            <li key={t.theme} className="flex gap-3 py-3">
              <Hint
                content={
                  <span className="block space-y-1.5">
                    {t.belege.map((b, i) => (
                      <span key={i} className="block">
                        <span className="font-extrabold">{b.team}:</span> «{b.text}»
                      </span>
                    ))}
                  </span>
                }
              >
                <span className="flex h-8 w-11 shrink-0 cursor-help items-center justify-center rounded-full bg-csp-sand text-[14px] font-extrabold tabular-nums">
                  {t.teams.length}×
                </span>
              </Hint>
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-extrabold leading-snug">{t.theme}</p>
                <p className="text-[13px] font-semibold text-csp-grau">{t.beschreibung}</p>
                <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-bold text-csp-text">
                  {t.teams.map((n) => (
                    <TeamLink key={n} name={n} team={byName.get(n)} href={link(byName.get(n))} />
                  ))}
                </p>
                {t.belege.length > 0 && (
                  <details className="group mt-2">
                    <summary className="cursor-pointer list-none text-[12px] font-extrabold text-csp-grau hover:text-csp-ink">
                      <span className="mr-1 inline-block transition group-open:rotate-90">›</span>
                      Originalnennungen ({t.belege.length})
                    </summary>
                    <ul className="mt-2 space-y-1.5 border-l-2 border-csp-linie pl-3">
                      {t.belege.map((b, i) => (
                        <li key={i} className="text-[12.5px] font-semibold leading-snug">
                          «{b.text}»
                          <span className="ml-2 text-[11.5px] font-bold text-csp-grau">
                            <TeamLink name={b.team} team={byName.get(b.team)} href={link(byName.get(b.team))} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function splitLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[-–•*]\s*/, "").trim())
    .filter(Boolean);
}

/** Ohne KI: alle Originalnennungen pro Kategorie und alle Massnahmen, gruppiert nach Team, mit Quellenlink. */
function ManualView({
  teams,
  period,
  source,
}: {
  teams: TeamTrend[];
  period: string;
  source: (team: TeamTrend | undefined, anchor: string) => string | undefined;
}) {
  const snap = (t: TeamTrend) => t.snapshots.find((s) => s.period === period)!;
  const countLines = (key: SwotKey) => teams.reduce((n, t) => n + splitLines(snap(t).swot[key]).length, 0);

  return (
    <div className="space-y-5">
      <p className="nebentext">
        Alle Aussagen so, wie die Teams sie erfasst haben — ohne KI. Der Teamname führt zur Stelle im Factsheet.
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="rounded-[22px] bg-white p-5">
            <p className="label flex items-center gap-2">
              <span className={`inline-block h-[7px] w-[7px] rounded-full ${c.color}`} />
              {c.label}
              <span className="font-bold text-csp-grau-titel">· {countLines(c.key)} Nennungen</span>
            </p>
            <div className="divide-y divide-csp-linie">
              {teams.map((t) => {
                const lines = splitLines(snap(t).swot[c.key]);
                if (lines.length === 0) return null;
                return (
                  <div key={t.id} className="py-2.5">
                    <p className="mb-1 text-[12.5px] font-extrabold">
                      <TeamLink name={t.name} team={t} href={source(t, `swot-${c.key}`)} />
                    </p>
                    <ul className="space-y-0.5 text-[13.5px] font-semibold leading-snug text-csp-text">
                      {lines.map((l, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-csp-grau-titel">–</span>
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {countLines(c.key) === 0 && <p className="nebentext py-2">Keine Angaben.</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[22px] bg-white p-5">
        <p className="label flex items-center gap-2">
          <span className="inline-block h-[7px] w-[7px] rounded-full bg-csp-ink" />
          Massnahmen
          <span className="font-bold text-csp-grau-titel">
            · {teams.reduce((n, t) => n + snap(t).measures.length, 0)} erfasst
          </span>
        </p>
        <div className="grid gap-x-8 md:grid-cols-2">
          {teams.map((t) => {
            const s = snap(t);
            if (s.measures.length === 0 && !s.measuresText) return null;
            return (
              <div key={t.id} className="border-t border-csp-linie py-2.5">
                <p className="mb-1 text-[12.5px] font-extrabold">
                  <TeamLink name={t.name} team={t} href={source(t, "massnahmen")} />
                </p>
                <ul className="space-y-1 text-[13.5px] font-semibold leading-snug">
                  {s.measures.map((m) => (
                    <li key={m.id} className="flex gap-2">
                      <span
                        className={`mt-[6px] inline-block h-[7px] w-[7px] shrink-0 rounded-full ${
                          STATUS_DOT[m.status as MeasureStatus] ?? "bg-csp-linie"
                        }`}
                        title={MEASURE_STATUS[m.status as MeasureStatus]}
                      />
                      <a
                        href={source(t, `massnahme-${m.id}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-2 hover:underline"
                      >
                        {m.title}
                        {m.indicator && <span className="text-csp-grau"> · {m.indicator}</span>}
                      </a>
                    </li>
                  ))}
                  {s.measuresText && (
                    <li className="whitespace-pre-wrap text-csp-grau">{s.measuresText}</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
