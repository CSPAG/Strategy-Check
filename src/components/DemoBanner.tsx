import { isDemoMode } from "@/lib/demo-mode";

export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="no-print bg-csp-cyan px-4 py-2 text-center text-sm font-medium text-white">
      Demo-Modus — ohne Keycloak-Login. Nur für lokale Vorschau, nicht für Produktion.
    </div>
  );
}
