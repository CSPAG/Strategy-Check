"use client";

import {
  GOAL_SCALE_ENDS,
  MATURITY_LEVELS,
  STRATEGIC_GOALS,
  MATURITY_INTRO,
  SWOT_FIELDS,
  SWOT_INTRO,
  getMaturityLabel,
  parseStrategicGoals,
} from "@/lib/constants";
import {
  parseStrategicGoalMaturity,
  pruneGoalMaturity,
  serializeStrategicGoalMaturity,
  updateGoalMaturity,
} from "@/lib/strategic-maturity";
import { getOutlookPeriodLabel } from "@/lib/period-labels";
import { categoryColor } from "@/lib/brand";
import { formatTeamCategory } from "@/lib/constants";
import type { Assessment, Measure, Team, Period } from "@prisma/client";
import { toAssessmentPayload } from "@/lib/assessment-payload";
import { PositioningMatrix } from "@/components/charts/PositioningMatrix";
import { Section, StatusPill } from "@/components/ui";
import { AiTextButton } from "@/components/assessment/AiTextButton";
import { SwotAi } from "@/components/assessment/SwotAi";
import { MeasureEditor, type MeasureDraft } from "@/components/assessment/MeasureEditor";
import { callAi } from "@/components/assessment/ai-client";
import type { MeasureStatus } from "@/lib/measure-labels";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconFile } from "@/components/icons";
import { useState } from "react";
import type { PreviousAssessment } from "@/lib/previous-assessment";
import { newMeasureKey } from "@/components/assessment/MeasureEditor";

type AssessmentWithMeta = Assessment & {
  team: Team;
  period: Period;
  strategicGoalMaturity?: string;
  opportunities?: string;
  measureItems?: Measure[];
};

type Props = {
  assessment: AssessmentWithMeta;
  /** Letzte frühere Abgabe des Teams: grau als Referenz, SWOT und offene Massnahmen übernehmbar. */
  previous?: PreviousAssessment | null;
  readOnly?: boolean;
  aiEnabled?: boolean;
};

function toDrafts(items: Measure[] | undefined): MeasureDraft[] {
  return (items ?? []).map((m) => ({
    key: m.id,
    id: m.id,
    area: m.area === "REIFEGRAD" ? "REIFEGRAD" : "SWOT",
    title: m.title,
    indicator: m.indicator,
    owner: m.owner,
    dueDate: m.dueDate ? new Date(m.dueDate).toISOString().slice(0, 10) : "",
    status: m.status as MeasureStatus,
  }));
}

/** Skala 1–5 mit Namen (Initial … Optimierend), damit Eingabe und Factsheet dieselbe Sprache sprechen. */
/** Fixer Wert aus der Vorperiode (grau gestrichelt, nicht klickbar). */
type Reference = { value: number; label: string };

function ReferenceNote({ reference, text }: { reference?: Reference; text: string }) {
  if (!reference) return null;
  return (
    <p className="mt-2 flex items-center gap-2 text-[12.5px] font-semibold text-csp-grau">
      <span className="inline-block h-3 w-3 shrink-0 rounded-[4px] border-[1.6px] border-dashed border-csp-grau-titel bg-csp-sand/60" />
      {reference.label}: {text}
    </p>
  );
}

