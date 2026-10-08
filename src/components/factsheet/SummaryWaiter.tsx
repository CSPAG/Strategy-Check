"use client";

import { LoadingScreen } from "@/components/LoadingScreen";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Nach dem Einreichen: Ladeanzeige, bis die KI-Auswertung (Management Summary) fertig ist, dann das Factsheet.
 * Fragt alle 2.5 s nach; nach 90 s wird das Factsheet trotzdem gezeigt.
 * «waiting» kommt vom Server: Die Anzeige bleibt, bis die neue Seite (ohne Wartemodus, mit Summary) geliefert ist.
 */
export function SummaryWaiter({
  assessmentId,
  waiting,
  children,
}: {
  assessmentId: string;
  waiting: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!waiting) return;
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      if (stopped) return;
      setSeconds(Math.round((Date.now() - started) / 1000));
      try {
        const res = await fetch(`/api/ai/team-summary?assessmentId=${encodeURIComponent(assessmentId)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.ready || Date.now() - started > 90_000) {
          stopped = true;
          // Factsheet frisch vom Server holen (mit Summary), Parameter aus der Adresse entfernen.
          router.replace(`/factsheet/${assessmentId}`);
          return;
        }
      } catch {
        // Netzwerkfehler: einfach weiter versuchen
      }
      setTimeout(tick, 2500);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [waiting, assessmentId, router]);

  if (waiting) {
    return (
      <LoadingScreen
        title="Factsheet wird erstellt."
        sub="Die KI wertet die Abgabe aus."
        hint={`Management Summary und Einordnungen pro Kapitel entstehen gerade — meist in 10 bis 20 Sekunden.${
          seconds > 0 ? ` (${seconds} s)` : ""
        }`}
      />
    );
  }
  return <>{children}</>;
}
