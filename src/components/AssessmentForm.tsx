"use client";

import {
  STRATEGIC_GOALS,
  parseStrategicGoals,
  formatTeamCategory,
} from "@/lib/constants";
import {
  parseStrategicGoalMaturity,
  pruneGoalMaturity,
  serializeStrategicGoalMaturity,
  updateGoalMaturity,
} from "@/lib/strategic-maturity";
import type { Assessment } from "@prisma/client";
import type { Team, Period } from "@prisma/client";
import { toAssessmentPayload } from "@/lib/assessment-payload";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AssessmentWithMeta = Assessment & {
  team: Team;
  period: Period;
  strategicGoalMaturity?: string;
  opportunities?: string;
};

type Props = {
  assessment: AssessmentWithMeta;
  readOnly?: boolean;
};

function ScaleInput({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-8 text-center font-semibold text-csp-cyan">{value}</span>
      </div>
    </label>
  );
}

export function AssessmentForm({ assessment, readOnly = false }: Props) {
  const router = useRouter();
  const [data, setData] = useState(assessment);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const goals = parseStrategicGoals(data.strategicGoals);
  const goalMaturity = parseStrategicGoalMaturity(data.strategicGoalMaturity ?? "{}");

  const update = (patch: Partial<AssessmentWithMeta>) =>
    setData((prev) => ({ ...prev, ...patch }));

  const toggleGoal = (id: number) => {
    const nextGoals = goals.includes(id)
      ? goals.filter((g) => g !== id)
      : [...goals, id].sort((a, b) => a - b);
    const pruned = pruneGoalMaturity(goalMaturity, nextGoals);
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
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/assessments/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toAssessmentPayload(data as Assessment, submit)),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen");
      const updated = await res.json();
      setData(updated);
      setMessage(submit ? "Eingereicht." : "Gespeichert.");
      router.refresh();
    } catch {
      setMessage("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  const disabled = readOnly;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-csp-navy">Selbstdeklaration</h2>
        <p className="mt-1 text-sm text-gray-500">
          {data.team.name} · {formatTeamCategory(data.team.category)} · {data.period.label}
        </p>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-csp-navy">Strategische Ziele (CSP 2026+)</h2>
        <p className="mt-2 text-sm text-gray-600">
          Ankreuzen, welche strategischen Ziele aktuell verfolgt werden
        </p>
        <div className="mt-4 space-y-2">
          {STRATEGIC_GOALS.map((g) => (
            <label key={g.id} className="flex cursor-pointer gap-2 rounded-md p-2 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={goals.includes(g.id)}
                disabled={disabled}
                onChange={() => toggleGoal(g.id)}
                className="mt-1"
              />
              <span className="text-sm">
                <strong>{g.id}.</strong> {g.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-csp-navy">
          Einschätzung Erreichung strategische Ziele
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Selbstdeklaration des aktuellen Stands Zielerreichung strategische Ziele (CSP 2026+) inkl.
          Ausblick +6 Monate — je oben ausgewähltem strategischen Ziel muss eine Bewertung zwischen
          1, nicht erreicht und 5, erreicht abgegeben werden.
        </p>

        {goals.length === 0 ? (
          <p className="mt-4 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
            Bitte zuerst mindestens ein strategisches Ziel oben ankreuzen.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {STRATEGIC_GOALS.filter((g) => goals.includes(g.id)).map((g) => {
              const m = goalMaturity[String(g.id)] ?? { today: 2, outlook: 2 };
              return (
                <div key={g.id} className="rounded-lg border border-csp-cyan/25 bg-white p-4">
                  <p className="text-sm font-medium text-csp-navy">
                    <strong>Ziel {g.id}:</strong> {g.label}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ScaleInput
                      label="Heute"
                      value={m.today}
                      onChange={(v) => setMaturity(g.id, "today", v)}
                      disabled={disabled}
                    />
                    <ScaleInput
                      label="+6 Monate"
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
          className="mt-4"
          label="Erläuterung / Hebel zur Strategieentwicklung"
          value={data.maturityNotes}
          onChange={(v) => update({ maturityNotes: v })}
          disabled={disabled}
          rows={3}
        />
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-csp-navy">SWOT Analyse</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextArea
            label="Stärken (S)"
            value={data.strengths}
            onChange={(v) => update({ strengths: v })}
            disabled={disabled}
            rows={4}
          />
          <TextArea
            label="Schwächen (W)"
            value={data.gaps}
            onChange={(v) => update({ gaps: v })}
            disabled={disabled}
            rows={4}
          />
          <TextArea
            label="Chancen (O)"
            value={data.opportunities ?? ""}
            onChange={(v) => update({ opportunities: v })}
            disabled={disabled}
            rows={4}
          />
          <TextArea
            label="Risiken / Bedrohungen (T)"
            value={data.risks}
            onChange={(v) => update({ risks: v })}
            disabled={disabled}
            rows={4}
          />
          <TextArea
            label="Massnahmen"
            value={data.measures}
            onChange={(v) => update({ measures: v })}
            disabled={disabled}
            rows={5}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-csp-navy">Selbstdeklaration Reifegrad</h2>
        <p className="mt-2 text-sm text-gray-600">
          Selbstdeklaration Intern soll im Vergleich zu den anderen Circles bzgl. Kompetenzen
          Personen, Rekrutierungsfähigkeit, Akquisekompetenz und Substanz vorgenommen werden. Die
          Selbstdeklaration Markt soll im Vergleich zu den direkten Konkurrenten,
          Marktattraktivität, Leistungsportfolio, Marktstellung und Marktanteile erfolgen.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ScaleInput
            label="Intern (Y-Achse)"
            value={data.matrixYToday}
            onChange={(v) => update({ matrixYToday: v })}
            min={1}
            max={10}
            disabled={disabled}
          />
          <ScaleInput
            label="Markt (X-Achse)"
            value={data.matrixXToday}
            onChange={(v) => update({ matrixXToday: v })}
            min={1}
            max={10}
            disabled={disabled}
          />
        </div>
        <div className="mt-4">
          <PositioningMatrix intern={data.matrixYToday} markt={data.matrixXToday} />
        </div>
        <TextArea
          className="mt-4"
          label="Welche Massnahmen trifft der Circle, um den internen und externen Reifegrad in einem Jahr um mindestens einen Punkt zu erhöhen"
          value={data.matrixNotes}
          onChange={(v) => update({ matrixNotes: v })}
          disabled={disabled}
          rows={4}
        />
      </section>

      {!readOnly && (
        <div className="no-print flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving || disabled}
            className="rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Entwurf speichern"}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving || disabled}
            className="rounded-md bg-csp-cyan px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            Einreichen
          </button>
          {message && <p className="self-center text-sm text-gray-600">{message}</p>}
        </div>
      )}
    </div>
  );
}

function PositioningMatrix({
  intern,
  markt,
}: {
  intern: number;
  markt: number;
}) {
  const size = 320;
  const pad = 36;
  const plot = size - pad * 2;
  const toX = (v: number) => pad + ((v - 1) / 9) * plot;
  const toY = (v: number) => pad + plot - ((v - 1) / 9) * plot;

  return (
    <div className="rounded-xl border bg-gray-50 p-3">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-sm">
        <rect x={pad} y={pad} width={plot} height={plot} fill="white" stroke="#cbd5e1" />
        {[3, 5, 7, 9].map((i) => (
          <g key={i}>
            <line
              x1={toX(i)}
              y1={pad}
              x2={toX(i)}
              y2={pad + plot}
              stroke="#e2e8f0"
              strokeDasharray="3"
            />
            <line
              x1={pad}
              y1={toY(i)}
              x2={pad + plot}
              y2={toY(i)}
              stroke="#e2e8f0"
              strokeDasharray="3"
            />
          </g>
        ))}
        <text x={pad + plot / 2} y={size - 8} textAnchor="middle" className="fill-gray-600 text-[11px]">
          Markt (X)
        </text>
        <text
          x={12}
          y={pad + plot / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${pad + plot / 2})`}
          className="fill-gray-600 text-[11px]"
        >
          Intern (Y)
        </text>
        <circle cx={toX(markt)} cy={toY(intern)} r={7} fill="#0093D3" />
      </svg>
      <p className="mt-2 text-xs text-gray-600">
        Aktuelle Position: Intern {intern} / Markt {markt}
      </p>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <textarea
        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