function GoalScalePicker({
  label,
  value,
  onChange,
  disabled,
  reference,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  reference?: Reference;
}) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={label}>
        {MATURITY_LEVELS.map((l) => {
          const active = l.value === value;
          const ref = !active && reference?.value === l.value;
          return (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              title={l.description}
              aria-label={`${l.value} ${l.label}`}
              onClick={() => onChange(l.value)}
              className={`rounded-2xl px-1 py-2.5 text-center transition disabled:cursor-not-allowed ${
                active
                  ? "bg-csp-ink text-white"
                  : ref
                    ? "border-[1.6px] border-dashed border-csp-grau-titel bg-csp-sand/60 text-csp-ink"
                    : "bg-white text-csp-ink ring-1 ring-inset ring-csp-linie hover:ring-csp-ink disabled:hover:ring-csp-linie"
              }`}
            >
              <span className="block text-[17px] font-extrabold leading-none">{l.value}</span>
              <span
                className={`mt-1 hidden truncate px-0.5 text-[10.5px] font-bold leading-tight sm:block ${
                  active ? "text-white/75" : "text-csp-grau"
                }`}
              >
                {l.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12.5px] font-semibold text-csp-grau">
        <span className="font-extrabold text-csp-ink">{getMaturityLabel(value)}:</span>{" "}
        {MATURITY_LEVELS.find((l) => l.value === value)?.description}
      </p>
      <ReferenceNote
        reference={reference}
        text={reference ? `${reference.value} · ${getMaturityLabel(reference.value)}` : ""}
      />
    </div>
  );
}

/** Skala 1–10 für Intern / Markt. */
function TenScalePicker({
  label,
  value,
  onChange,
  disabled,
  reference,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  reference?: Reference;
}) {
  return (
    <div>
      <p className="label mb-2">
        {label} <span className="text-csp-ink">{value}</span>
      </p>
      <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={label}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === value}
            disabled={disabled}
            onClick={() => onChange(v)}
            className={`rounded-xl py-2 text-[14px] font-extrabold transition disabled:cursor-not-allowed ${
              v === value
                ? "bg-csp-ink text-white"
                : reference?.value === v
                  ? "border-[1.6px] border-dashed border-csp-grau-titel bg-csp-sand/60"
                  : "bg-white ring-1 ring-inset ring-csp-linie hover:ring-csp-ink disabled:hover:ring-csp-linie"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-bold text-csp-grau">
        <span>tief</span>
        <span>hoch</span>
      </div>
      <ReferenceNote reference={reference} text={reference ? String(reference.value) : ""} />
    </div>
  );
}

export function AssessmentForm({ assessment, previous = null, readOnly = false, aiEnabled = false }: Props) {
  const router = useRouter();
  const [data, setData] = useState(assessment);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pickMode, setPickMode] = useState<"heute" | "prognose">("heute");
  const [measures, setMeasures] = useState<MeasureDraft[]>(() => toDrafts(assessment.measureItems));

  const goals = parseStrategicGoals(data.strategicGoals);
  const goalMaturity = parseStrategicGoalMaturity(data.strategicGoalMaturity ?? "{}");
  const outlookPeriod = getOutlookPeriodLabel(data.period.label);
  const category = formatTeamCategory(data.team.category);

  const update = (patch: Partial<AssessmentWithMeta>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const toggleGoal = (id: number) => {
    const nextGoals = goals.includes(id)
      ? goals.filter((g) => g !== id)
      : [...goals, id].sort((a, b) => a - b);
    const pruned = pruneGoalMaturity(goalMaturity, nextGoals);
    // Neu angekreuzt und in der Vorperiode verfolgt: startet bei der damaligen Prognose
    const prevGoal = previous?.goalMaturity[String(id)];
    if (!goals.includes(id) && prevGoal && !pruned[String(id)]) {
      pruned[String(id)] = { today: prevGoal.outlook, outlook: prevGoal.outlook };
    }
    update({
      strategicGoals: JSON.stringify(nextGoals),
      strategicGoalMaturity: serializeStrategicGoalMaturity(pruned),
    });
  };

  const setMaturity = (goalId: number, field: "today" | "outlook", value: number) => {
    const next = updateGoalMaturity(goalMaturity, goalId, field, value);
    update({ strategicGoalMaturity: serializeStrategicGoalMaturity(next) });
  };

  const save = async (submit = false) => {
    const wasSubmitted = data.status === "SUBMITTED";
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/assessments/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...toAssessmentPayload(data as Assessment, submit),
          measureItems: measures
            .filter((m) => m.title.trim())
            .map(({ id, area, title, indicator, owner, dueDate, status }) => ({
              id,
              area,
              title,
              indicator,
              owner,
              dueDate: dueDate || null,
              status,
            })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Speichern fehlgeschlagen.");
      }
      const updated = await res.json();
      setData(updated);
      setMeasures(toDrafts(updated.measureItems));
      setMessage(submit ? (wasSubmitted ? "Aktualisierung eingereicht." : "Eingereicht.") : "Gespeichert.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  const disabled = readOnly;
  const prevSwotFilled = previous
    ? (Object.keys(previous.swot) as (keyof PreviousAssessment["swot"])[]).filter((k) => previous.swot[k].trim())
    : [];
  const takeOverSwot = () => {
    if (!previous) return;
    const filled = (["strengths", "gaps", "opportunities", "risks"] as const).some((k) => ((data[k] as string) ?? "").trim());
    if (filled && !window.confirm(`Die SWOT-Felder sind schon befüllt. Mit dem Stand aus ${previous.period} überschreiben?`)) return;
    update({ ...previous.swot });
  };
  const openPrevMeasures = (area: "SWOT" | "REIFEGRAD") =>
    (previous?.openMeasures ?? []).filter(
      (m) => (m.area === "REIFEGRAD" ? "REIFEGRAD" : "SWOT") === area && !measures.some((x) => x.title.trim() === m.title.trim())
    );
  const takeOverMeasures = (area: "SWOT" | "REIFEGRAD") =>
    setMeasures((cur) => [
      ...cur,
      ...openPrevMeasures(area).map((m) => ({
        key: newMeasureKey(),
        area,
        title: m.title,
        indicator: m.indicator,
        owner: m.owner,
        dueDate: m.dueDate,
        status: m.status as MeasureStatus,
      })),
    ]);
  const prevMeasuresButton = (area: "SWOT" | "REIFEGRAD") => {
    const n = openPrevMeasures(area).length;
    if (!previous || disabled || n === 0) return null;
    return (
      <PrevBar
        text={`${n} ${n === 1 ? "offene Massnahme" : "offene Massnahmen"} aus ${previous.period}. Übernehmen und Status nachführen.`}
        action={`Aus ${previous.period} übernehmen`}
        onClick={() => takeOverMeasures(area)}
      />
    );
  };
  const goalRef = (id: number): Reference | undefined => {
    const v = previous?.goalMaturity[String(id)];
    return v ? { value: v.outlook, label: `Prognose aus ${previous!.period}` } : undefined;
  };
  const matrixRef = (axis: "x" | "y"): Reference | undefined =>
    previous
      ? previous.matrix.outlook
        ? { value: previous.matrix.outlook[axis], label: `Prognose aus ${previous.period}` }
        : { value: previous.matrix.today[axis], label: `Ist ${previous.period}` }
      : undefined;
  const isSubmitted = data.status === "SUBMITTED";
  // Reifegrad-Prognose: solange nicht erfasst, gleich wie heute.
  const outlookX = data.matrixOutlookSet ? data.matrixXOutlook : data.matrixXToday;
  const outlookY = data.matrixOutlookSet ? data.matrixYOutlook : data.matrixYToday;
  const showAi = aiEnabled && !disabled;

  const requestSuggestions = (area: "SWOT" | "REIFEGRAD") => (existing: string[]) =>
    callAi<{ measures: { title: string; indicator: string; dueInMonths: number; begruendung: string }[] }>(
      "/api/ai/measures",
      {
        assessmentId: data.id,
        area,
        draft: {
          strengths: data.strengths,
          gaps: data.gaps,
          opportunities: data.opportunities ?? "",
          risks: data.risks,
          maturityNotes: data.maturityNotes,
          matrixNotes: data.matrixNotes,
          intern: data.matrixYToday,
          markt: data.matrixXToday,
          goals: goals.map((id) => ({ id, ...(goalMaturity[String(id)] ?? { today: 2, outlook: 2 }) })),
          existing,
        },
      }
    );

  return (
    <div className="space-y-6">
      <Section
        nr="01"
        title="Strategische Ziele."
        sub="Was aktuell verfolgt wird."
        intro="Ankreuzen, welche der zehn Ziele der CSPstrategie 2026+ das Team aktuell verfolgt."
      >
        <div className="grid gap-2 md:grid-cols-2">
          {STRATEGIC_GOALS.map((g) => {
            const checked = goals.includes(g.id);
            return (
              <label
                key={g.id}
                className={`flex cursor-pointer gap-3 rounded-2xl p-4 transition ${
                  checked ? "bg-white ring-2 ring-inset ring-csp-ink" : "bg-white/60 hover:bg-white"
                } ${disabled ? "cursor-default" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleGoal(g.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-csp-ink"
                />
                <span className="text-[14px] font-semibold leading-snug text-csp-text">
                  <span className="font-extrabold text-csp-ink">{g.id}. {g.short}</span>
                  {previous?.goals.includes(g.id) && (
                    <span className="ml-2 inline-block rounded-full bg-csp-sand px-2 py-0.5 align-middle text-[11px] font-bold text-csp-grau">
                      in {previous.period} gewählt
                    </span>
                  )}
                  <br />
                  {g.label}
                </span>
              </label>
            );
          })}
        </div>
      </Section>

      <Section
        nr="02"
        title="Zielerreichung."
        sub="Heute und in sechs Monaten."
        intro={
          <>
            Pro ausgewähltem Ziel den heutigen Stand ({data.period.label}) und die Prognose für{" "}
            {outlookPeriod} einschätzen. Skala 1 = {GOAL_SCALE_ENDS.min} bis 5 = {GOAL_SCALE_ENDS.max};
            die Stufen folgen dem Reifegradmodell (Mouse-over zeigt die Beschreibung).
          </>
        }
      >
        {goals.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-[14px] font-bold">
            <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-csp-blau align-middle" />
            Zuerst mindestens ein strategisches Ziel ankreuzen.
          </p>
        ) : (
          <div className="space-y-3">
            {STRATEGIC_GOALS.filter((g) => goals.includes(g.id)).map((g) => {
              const m = goalMaturity[String(g.id)] ?? { today: 2, outlook: 2 };
              return (
                <div key={g.id} className="rounded-[22px] bg-white p-5">
                  <p className="text-[15px] font-extrabold leading-snug">
                    {g.id}. {g.short}
                    <span className="block text-[13.5px] font-semibold text-csp-grau">{g.label}</span>
                  </p>
                  <div className="mt-4 grid gap-5 lg:grid-cols-2">
                    <GoalScalePicker
                      label={`Heute · ${data.period.label}`}
                      value={m.today}
                      onChange={(v) => setMaturity(g.id, "today", v)}
                      disabled={disabled}
                      reference={goalRef(g.id)}
                    />
                    <GoalScalePicker
                      label={`Prognose +6 Monate · ${outlookPeriod}`}
                      value={m.outlook}
                      onChange={(v) => setMaturity(g.id, "outlook", v)}
                      disabled={disabled}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <TextArea
          className="mt-6"
          label="Erläuterung und Hebel zur Strategieentwicklung"
          value={data.maturityNotes}
          onChange={(v) => update({ maturityNotes: v })}
          disabled={disabled}
          rows={3}
        />
        {showAi && (
          <AiTextButton
            label="Erläuterung und Hebel zur Strategieentwicklung"
            text={data.maturityNotes}
            team={data.team.name}
            onApply={(v) => update({ maturityNotes: v })}
          />
        )}
      </Section>

      <Section nr="03" title="SWOT-Analyse." sub="Innen und aussen." intro={SWOT_INTRO}>
        {previous && !disabled && prevSwotFilled.length > 0 && (
          <PrevBar
            text={`${previous.period} hat eine SWOT. Übernehmen und anpassen, was noch gilt.`}
            action={`Aus ${previous.period} übernehmen`}
            onClick={takeOverSwot}
          />
        )}
        {showAi && (
          <SwotAi
            assessmentId={data.id}
            values={{
              strengths: data.strengths,
              gaps: data.gaps,
              opportunities: data.opportunities ?? "",
              risks: data.risks,
            }}
            onApply={(patch) => update(patch)}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(SWOT_FIELDS) as (keyof typeof SWOT_FIELDS)[]).map((key) => {
            const f = SWOT_FIELDS[key];
            return (
              <TextArea
                key={key}
                label={`${f.label} (${f.letter})`}
                placeholder={f.hint}
                value={(data[key] as string | undefined) ?? ""}
                onChange={(v) => update({ [key]: v } as Partial<AssessmentWithMeta>)}
                disabled={disabled}
                rows={4}
              />
            );
          })}
        </div>
        <div className="mt-8">
          <p className="label mb-1">Massnahmen aus der SWOT</p>
          <p className="nebentext mb-3">
            Konkret und überprüfbar: Was wird getan, woran wird der Erfolg gemessen, wer ist verantwortlich, bis wann.
          </p>
          {prevMeasuresButton("SWOT")}
          <MeasureEditor
            area="SWOT"
            measures={measures}
            onChange={setMeasures}
            disabled={disabled}
            aiEnabled={aiEnabled}
            requestSuggestions={requestSuggestions("SWOT")}
          />
          {data.measures && (
            <TextArea
              className="mt-5"
              label="Weitere Massnahmen (Freitext aus früherer Version)"
              value={data.measures}
              onChange={(v) => update({ measures: v })}
              disabled={disabled}
              rows={3}
            />
          )}
        </div>
      </Section>

      <Section nr="04" title="Reifegrad." sub="Intern und Markt." intro={MATURITY_INTRO}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-6">
            <p className="label mb-0">Heute · {data.period.label}</p>
            <TenScalePicker
              label="Intern (Y-Achse)"
              value={data.matrixYToday}
              onChange={(v) => update({ matrixYToday: v })}
              disabled={disabled}
              reference={matrixRef("y")}
            />
            <TenScalePicker
              label="Markt (X-Achse)"
              value={data.matrixXToday}
              onChange={(v) => update({ matrixXToday: v })}
              disabled={disabled}
              reference={matrixRef("x")}
            />
            <div className="border-t border-csp-linie pt-5">
              <p className="label mb-0">Prognose +6 Monate · {outlookPeriod}</p>
              {!data.matrixOutlookSet && (
                <p className="nebentext mb-3">Startet mit dem heutigen Wert. Anpassen, wenn sich etwas ändern soll.</p>
              )}
            </div>
            <TenScalePicker
              label="Intern (Y-Achse) in 6 Monaten"
              value={outlookY}
              onChange={(v) => update({ matrixYOutlook: v, matrixXOutlook: outlookX, matrixOutlookSet: true })}
              disabled={disabled}
            />
            <TenScalePicker
              label="Markt (X-Achse) in 6 Monaten"
              value={outlookX}
              onChange={(v) => update({ matrixXOutlook: v, matrixYOutlook: outlookY, matrixOutlookSet: true })}
              disabled={disabled}
            />
          </div>
          <div className="rounded-[22px] bg-white p-4">
            {!disabled && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] font-bold text-csp-grau">
                <span>Klick in die Matrix setzt</span>
                <div className="inline-flex rounded-full bg-csp-sand/70 p-1">
                  {(["heute", "prognose"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPickMode(m)}
                      className={`rounded-full px-3 py-1 ${pickMode === m ? "bg-csp-ink text-white" : "hover:text-csp-ink"}`}
                    >
                      {m === "heute" ? "Heute" : "Prognose"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <PositioningMatrix
              forecastLabels
              reference={
                previous
                  ? { period: previous.period, today: previous.matrix.today, outlook: previous.matrix.outlook ?? undefined }
                  : undefined
              }
              points={[
                {
                  id: data.id,
                  label: data.team.name,
                  x: data.matrixXToday,
                  y: data.matrixYToday,
                  color: categoryColor(category),
                  detail: data.period.label,
                  forecast: { x: outlookX, y: outlookY },
                },
              ]}
              onPick={
                disabled
                  ? undefined
                  : (x, y) =>
                      pickMode === "heute"
                        ? update({ matrixXToday: x, matrixYToday: y })
                        : update({ matrixXOutlook: x, matrixYOutlook: y, matrixOutlookSet: true })
              }
            />
          </div>
        </div>
        <div className="mt-8">
          <p className="label mb-1">
            Welche Massnahmen trifft das Team, um den internen und externen Reifegrad in einem Jahr um mindestens
            einen Punkt zu erhöhen?
          </p>
          <div className="mt-3">
            {prevMeasuresButton("REIFEGRAD")}
            <MeasureEditor
              area="REIFEGRAD"
              measures={measures}
              onChange={setMeasures}
              disabled={disabled}
              aiEnabled={aiEnabled}
              requestSuggestions={requestSuggestions("REIFEGRAD")}
            />
          </div>
        </div>
        <TextArea
          className="mt-6"
          label="Erläuterung zum Reifegrad"
          value={data.matrixNotes}
          onChange={(v) => update({ matrixNotes: v })}
          disabled={disabled}
          rows={3}
        />
        {showAi && (
          <AiTextButton
            label="Erläuterung zum Reifegrad"
            text={data.matrixNotes}
            team={data.team.name}
            onApply={(v) => update({ matrixNotes: v })}
          />
        )}
      </Section>

      {!readOnly && (
        <div className="no-print sticky bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-full bg-white/95 p-2 shadow-[0_8px_30px_rgba(20,20,19,0.12)] ring-1 ring-csp-linie backdrop-blur sm:w-max">
          <span className="pl-2">
            <StatusPill status={data.status} />
          </span>
          {!isSubmitted && (
            <button type="button" onClick={() => save(false)} disabled={saving} className="btn-sekundaer">
              {saving ? "Speichern…" : "Entwurf speichern"}
            </button>
          )}
          <button type="button" onClick={() => save(true)} disabled={saving} className="btn-primaer">
            {saving ? "Wird eingereicht…" : isSubmitted ? "Aktualisierung einreichen" : "Einreichen"}
          </button>
          {isSubmitted && (
            <Link href={`/factsheet/${data.id}?nach=einreichen`} className="btn-primaer bg-csp-blau hover:bg-csp-blau/90">
              <IconFile />
              Factsheet anzeigen
            </Link>
          )}
          {message && <p className="px-3 text-[13px] font-bold text-csp-grau">{message}</p>}
        </div>
      )}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  disabled,
  rows = 3,
  className = "",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows?: number;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-2 block">{label}</span>
      <textarea
        className="eingabe"
        rows={rows}
        value={value}
        placeholder={disabled ? undefined : placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Hinweis mit Übernehmen-Button für Inhalte aus der Vorperiode. */
function PrevBar({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-csp-sand/70 px-4 py-3">
      <span className="text-[13.5px] font-semibold text-csp-grau">{text}</span>
      <button type="button" className="btn-sekundaer bg-white" onClick={onClick}>
        {action}
      </button>
    </div>
  );
}
