import {
  MATURITY_INTRO,
  STRATEGIC_GOALS,
  SWOT_FIELDS,
  formatTeamCategory,
  getMaturityLabel,
  parseStrategicGoals,
} from "@/lib/constants";
import { parseStrategicGoalMaturity } from "@/lib/strategic-maturity";
import { getOutlookPeriodLabel } from "@/lib/period-labels";
import { MEASURE_AREA, MEASURE_STATUS, type MeasureStatus } from "@/lib/measure-labels";
import { PositioningMatrix } from "@/components/charts/PositioningMatrix";
import type { Assessment, Measure, Period, Team } from "@prisma/client";
import { PRINT_LOGO_DATA_URI } from "@/lib/print-logo";

const FUSS = "font: 7.5pt/10pt Verdana, Geneva, sans-serif; color: #0d0d0d; vertical-align: bottom; padding-bottom: 7mm;";

/** Seitenränder und Fusszeile der Word-Vorlage (Tabstopps 96.5 mm und 140 mm, Logo im linken Rand). */
function pageCss(documentName: string): string {
  return `
@page {
  size: A4;
  margin: 14mm 19mm 24mm 49mm;
  @bottom-left-corner { content: url("${PRINT_LOGO_DATA_URI}"); vertical-align: bottom; padding-bottom: 6mm; }
  @bottom-left { content: "www.csp-ag.ch"; ${FUSS} width: 96.5mm; }
  @bottom-center { content: ${JSON.stringify(documentName)}; ${FUSS} text-align: left; width: 35.5mm; white-space: nowrap; }
  @bottom-right { content: counter(page); ${FUSS} text-align: right; width: 10mm; }
}
@page :first {
  @bottom-left {
    content: "CSP AG St.Gallen | Bern | Zürich | Basel\\A Teufener Strasse 5, 9000 St. Gallen\\A +41 71 231 10 60 · www.csp-ag.ch";
    white-space: pre; width: 132mm;
  }
  @bottom-center { content: none; }
  @bottom-right { content: none; }
}`;
}

/**
 * Drucklayout des Factsheets nach der CSP-AG-Word-Vorlage (Offerten/Berichte):
 * Verdana 9 pt, Seitenränder 14/19/24/49 mm, Fliesstext 20 mm eingezogen, Kapitelnummern hängend,
 * Kapiteltitel 28 pt CSP-Blau auf neuer Seite, Fusszeile mit CSP-Logo und Seitenzahl (siehe globals.css).
 * Nur im Druck sichtbar.
 */

type Props = {
  assessment: Assessment & { team: Team; period: Period; measureItems: Measure[] };
};

function lines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[-–•*]\s*/, "").trim())
    .filter(Boolean);
}

const dateCh = (d: Date) => d.toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });

