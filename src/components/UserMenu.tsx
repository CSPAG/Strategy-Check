"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Initialen aus «Vorname Nachname» (sonst aus der E-Mail «vorname.nachname@…»). */
export function initials(name?: string | null, email?: string | null): string {
  const source = (name && !name.includes("@") ? name : (email ?? "").split("@")[0].replace(/[._-]+/g, " ")).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Runder Personen-Knopf mit Initialen; das Menü enthält Name, E-Mail, Rolle, Admin und Abmelden.
 * Auf schmalen Bildschirmen zusätzlich Übersicht und Dashboard.
 */
export function UserMenu({
  name,
  email,
  roleLabel,
  isAdmin,
  canDashboard,
  logout,
}: {
  name: string | null;
  email: string | null;
  roleLabel: string;
  isAdmin: boolean;
  canDashboard: boolean;
  logout?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = "block w-full rounded-xl px-3 py-2 text-left text-[14px] font-bold hover:bg-csp-sand";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={name ?? email ?? "Konto"}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-csp-blau text-[14px] font-extrabold tracking-[0.02em] text-white transition hover:opacity-90 ${
          open ? "ring-2 ring-csp-ink ring-offset-2" : ""
        }`}
      >
        {initials(name, email)}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-white p-2 shadow-[0_12px_40px_rgba(20,20,19,0.16)] ring-1 ring-csp-linie"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-[14px] font-extrabold">{name ?? "Angemeldet"}</p>
            {email && <p className="truncate text-[12.5px] font-semibold text-csp-grau">{email}</p>}
            <p className="mt-1 text-[12px] font-bold text-csp-grau">Rolle: {roleLabel}</p>
          </div>
          <div className="border-t border-csp-linie pt-1">
            <Link href="/" role="menuitem" className={`${item} sm:hidden`}>
              Übersicht
            </Link>
            {canDashboard && (
              <Link href="/dashboard" role="menuitem" className={`${item} sm:hidden`}>
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" role="menuitem" className={item}>
                Admin
              </Link>
            )}
            {logout ? (
              <form action={logout}>
                <button type="submit" role="menuitem" className={item}>
                  Abmelden
                </button>
              </form>
            ) : (
              <p className="px-3 py-2 text-[12.5px] font-semibold text-csp-grau">Demo-Modus · kein Abmelden</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
