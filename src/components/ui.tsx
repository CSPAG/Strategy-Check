import type { ReactNode } from "react";

/** Seitentitel nach CSP-Titelregel: Aussage schwarz, Einordnung grau. */
export function PageTitle({
  kicker,
  title,
  sub,
  children,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-10 sm:mb-14">
      {kicker && <p className="kicker mb-4">{kicker}</p>}
      <h1 className="titel">
        {title}
        {sub && (
          <>
            <br />
            <span className="text-csp-grau-titel">{sub}</span>
          </>
        )}
      </h1>
      {children && <div className="fliesstext mt-6 max-w-2xl">{children}</div>}
    </div>
  );
}

/** Abschnitt mit Nummer und zweiteiligem Zwischentitel. */
export function Section({
  nr,
  title,
  sub,
  intro,
  children,
  className = "",
}: {
  nr?: string;
  title: ReactNode;
  sub?: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flaeche ${className}`}>
      <div className="flex gap-4">
        {nr && <span className="pt-1 text-[15px] font-extrabold text-csp-grau-titel">{nr}</span>}
        <div className="min-w-0 flex-1">
          <h2 className="zwischentitel">
            {title}
            {sub && <span className="text-csp-grau-titel"> {sub}</span>}
          </h2>
          {intro && <div className="nebentext mt-3 max-w-3xl">{intro}</div>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Statuspunkt: grün = eingereicht, grau = Entwurf. */
export function StatusDot({ status }: { status: string }) {
  const submitted = status === "SUBMITTED";
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-csp-grau">
      <span
        className={`inline-block h-[7px] w-[7px] rounded-full ${
          submitted ? "bg-csp-gruen" : "bg-csp-linie"
        }`}
      />
      {submitted ? "Eingereicht" : "Entwurf"}
    </span>
  );
}

/** Kleiner Hover-Hinweis ohne JavaScript. */
export function Hint({ children, content }: { children: ReactNode; content: ReactNode }) {
  return (
    <span className="group/hint relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-[260px] -translate-x-1/2 rounded-xl bg-csp-ink px-3 py-2 text-[12px] font-semibold leading-snug text-white shadow-lg group-hover/hint:block"
      >
        {content}
      </span>
    </span>
  );
}
