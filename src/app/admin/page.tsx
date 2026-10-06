import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PageTitle, Section } from "@/components/ui";
import { ReminderPanel } from "@/components/admin/ReminderPanel";
import { PeriodManager } from "@/components/admin/PeriodManager";
import { AdminManager, MakeAdminButton } from "@/components/admin/AdminManager";
import { FIXED_ADMINS, normalizeEmail } from "@/lib/admins";
import { sortPeriods } from "@/lib/period-scope";
import { parsePeriodLabel } from "@/lib/period-labels";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/audit";
import { isMailConfigured } from "@/lib/mailer";
import { isAiEnabled } from "@/lib/ai";
import { formatTeamCategory } from "@/lib/constants";
import { buildTeamColors, teamShapeClass } from "@/lib/team-colors";

const TABS = [
  { key: "perioden", label: "Perioden" },
  { key: "konten", label: "Konten" },
  { key: "erinnerungen", label: "Erinnerungen" },
  { key: "protokoll", label: "Protokoll" },
] as const;

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", EDITOR: "Editor", VIEWER: "Viewer" };

const fmt = (d: Date | null) =>
  d ? d.toLocaleString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; aktion?: string; periode?: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  // Für alle anderen existiert der Admin-Bereich nicht.
  if (session.user.role !== "ADMIN") notFound();

  const { tab = "perioden", aktion, periode } = await searchParams;

  return (
    <div className="space-y-8">
      <PageTitle kicker="Strategie-Check" title="Admin." sub="Perioden, Konten, Erinnerungen.">
        Perioden starten und abschliessen, Admins und Konten, fehlende Abgaben und was wann passiert ist.
      </PageTitle>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin?tab=${t.key}`}
            className={t.key === tab ? "btn-primaer" : "btn-sekundaer"}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] font-bold text-csp-grau">
        <Status ok={isAiEnabled()} label={isAiEnabled() ? `KI aktiv (${process.env.OPENAI_MODEL || "gpt-5-mini"})` : "KI nicht konfiguriert"} />
        <Status ok={isMailConfigured()} label={isMailConfigured() ? "E-Mail-Versand aktiv" : "E-Mail-Versand nicht konfiguriert (Entwürfe)"} />
      </div>

      {tab === "perioden" && <Periods />}
      {tab === "konten" && <Accounts me={session.user.email ?? ""} />}
      {tab === "erinnerungen" && <Reminders periode={periode} />}
      {tab === "protokoll" && <Protocol aktion={aktion} />}
    </div>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-[7px] w-[7px] rounded-full ${ok ? "bg-csp-gruen" : "bg-csp-gelb"}`} />
      {label}
    </span>
  );
}

async function Periods() {
  const all = sortPeriods(await prisma.period.findMany({ include: { assessments: { select: { status: true } } } }));
  const latest = all.at(-1);
  const parsed = latest ? parsePeriodLabel(latest.label) : null;
  const suggestion: { half: 1 | 2; year: number } = parsed
    ? parsed.half === 1
      ? { half: 2, year: parsed.year }
      : { half: 1, year: parsed.year + 1 }
    : { half: 1, year: new Date().getFullYear() };

  return (
    <Section
      nr="01"
      title="Perioden."
      sub="Neues Halbjahr, frischer Start."
      intro="Eine neue Periode legt für jedes Team eine neue Selbsteinschätzung an. Vergangene Perioden bleiben erhalten und sind oben im Header über den Perioden-Umschalter einsehbar; das Dashboard wertet sie weiterhin aus (Prognose-Check, Entwicklung)."
    >
      <PeriodManager
        suggestion={suggestion}
        periods={all.map((p) => ({
          id: p.id,
          label: p.label,
          isActive: p.isActive,
          total: p.assessments.length,
          submitted: p.assessments.filter((a) => a.status === "SUBMITTED").length,
        }))}
      />
    </Section>
  );
}