export function FactsheetPrint({ assessment }: Props) {
  const goals = parseStrategicGoals(assessment.strategicGoals);
  const maturity = parseStrategicGoalMaturity(assessment.strategicGoalMaturity ?? "{}");
  const selected = STRATEGIC_GOALS.filter((g) => goals.includes(g.id));
  const category = formatTeamCategory(assessment.team.category);
  const period = assessment.period.label;
  const outlook = getOutlookPeriodLabel(period);
  const measures = assessment.measureItems;
  let tableNr = 0;

  return (
    <div className="druck">
      <style>{pageCss(`${assessment.team.name} · ${period}`)}</style>
      {/* Titelseite */}
      <section className="druck-titelseite">
        <h1 className="druck-berichtstitel">
          Strategie-Check
          <br />
          {assessment.team.name}
        </h1>
        <p className="druck-untertitel2">
          {category} · {period}
        </p>
        <p className="druck-adresse">
          CSPstrategie 2026+
          <br />
          Strategie-Zyklus 2026–2028
        </p>
        <p className="druck-adresse druck-abstand">
          Status: {assessment.status === "SUBMITTED" ? "Eingereicht" : "Entwurf"}
          {assessment.submittedAt ? ` am ${dateCh(assessment.submittedAt)}` : ""}
          {assessment.updatedBy ? (
            <>
              <br />
              Zuletzt bearbeitet von {assessment.updatedBy}
            </>
          ) : null}
        </p>
        <p className="druck-adresse druck-abstand">{dateCh(assessment.updatedAt)}</p>
        <h2 className="druck-untertitel2 druck-abstand-gross">Vertraulichkeit</h2>
        <p className="druck-adresse">
          Internes Dokument der CSP AG. Die Selbsteinschätzung dient der Strategiearbeit und ist nicht für die
          Weitergabe an Dritte bestimmt.
        </p>
      </section>

      {/* 1 Zielerreichung */}
      <h1 className="druck-h1" data-nr="1">Zielerreichung</h1>
      <p>
        Selbsteinschätzung des Stands der strategischen Ziele (CSPstrategie 2026+) in der Periode {period} und
        Prognose für {outlook}. Skala 1 (nicht erreicht) bis 5 (erreicht), benannt nach dem Reifegradmodell.
      </p>
      {selected.length === 0 ? (
        <p>Es wurden keine strategischen Ziele ausgewählt.</p>
      ) : (
        <>
          <p className="druck-tabellentitel">
            Tabelle {++tableNr}: Zielerreichung {period} und Prognose {outlook}
          </p>
          <table className="druck-tabelle">
            <thead>
              <tr>
                <th style={{ width: "8mm" }}>Nr.</th>
                <th>Strategisches Ziel</th>
                <th style={{ width: "24mm" }}>Heute</th>
                <th style={{ width: "24mm" }}>Prognose</th>
                <th style={{ width: "11mm" }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {selected.map((g) => {
                const m = maturity[String(g.id)] ?? { today: 2, outlook: 2 };
                const d = m.outlook - m.today;
                return (
                  <tr key={g.id}>
                    <td>{g.id}</td>
                    <td>
                      <strong>{g.short}</strong>
                      <br />
                      {g.label}
                    </td>
                    <td>
                      {m.today} · {getMaturityLabel(m.today)}
                    </td>
                    <td>
                      {m.outlook} · {getMaturityLabel(m.outlook)}
                    </td>
                    <td>{d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "±0"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
      {assessment.maturityNotes && (
        <>
          <h2 className="druck-h2" data-nr="1.1">Erläuterung und Hebel</h2>
          <Prose text={assessment.maturityNotes} />
        </>
      )}

      {/* 2 SWOT */}
      <h1 className="druck-h1" data-nr="2">SWOT-Analyse</h1>
      <p>
        Stärken und Schwächen beschreiben die Lage im Team, Chancen und Risiken das Umfeld (Markt, Kundschaft,
        Konkurrenz, Technologie).
      </p>
      {(Object.keys(SWOT_FIELDS) as (keyof typeof SWOT_FIELDS)[]).map((key, i) => {
        const items = lines((assessment[key] as string) ?? "");
        return (
          <div key={key}>
            <h2 className="druck-h2" data-nr={`2.${i + 1}`}>
              {SWOT_FIELDS[key].label}
            </h2>
            {items.length === 0 ? (
              <p>Keine Angaben.</p>
            ) : (
              <ul className="druck-aufzaehlung">
                {items.map((t, j) => (
                  <li key={j}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {/* 3 Massnahmen */}
      <h1 className="druck-h1" data-nr="3">Massnahmen</h1>
      <p>
        Massnahmen aus SWOT-Analyse und Reifegrad. Überprüfbar ist eine Massnahme, wenn Erfolgskriterium,
        Verantwortung und Termin festgelegt sind.
      </p>
      {measures.length > 0 && (
        <>
          <p className="druck-tabellentitel">Tabelle {++tableNr}: Massnahmen und Stand der Umsetzung</p>
          <table className="druck-tabelle">
            <thead>
              <tr>
                <th style={{ width: "8mm" }}>Nr.</th>
                <th>Massnahme</th>
                <th>Erfolgskriterium</th>
                <th style={{ width: "24mm" }}>Verantwortung</th>
                <th style={{ width: "19mm" }}>Termin</th>
                <th style={{ width: "17mm" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {measures.map((m, i) => (
                <tr key={m.id}>
                  <td>{i + 1}</td>
                  <td>
                    {m.title}
                    <br />
                    <span className="druck-klein">{MEASURE_AREA[m.area as keyof typeof MEASURE_AREA]}</span>
                  </td>
                  <td>{m.indicator || "–"}</td>
                  <td>{m.owner || "–"}</td>
                  <td>{m.dueDate ? m.dueDate.toLocaleDateString("de-CH") : "–"}</td>
                  <td>{MEASURE_STATUS[m.status as MeasureStatus] ?? m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {assessment.measures && (
        <>
          <h2 className="druck-h2" data-nr="3.1">Weitere Massnahmen</h2>
          <Prose text={assessment.measures} />
        </>
      )}
      {measures.length === 0 && !assessment.measures && <p>Es wurden keine Massnahmen erfasst.</p>}

      {/* 4 Reifegrad */}
      <h1 className="druck-h1" data-nr="4">Reifegrad</h1>
      <p>{MATURITY_INTRO}</p>
      <p>
        <strong>Intern: {assessment.matrixYToday} von 10</strong> · <strong>Markt: {assessment.matrixXToday} von 10</strong>
      </p>
      <p className="druck-tabellentitel">Abbildung 1: Positionierung {assessment.team.name}, {period}</p>
      <div className="druck-abbildung">
        <PositioningMatrix
          points={[
            {
              id: assessment.id,
              label: assessment.team.name,
              x: assessment.matrixXToday,
              y: assessment.matrixYToday,
              color: "#0093D3",
            },
          ]}
        />
      </div>
      {assessment.matrixNotes && (
        <>
          <h2 className="druck-h2" data-nr="4.1">Erläuterung zum Reifegrad</h2>
          <Prose text={assessment.matrixNotes} />
        </>
      )}
    </div>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} style={{ whiteSpace: "pre-wrap" }}>
            {p}
          </p>
        ))}
    </>
  );
}
