import {
  STRATEGIC_GOALS,
  parseStrategicGoals,
  getMaturityLabel,
  formatTeamCategory,
} from "@/lib/constants";
import { parseStrategicGoalMaturity } from "@/lib/strategic-maturity";
import type { Assessment, Team, Period } from "@prisma/client";

type AssessmentView = Assessment & {
  team: Team;
  period: Period;
  strategicGoalMaturity?: string;
  opportunities?: string;
};

type Props = {
  assessment: AssessmentView;
};

export function FactsheetView({ assessment }: Props) {
  const goals = parseStrategicGoals(assessment.strategicGoals);
  const goalMaturity = parseStrategicGoalMaturity(assessment.strategicGoalMaturity ?? "{}");

  const selectedGoals = STRATEGIC_GOALS.filter((g) => goals.includes(g.id));

  return (
    <article className="space-y-6 rounded-xl border bg-white p-8 shadow-sm print:shadow-none">
      <header className="border-b pb-4">
        <p className="text-sm text-csp-cyan">CSP Strategie 2026+ · Factsheet</p>
        <h1 className="mt-1 text-2xl font-bold text-csp-navy">{assessment.team.name}</h1>
        <p className="text-gray-600">
          {assessment.period.label} · {formatTeamCategory(assessment.team.category)} · Status:{" "}
          {assessment.status === "SUBMITTED" ? "Eingereicht" : "Entwurf"}
        </p>
      </header>

      {selectedGoals.length > 0 && (
        <section>
          <h2 className="font-semibold text-csp-navy">Strategische Ziele (CSP 2026+)</h2>
          <p className="mt-1 text-sm text-gray-500">Aktuell verfolgte strategische Ziele</p>
          <ul className="mt-2 list-inside list-disc text-sm">
            {selectedGoals.map((g) => (
              <li key={g.id}>
                <strong>{g.id}.</strong> {g.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-csp-navy">Einschätzung Erreichung strategische Ziele</h2>
        <p className="mt-1 text-sm text-gray-600">
          Selbstdeklaration des aktuellen Stands Zielerreichung strategische Ziele (CSP 2026+) inkl.
          Ausblick +6 Monate — je oben ausgewähltem strategischen Ziel muss eine Bewertung zwischen
          1, nicht erreicht und 5, erreicht abgegeben werden.
        </p>
        {selectedGoals.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Keine Ziele ausgewählt.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {selectedGoals.map((g) => {
              const m = goalMaturity[String(g.id)] ?? { today: 2, outlook: 2 };
              return (
                <li
                  key={g.id}
                  className="rounded-lg bg-csp-cyan/5 px-3 py-2 text-sm"
                >
                  <strong>Ziel {g.id}:</strong> {g.label}
                  <br />
                  <span className="text-gray-600">
                    Heute: {getMaturityLabel(m.today)} · +6 Monate: {getMaturityLabel(m.outlook)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {assessment.maturityNotes && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{assessment.maturityNotes}</p>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-csp-navy">SWOT Analyse</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Block title="Stärken (S)" text={assessment.strengths} />
          <Block title="Schwächen (W)" text={assessment.gaps} />
          <Block title="Chancen (O)" text={assessment.opportunities ?? ""} />
          <Block title="Risiken / Bedrohungen (T)" text={assessment.risks} />
        </div>
        {assessment.measures && (
          <div className="mt-4">
            <h3 className="font-semibold text-csp-navy">Massnahmen</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm">{assessment.measures}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-csp-navy">Selbstdeklaration Reifegrad</h2>
        <p className="mt-1 text-sm text-gray-600">
          Selbstdeklaration Intern soll im Vergleich zu den anderen Circles bzgl. Kompetenzen
          Personen, Rekrutierungsfähigkeit, Akquisekompetenz und Substanz vorgenommen werden. Die
          Selbstdeklaration Markt soll im Vergleich zu den direkten Konkurrenten,
          Marktattraktivität, Leistungsportfolio, Marktstellung und Marktanteile erfolgen.
        </p>
        <div className="mt-4">
          <PositioningMatrix intern={assessment.matrixYToday} markt={assessment.matrixXToday} />
        </div>
        {assessment.matrixNotes && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-csp-navy">
              Massnahmen zur Erhöhung des Reifegrads
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Welche Massnahmen trifft der Circle, um den internen und externen Reifegrad in einem
              Jahr um mindestens einen Punkt zu erhöhen
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{assessment.matrixNotes}</p>
          </div>
        )}
      </section>

      <footer className="border-t pt-4 text-xs text-gray-400">
        CSP AG · Strategie-Zyklus 2026–2028 · Generiert am{" "}
        {new Date(assessment.updatedAt).toLocaleDateString("de-CH")}
      </footer>
    </article>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="font-semibold text-csp-navy">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm">{text}</p>
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
