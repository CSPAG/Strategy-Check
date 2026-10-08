import { WaveHeading } from "@/components/WaveHeading";
import {
  MATURITY_INTRO,
  STRATEGIC_GOALS,
  SWOT_FIELDS,
  formatTeamCategory,
  getStrategicGoalShortLabel,
  parseStrategicGoals,
} from "@/lib/constants";
import { parseStrategicGoalMaturity } from "@/lib/strategic-maturity";
import { getOutlookPeriodLabel } from "@/lib/period-labels";
import { CSP, categoryColor } from "@/lib/brand";
import { GoalLegend, GoalProgress } from "@/components/charts/GoalProgress";
import { PositioningMatrix } from "@/components/charts/PositioningMatrix";
import { StatusPill } from "@/components/ui";
import { ChapterNote, ManagementSummary } from "@/components/factsheet/TeamAiPanel";
import type { FactsheetContext } from "@/lib/factsheet-context";
import type { Assessment, Measure, Team, Period } from "@prisma/client";
import { MEASURE_AREA, MEASURE_STATUS, measureGaps, type MeasureStatus } from "@/lib/measure-labels";

type AssessmentView = Assessment & {
  team: Team;
  period: Period;
  strategicGoalMaturity?: string;
  opportunities?: string;
  measureItems?: Measure[];
};

