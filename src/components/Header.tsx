import { getSession } from "@/lib/session";
import { isDemoMode } from "@/lib/demo-mode";
import Link from "next/link";
import { canAccessDashboard } from "@/lib/auth";
import { CspLogo } from "@/components/CspLogo";
import { PeriodSwitcher } from "@/components/PeriodSwitcher";
import { getPeriodScope } from "@/lib/period-scope";

export async function Header() {
  const session = await getSession();
  const demo = isDemoMode();
  const scope = session?.user ? await getPeriodScope() : null;

  return (
    <header className="no-print border-b border-csp-linie bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-4">
          <CspLogo />
          <span className="hidden border-l border-csp-linie pl-4 text-[14px] font-extrabold tracking-[-0.01em] sm:inline">
            Strategie-Check
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-[14px] font-bold">
          {session?.user && (
            <>
              {scope && scope.all.length > 0 && (
                <PeriodSwitcher
                  periods={scope.all.map((p) => ({ id: p.id, label: p.label, isActive: p.isActive }))}
                  selectedId={scope.selected?.id ?? null}
                  currentLabel={scope.all.filter((p) => p.isActive).map((p) => p.label).join(" / ") || "–"}
                />
              )}
              <Link href="/" className="rounded-full px-4 py-2 hover:bg-csp-sand">
                Übersicht
              </Link>
              {canAccessDashboard(session.user.role) && (
                <Link href="/dashboard" className="rounded-full px-4 py-2 hover:bg-csp-sand">
                  Dashboard
                </Link>
              )}
              {session.user.role === "ADMIN" && (
                <Link href="/admin" className="rounded-full px-4 py-2 hover:bg-csp-sand">
                  Admin
                </Link>
              )}
              <span className="hidden px-3 text-csp-grau md:inline">
                {demo ? "Demo" : (session.user.teamName ?? session.user.email)}
              </span>
              {!demo && (
                <form
                  action={async () => {
                    "use server";
                    const { signOut } = await import("@/auth");
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button type="submit" className="btn-sekundaer ml-1 py-2">
                    Abmelden
                  </button>
                </form>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
