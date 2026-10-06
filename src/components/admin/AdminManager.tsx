"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminRow = { email: string; name: string | null; fixed: boolean; grantedBy: string | null; lastLoginAt: string | null };

/** Admins verwalten: feste Admins anzeigen, weitere ernennen oder entfernen. */
export function AdminManager({ admins, me }: { admins: AdminRow[]; me: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const call = async (method: "POST" | "DELETE", target: string) => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/admins", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: target }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Fehler");
      return;
    }
    setEmail("");
    router.refresh();
  };

  return (
    <div className="rounded-[22px] bg-white p-5 sm:p-6">
      <p className="label">Admins</p>
      <ul className="divide-y divide-csp-linie">
        {admins.map((a) => (
          <li key={a.email} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[13.5px] font-semibold">
            <span>
              <span className="font-extrabold">{a.name ?? a.email}</span>
              {a.name && <span className="text-csp-grau"> · {a.email}</span>}
              <span className="block text-[12px] font-bold text-csp-grau">
                {a.fixed ? "Fester Admin" : `Ernannt von ${a.grantedBy ?? "–"}`}
                {a.lastLoginAt ? "" : " · noch nie angemeldet"}
              </span>
            </span>
            {!a.fixed && a.email !== me && (
              <button
                type="button"
                className="btn-sekundaer py-1 text-[12.5px]"
                disabled={busy}
                onClick={() => call("DELETE", a.email)}
              >
                Admin-Recht entziehen
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) call("POST", email.trim());
        }}
      >
        <input
          type="email"
          className="eingabe max-w-sm py-2"
          placeholder="vorname.nachname@csp-ag.ch"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-primaer" disabled={busy || !email.trim()}>
          Zum Admin ernennen
        </button>
      </form>
      <p className="nebentext mt-2">
        Admins sehen den Admin-Bereich, können Perioden starten, Erinnerungen versenden und eingereichte Abgaben
        bearbeiten. Für alle anderen ist der Admin-Bereich unsichtbar. Die Änderung gilt ab dem nächsten Seitenaufruf.
      </p>
      {error && <p className="mt-2 text-[13px] font-bold text-csp-rot">{error}</p>}
    </div>
  );
}
