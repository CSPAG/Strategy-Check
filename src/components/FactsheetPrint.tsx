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
import type { FactsheetContext } from "@/lib/factsheet-context";

const FUSS =
  "font: 7.5pt/10pt Verdana, Geneva, sans-serif; color: #0093d3; vertical-align: bottom; padding-bottom: 7mm;";

/** Dokumentname — auch Titel der Seite und damit Dateiname beim Speichern als PDF. */
export function factsheetDocumentName(teamName: string): string {
  return `${teamName} Factsheet Strategie-Check`;
}

/**
 * Seitenränder und Fusszeile nach der CSP-AG-Word-Vorlage:
 * Seite 1 mit Adressblock, darunter Logo, Dokumentname und Seitenzahl; Folgeseiten nur Logo und Dokumentname.
 * Leere Kopfzeilen-Boxen unterdrücken die Browser-Kopfzeile (Datum, Titel).
 */
function pageCss(documentName: string): string {
  const name = JSON.stringify(documentName).slice(1, -1);
  return `
@page {
  size: A4;
  margin: 14mm 19mm 24mm 49mm;
  @top-left { content: ""; }
  @top-center { content: ""; }
  @top-right { content: ""; }
  @bottom-left-corner { content: url("${PRINT_LOGO_DATA_URI}"); vertical-align: bottom; padding-bottom: 6mm; }
  @bottom-left { content: "\\00a0 \\00a0 \\00a0 ${name}"; ${FUSS} width: 132mm; white-space: nowrap; }
  @bottom-center { content: none; }
  @bottom-right { content: none; }
}
@page :first {
  margin-bottom: 62mm;
  @bottom-left {
    content: "CSP AG\\A St.Gallen | Bern | Zürich | Basel\\A \\A Teufener Strasse 5\\A 9000 St. Gallen\\A +41 71 231 10 60\\A www.csp-ag.ch\\A \\A \\A \\00a0 \\00a0 \\00a0 ${name}";
    white-space: pre; width: 122mm;
  }
  @bottom-right { content: counter(page); ${FUSS} text-align: right; width: 10mm; }
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
  context?: FactsheetContext;
};

function lines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[-–•*]\s*/, "").trim())
    .filter(Boolean);
}

const dateCh = (d: Date) => d.toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });

export function FactsheetPrint({ assessment, context }: Props) {
  const prev = context?.previous ?? null;
  const summary = context?.summary?.data ?? null;
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
      <style>{pageCss(factsheetDocumentName(assessment.team.name))}</style>
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
      {/* Management Summary (KI) */}
      <h1 className="druck-h1" data-nr="">Management Summary</h1>
      {summary ? (
        <>
          <p>{summary.managementSummary}</p>
          <h2 className="druck-h2" data-nr="">Kernpunkte</h2>
          <Bullets items={summary.kernpunkte} />
          <h2 className="druck-h2" data-nr="">Empfehlungen</h2>
          <Bullets items={summary.empfehlungen} />
          <p className="druck-klein">
            KI-generiert (OpenAI) auf Basis dieser Abgabe und der Vorperiode — zur Diskussion, nicht als Bewertung.
          </p>
        </>
      ) : (
        <p>Für diese Abgabe liegt noch keine KI-Auswertung vor. Sie entsteht automatisch beim Einreichen.</p>
      )}

      <h1 className="druck-h1" data-nr="1">Zielerreichung</h1>
      <KiNote text={summary?.kapitel.ziele} />
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
                {prev && <th style={{ width: "15mm" }}>{prev.period}</th>}
                <th style={{ width: "22mm" }}>Heute</th>
                <th style={{ width: "22mm" }}>Prognose</th>
                <th style={{ width: "10mm" }}>Δ</th>
                {prev && <th style={{ width: "22mm" }}>Prognose-Check</th>}
              </tr>
            </thead>
            <tbody>
              {selected.map((g) => {
                const m = maturity[String(g.id)] ?? { today: 2, outlook: 2 };
                const d = m.outlook - m.today;
                const p = prev?.goals[String(g.id)];
                const miss = p ? m.today - p.outlook : 0;
                return (
                  <tr key={g.id}>
                    <td>{g.id}</td>
                    <td>
                      <strong>{g.short}</strong>
                      <br />
                      {g.label}
                    </td>
                    {prev && <td>{p ? p.today : "–"}</td>}
                    <td>
                      {m.today} · {getMaturityLabel(m.today)}
                    </td>
                    <td>
                      {m.outlook} · {getMaturityLabel(m.outlook)}
                    </td>
                    <td>{d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "±0"}</td>
                    {prev && (
                      <td>
                        {p ? (
                          <>
                            Prognose {p.outlook}, Ist {m.today}
                            <br />
                            <span className="druck-klein">
                              {miss === 0 ? "getroffen" : miss > 0 ? `übertroffen (+${miss})` : `verfehlt (−${-miss})`}
                            </span>
                          </>
                        ) : (
                          "–"
                        )}
                      </td>
                    )}
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
      <KiNote text={summary?.kapitel.swot} />
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
      <KiNote text={summary?.kapitel.massnahmen} />
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
      <KiNote text={summary?.kapitel.reifegrad} />
      <p>{MATURITY_INTRO}</p>
      <p>
        <strong>Intern: {assessment.matrixYToday} von 10</strong> · <strong>Markt: {assessment.matrixXToday} von 10</strong>
        {assessment.matrixOutlookSet && (
          <>
            <br />
            Prognose für {outlook}: Intern {assessment.matrixYOutlook} · Markt {assessment.matrixXOutlook}
          </>
        )}
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
              forecast: assessment.matrixOutlookSet
                ? { x: assessment.matrixXOutlook, y: assessment.matrixYOutlook }
                : undefined,
              trail: prev ? [{ x: prev.markt, y: prev.intern, period: prev.period }] : undefined,
            },
          ]}
          forecastLabels
        />
      </div>
      {assessment.matrixNotes && (
        <>
          <h2 className="druck-h2" data-nr="4.1">Erläuterung zum Reifegrad</h2>
          <Prose text={assessment.matrixNotes} />
        </>
      )}

      {/* 5 Im CSP-Vergleich */}
      <h1 className="druck-h1" data-nr="5">Im CSP-Vergleich</h1>
      <p>Themen aus der KI-Auswertung aller Teams {period}, die {assessment.team.name} nennt.</p>
      {context && context.teamThemes.length > 0 ? (
        <>
          <p className="druck-tabellentitel">
            Tabelle {++tableNr}: Themen aus der Auswertung aller Teams {period}, die {assessment.team.name} nennt
          </p>
          <table className="druck-tabelle">
            <thead>
              <tr>
                <th style={{ width: "20mm" }}>Kategorie</th>
                <th>Thema und Nennung</th>
                <th style={{ width: "22mm" }}>Teams</th>
              </tr>
            </thead>
            <tbody>
              {context.teamThemes.map((t, i) => (
                <tr key={i}>
                  <td>{t.category}</td>
                  <td>
                    <strong>{t.theme}</strong>
                    <br />
                    {t.quote ? `«${t.quote}»` : t.beschreibung}
                  </td>
                  <td>{t.count === 1 ? "nur dieses Team" : `${t.count} Teams`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>Für diese Periode liegt keine qualitative Auswertung vor oder das Team taucht in keinem Thema auf.</p>
      )}
      <p className="druck-klein">KI-generierte Inhalte (OpenAI) auf Basis der Selbsteinschätzungen — zur Diskussion, nicht als Bewertung.</p>
    </div>
  );
}

/** KI-Einordnung am Kapitelanfang: blauer Rand links, etwas kleiner als der Fliesstext. */
function KiNote({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <p className="druck-ki">
      <strong>KI-Einordnung: </strong>
      {text}
    </p>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return <p>–</p>;
  return (
    <ul className="druck-aufzaehlung">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
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
