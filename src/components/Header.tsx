import { getSession } from "@/lib/session";
import { isDemoMode } from "@/lib/demo-mode";
import Link from "next/link";
import { canAccessDashboard } from "@/lib/auth";
import { CspLogo } from "@/components/CspLogo";
import { PeriodSwitcher } from "@/components/PeriodSwitcher";
import { UserMenu } from "@/components/UserMenu";
import { getPeriodScope } from "@/lib/period-scope";

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Viewer" };

async function logout() {
  "use server";
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/login" });
}

/** Einzeilige Navigation: Logo links, Übersicht · Dashboard · Periode, rechts Personen-Menü. */
export async function Header() {
  const session = await getSession();
  const demo = isDemoMode();
  const scope = session?.user ? await getPeriodScope() : null;
  const user = session?.user;
  const link = "whitespace-nowrap rounded-full px-3 py-2 hover:bg-csp-sand lg:px-4";

  return (
    <header className="no-print border-b border-csp-linie bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-4" aria-label="Strategie-Check – Übersicht">
          <CspLogo className="h-7 w-auto shrink-0 sm:h-8" />
          <span className="hidden border-l border-csp-linie pl-4 text-[14px] font-extrabold tracking-[-0.01em] lg:inline">
            Strategie-Check
          </span>
        </Link>

        {user && (
          <nav className="ml-auto flex min-w-0 items-center gap-1 text-[14px] font-bold">
            <Link href="/" className={`${link} hidden sm:block`}>
              Übersicht
            </Link>
            {canAccessDashboard(user.role) && (
              <Link href="/dashboard" className={`${link} hidden sm:block`}>
                Dashboard
              </Link>
            )}
            {scope && scope.all.length > 0 && (
              <PeriodSwitcher
                periods={scope.all.map((p) => ({ id: p.id, label: p.label, isActive: p.isActive }))}
                selectedId={scope.selected?.id ?? null}
                currentLabel={scope.all.filter((p) => p.isActive).map((p) => p.label).join(" / ") || "–"}
              />
            )}
            <div className="ml-1.5 shrink-0">
              <UserMenu
                name={demo ? "Demo" : (user.name ?? null)}
                email={user.email ?? null}
                roleLabel={ROLE_LABEL[user.role] ?? user.role}
                isAdmin={user.role === "ADMIN"}
                canDashboard={canAccessDashboard(user.role)}
                logout={demo ? undefined : logout}
              />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
