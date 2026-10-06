import { isDemoMode } from "@/lib/demo-mode";

export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="no-print bg-csp-ink px-4 py-2 text-center text-[13px] font-bold text-csp-hell">
      <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-csp-gelb align-middle" />
      Demo-Modus ohne Keycloak-Login. Nur für die lokale Vorschau.
    </div>
  );
}
