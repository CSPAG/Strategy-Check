import { getSession } from "@/lib/session";
import { isDemoMode } from "@/lib/demo-mode";
import Link from "next/link";
import { isGlRole } from "@/lib/auth";
import { CspLogo } from "@/components/CspLogo";

export async function Header() {
  const session = await getSession();
  const demo = isDemoMode();

  return (
    <header className="border-b border-csp-cyan/20 bg-white shadow-sm no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <CspLogo />
          <span className="text-sm text-gray-600">Strategie-Check</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {session?.user && (
            <>
              <Link href="/" className="text-csp-cyan hover:opacity-80">
                Übersicht
              </Link>
              {isGlRole(session.user.role) && (
                <Link href="/dashboard" className="font-medium text-csp-cyan hover:opacity-80">
                  Dashboard
                </Link>
              )}
              <span className="hidden text-gray-500 md:inline">
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
                  <button
                    type="submit"
                    className="rounded-md border border-csp-cyan/30 px-3 py-1.5 text-csp-cyan hover:bg-csp-cyan/5"
                  >
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