export function FactsheetView({
  assessment,
  context,
  canGenerate = false,
}: {
  assessment: AssessmentView;
  context?: FactsheetContext;
  canGenerate?: boolean;
}) {
  const prev = context?.previous ?? null;
  const goals = parseStrategicGoals(assessment.strategicGoals);
  const goalMaturity = parseStrategicGoalMaturity(assessment.strategicGoalMaturity ?? "{}");
  const selectedGoals = STRATEGIC_GOALS.filter((g) => goals.includes(g.id));
  const category = formatTeamCategory(assessment.team.category);
  const outlookPeriod = getOutlookPeriodLabel(assessment.period.label);
  const notes = context?.summary?.data.kapitel;

  return (
    <article className="space-y-12">
      <header>
        <p className="kicker mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>CSPstrategie 2026+ · Factsheet</span>
          <StatusPill status={assessment.status} />
        </p>
        <WaveHeading as="h1" className="titel">
          {assessment.team.name}.
          <br />
          <span className="text-csp-grau-titel">
            {category} · {assessment.period.label}.
          </span>
        </WaveHeading>
      </header>

      <ManagementSummary
        assessmentId={assessment.id}
        summary={context?.summary ?? null}
        canGenerate={canGenerate}
        submitted={assessment.status === "SUBMITTED"}
      />

      <FactSection id="ziele" nr="01" title="Zielerreichung." sub={`${assessment.period.label} und Prognose ${outlookPeriod}.`}>
        <ChapterNote text={notes?.ziele} />
        {selectedGoals.length === 0 ? (
          <p className="nebentext">Keine Ziele ausgewählt.</p>
        ) : (
          <>
            <GoalProgress
              rows={selectedGoals.map((g) => {
                const m = goalMaturity[String(g.id)] ?? { today: 2, outlook: 2 };
                return {
                  key: String(g.id),
                  title: getStrategicGoalShortLabel(g.id),
                  fullTitle: g.label,
                  period: assessment.period.label,
                  today: m.today,
                  outlook: m.outlook,
                  meta: g.label,
                  previous: prev?.goals[String(g.id)]
                    ? [{ period: prev.period, value: prev.goals[String(g.id)].today }]
                    : [],
                  check: prev?.goals[String(g.id)]
                    ? { fromPeriod: prev.period, forecast: prev.goals[String(g.id)].outlook }
                    : undefined,
                };
              })}
            />
            <GoalLegend />
          </>
        )}
        {assessment.maturityNotes && <Prose label="Erläuterung und Hebel" text={assessment.maturityNotes} />}
      </FactSection>

      <FactSection id="swot" nr="02" title="SWOT-Analyse." sub="Innen und aussen.">
        <ChapterNote text={notes?.swot} />
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {(Object.keys(SWOT_FIELDS) as (keyof typeof SWOT_FIELDS)[]).map((key) => (
            <div key={key} id={`swot-${key}`} className="scroll-mt-6 rounded-xl target:bg-csp-blau/10 target:ring-8 target:ring-csp-blau/10">
              <p className="label flex items-center gap-2">
                <span
                  className="inline-block h-[7px] w-[7px] rounded-full"
                  style={{ background: CSP.blau }}
                />
                {SWOT_FIELDS[key].label} ({SWOT_FIELDS[key].letter})
              </p>
              <p className="fliesstext whitespace-pre-wrap">
                {(assessment[key] as string | undefined) || <span className="text-csp-grau-titel">—</span>}
              </p>
            </div>
          ))}
        </div>
      </FactSection>

      <FactSection id="massnahmen" nr="03" title="Massnahmen." sub="Wer macht was bis wann.">
        <ChapterNote text={notes?.massnahmen} />
        <MeasureList items={assessment.measureItems ?? []} />
        {assessment.measures && <Prose label="Weitere Massnahmen (Freitext)" text={assessment.measures} />}
        {(assessment.measureItems ?? []).length === 0 && !assessment.measures && (
          <p className="nebentext">Keine Massnahmen erfasst.</p>
        )}
      </FactSection>

      <FactSection id="reifegrad" nr="04" title="Reifegrad." sub="Intern und Markt.">
        <ChapterNote text={notes?.reifegrad} />
        <div className="grid gap-8 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:items-start">
          <PositioningMatrix
            points={[
              {
                id: assessment.id,
                label: assessment.team.name,
                x: assessment.matrixXToday,
                y: assessment.matrixYToday,
                color: categoryColor(category),
                detail: assessment.period.label,
                forecast: assessment.matrixOutlookSet
                  ? { x: assessment.matrixXOutlook, y: assessment.matrixYOutlook }
                  : undefined,
                trail: prev ? [{ x: prev.markt, y: prev.intern, period: prev.period }] : undefined,
              },
            ]}
            forecastLabels
          />
          <div>
            <div className="flex gap-10">
              <Kennzahl wert={assessment.matrixYToday} was="Intern" />
              <Kennzahl wert={assessment.matrixXToday} was="Markt" />
            </div>
            {assessment.matrixOutlookSet && (
              <p className="mt-4 text-[14px] font-bold text-csp-grau">
                Prognose +6 Monate: <span className="text-csp-ink">Intern {assessment.matrixYOutlook} · Markt {assessment.matrixXOutlook}</span>
              </p>
            )}
            <p className="nebentext mt-6">{MATURITY_INTRO}</p>
          </div>
        </div>
        {assessment.matrixNotes && (
          <Prose label="Massnahmen zur Erhöhung des Reifegrads (in einem Jahr mindestens +1)" text={assessment.matrixNotes} />
        )}
      </FactSection>

      <FactSection id="ki" nr="05" title="Im CSP-Vergleich." sub="Was andere Teams auch nennen.">
        <div>
          <p className="label">Themen aus der KI-Auswertung aller Teams {assessment.period.label}, die dieses Team nennt</p>
          {!context || context.teamThemes.length === 0 ? (
            <p className="nebentext">
              {context?.themesUpdatedAt
                ? "Dieses Team taucht in keinem der gebündelten Themen auf."
                : "Für diese Periode gibt es noch keine qualitative Auswertung (Dashboard → Qualitative Auswertung)."}
            </p>
          ) : (
            <ul className="divide-y divide-csp-linie border-y border-csp-linie">
              {context.teamThemes.map((t, i) => (
                <li key={i} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-baseline">
                  <span className="text-[12.5px] font-bold text-csp-grau">{t.category}</span>
                  <span>
                    <span className="text-[14.5px] font-extrabold">{t.theme}</span>
                    <span className="block text-[13px] font-semibold text-csp-grau">
                      {t.quote ? `«${t.quote}»` : t.beschreibung}
                    </span>
                  </span>
                  <span className="text-[12.5px] font-bold tabular-nums text-csp-grau">
                    {t.count === 1 ? "nur dieses Team" : `${t.count} Teams nennen das`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FactSection>

      <footer className="hidden items-center gap-3 border-t border-csp-linie pt-5 print:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/signet-punkte.svg" alt="" width={21} height={12} />
        <span className="nebentext">
          CSP AG · Strategie-Zyklus 2026–2028 · Stand{" "}
          {new Date(assessment.updatedAt).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </footer>
    </article>
  );
}

function FactSection({
  id,
  nr,
  title,
  sub,
  children,
}: {
  id: string;
  nr: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 break-inside-avoid">
      <WaveHeading as="h2" className="zwischentitel mb-6 flex gap-4 border-b border-csp-ink pb-3">
        <span className="text-csp-grau-titel">{nr}</span>
        <span>
          {title} <span className="text-csp-grau-titel">{sub}</span>
        </span>
      </WaveHeading>
      {children}
    </section>
  );
}

function Prose({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-8 max-w-3xl">
      <p className="label">{label}</p>
      <p className="fliesstext whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function Kennzahl({ wert, was }: { wert: number; was: string }) {
  return (
    <div>
      <p className="text-[56px] font-extrabold leading-none tracking-titel">
        {wert}
        <span className="text-[24px] text-csp-grau-titel"> / 10</span>
      </p>
      <p className="mt-1 text-[13px] font-bold text-csp-grau">{was}</p>
    </div>
  );
}

const STATUS_DOT: Record<MeasureStatus, string> = {
  OFFEN: "bg-csp-linie",
  IN_ARBEIT: "bg-csp-gelb",
  ERLEDIGT: "bg-csp-gruen",
  VERWORFEN: "bg-csp-grau-titel",
};

function MeasureList({ items }: { items: Measure[] }) {
  if (items.length === 0) return null;
  return (
    <ol className="divide-y divide-csp-linie border-y border-csp-linie">
      {items.map((m, i) => {
        const gaps = measureGaps(m);
        const status = m.status as MeasureStatus;
        return (
          <li key={m.id} id={`massnahme-${m.id}`} className="scroll-mt-6 target:bg-csp-blau/10 grid gap-x-6 gap-y-2 py-4 md:grid-cols-[32px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <span className="text-[14px] font-extrabold text-csp-grau-titel">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="text-[15px] font-extrabold leading-snug">{m.title}</p>
              <p className="mt-0.5 text-[12.5px] font-bold text-csp-grau">
                {MEASURE_AREA[m.area as keyof typeof MEASURE_AREA] ?? m.area}
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <span className={`inline-block h-[7px] w-[7px] rounded-full ${gaps.length ? "bg-csp-gelb" : "bg-csp-gruen"}`} />
                  {gaps.length ? `nicht überprüfbar (fehlt: ${gaps.join(", ")})` : "überprüfbar"}
                </span>
              </p>
            </div>
            <div className="text-[13.5px] font-semibold text-csp-text">
              <span className="label mb-0 block text-[12px]">Erfolgskriterium</span>
              {m.indicator || "–"}
            </div>
            <div className="text-[13.5px] font-semibold text-csp-text">
              <span className="label mb-0 block text-[12px]">Verantwortung · Termin · Status</span>
              {m.owner || "–"} · {m.dueDate ? new Date(m.dueDate).toLocaleDateString("de-CH") : "–"}
              <span className="mt-0.5 flex items-center gap-1.5">
                <span className={`inline-block h-[7px] w-[7px] rounded-full ${STATUS_DOT[status] ?? "bg-csp-linie"}`} />
                {MEASURE_STATUS[status] ?? m.status}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