async function Accounts({ me }: { me: string }) {
  const grants = await prisma.adminGrant.findMany({ orderBy: { createdAt: "asc" } });
  const users = await prisma.user.findMany({ include: { team: true }, orderBy: { lastLoginAt: "desc" } });
  const counts = await prisma.auditLog.groupBy({ by: ["userEmail"], _count: { _all: true } });
  const countBy = new Map(counts.map((c) => [c.userEmail, c._count._all]));
  const since = Date.now() - 30 * 86400000;
  const active = users.filter((u) => u.lastLoginAt && u.lastLoginAt.getTime() > since).length;
  const userBy = new Map(users.map((u) => [normalizeEmail(u.email), u]));
  const adminEmails = new Set<string>([...FIXED_ADMINS, ...grants.map((g) => g.email)].map(normalizeEmail));
  const admins = [
    ...FIXED_ADMINS.map((email) => ({ email, fixed: true, grantedBy: null as string | null })),
    ...grants.map((g) => ({ email: g.email, fixed: false, grantedBy: g.grantedBy })),
  ].map((a) => ({
    ...a,
    name: userBy.get(a.email)?.name ?? null,
    lastLoginAt: userBy.get(a.email)?.lastLoginAt?.toISOString() ?? null,
  }));

  return (
    <Section
      nr="02"
      title="Konten."
      sub={`${users.length} angemeldet, ${active} in den letzten 30 Tagen.`}
      intro="Alle Personen, die sich mindestens einmal über Keycloak angemeldet haben. Editor und Viewer kommen aus Keycloak (editor_ps, viewer); Admin vergibt nur das Tool selbst."
    >
      <div className="mb-6">
        <AdminManager admins={admins} me={normalizeEmail(me)} />
      </div>
      {users.length === 0 ? (
        <p className="nebentext">Noch keine Anmeldungen (im Demo-Modus werden keine Konten angelegt).</p>
      ) : (
        <div className="overflow-x-auto rounded-[22px] bg-white p-5">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-csp-ink text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-csp-grau">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">E-Mail</th>
                <th className="py-2 pr-3">Rolle</th>
                <th className="py-2 pr-3">Erste Anmeldung</th>
                <th className="py-2 pr-3">Letzte Anmeldung</th>
                <th className="py-2 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-csp-linie font-semibold">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 pr-3 font-extrabold">{u.name ?? "–"}</td>
                  <td className="py-2.5 pr-3">{u.email}</td>
                  <td className="py-2.5 pr-3">
                    {adminEmails.has(normalizeEmail(u.email)) ? (
                      "Admin"
                    ) : (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {ROLE_LABEL[u.role === "ADMIN" ? "EDITOR" : u.role] ?? u.role}
                        {!u.email.endsWith("@keycloak.local") && <MakeAdminButton email={u.email} />}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums">{fmt(u.createdAt)}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{fmt(u.lastLoginAt)}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    <Link className="underline-offset-2 hover:underline" href={`/admin?tab=protokoll`}>
                      {countBy.get(u.email) ?? 0}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

async function Reminders({ periode }: { periode?: string }) {
  const periods = sortPeriods(await prisma.period.findMany({ where: { isActive: true } }));
  const period = periods.find((p) => p.id === periode) ?? periods.at(-1);
  if (!period) return <p className="nebentext">Keine aktive Periode.</p>;

  const allTeams = await prisma.team.findMany();
  const colors = buildTeamColors(allTeams.map((t) => ({ ...t, category: formatTeamCategory(t.category) })));
  const assessments = await prisma.assessment.findMany({
    where: { periodId: period.id },
    include: { team: true },
    orderBy: { team: { name: "asc" } },
  });
  const history = await prisma.auditLog.findMany({
    where: { action: "REMINDER" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <Section nr="03" title="Erinnerungen." sub={`Abgabestand ${period.label}.`}>
      <div className="mb-6 flex flex-wrap gap-2">
        {periods.map((p) => (
          <Link
            key={p.id}
            href={`/admin?tab=erinnerungen&periode=${p.id}`}
            className={p.id === period.id ? "btn-primaer py-1.5 text-[13px]" : "btn-sekundaer py-1.5 text-[13px]"}
          >
            {p.label}
          </Link>
        ))}
      </div>
      <ReminderPanel
        key={period.id}
        periodId={period.id}
        periodLabel={period.label}
        mailConfigured={isMailConfigured()}
        teams={assessments.map((a) => ({
          id: a.team.id,
          name: a.team.name,
          category: formatTeamCategory(a.team.category),
          color: colors[a.team.id] ?? "#0093D3",
          status: a.status,
          contactEmail: a.team.contactEmail,
        }))}
      />
      <div className="mt-8">
        <p className="label">Bisherige Erinnerungen</p>
        {history.length === 0 ? (
          <p className="nebentext">Noch keine.</p>
        ) : (
          <ul className="divide-y divide-csp-linie text-[13px] font-semibold">
            {history.map((h) => (
              <li key={h.id} className="py-2">
                <span className="font-extrabold tabular-nums">{fmt(h.createdAt)}</span> · {h.userName ?? h.userEmail} ·{" "}
                {h.target} · <span className="text-csp-grau">{h.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

async function Protocol({ aktion }: { aktion?: string }) {
  const filter = aktion && aktion in AUDIT_ACTIONS ? (aktion as AuditAction) : undefined;
  const logs = await prisma.auditLog.findMany({
    where: filter ? { action: filter } : undefined,
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const teams = await prisma.team.findMany();
  const colors = buildTeamColors(teams.map((t) => ({ ...t, category: formatTeamCategory(t.category) })));
  const teamByName = new Map(teams.map((t) => [t.name, t]));

  return (
    <Section nr="04" title="Protokoll." sub="Die letzten 300 Ereignisse.">
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/admin?tab=protokoll" className={!filter ? "btn-primaer py-1.5 text-[13px]" : "btn-sekundaer py-1.5 text-[13px]"}>
          Alle
        </Link>
        {Object.entries(AUDIT_ACTIONS).map(([k, v]) => (
          <Link
            key={k}
            href={`/admin?tab=protokoll&aktion=${k}`}
            className={filter === k ? "btn-primaer py-1.5 text-[13px]" : "btn-sekundaer py-1.5 text-[13px]"}
          >
            {v}
          </Link>
        ))}
      </div>
      {logs.length === 0 ? (
        <p className="nebentext">Keine Einträge.</p>
      ) : (
        <div className="overflow-x-auto rounded-[22px] bg-white p-5">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-csp-ink text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-csp-grau">
                <th className="py-2 pr-3">Zeit</th>
                <th className="py-2 pr-3">Person</th>
                <th className="py-2 pr-3">Aktion</th>
                <th className="py-2 pr-3">Betrifft</th>
                <th className="py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-csp-linie font-semibold">
              {logs.map((l) => {
                const team = l.target ? teamByName.get(l.target.split(" · ")[0]) : undefined;
                return (
                  <tr key={l.id} className="align-top">
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{fmt(l.createdAt)}</td>
                    <td className="py-2 pr-3">
                      <span className="font-extrabold">{l.userName ?? "–"}</span>
                      <span className="block text-[11.5px] text-csp-grau">{l.userEmail}</span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3">{AUDIT_ACTIONS[l.action as AuditAction] ?? l.action}</td>
                    <td className="py-2 pr-3">
                      {team && (
                        <span
                          className={`mr-1.5 inline-block h-[8px] w-[8px] ${teamShapeClass(formatTeamCategory(team.category))}`}
                          style={{ background: colors[team.id] }}
                        />
                      )}
                      {l.target ?? "–"}
                    </td>
                    <td className="py-2 text-csp-grau">{l.detail || "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
