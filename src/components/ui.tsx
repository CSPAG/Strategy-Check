import type { ReactNode } from "react";
import { WaveHeading } from "@/components/WaveHeading";
import { IconCheck } from "@/components/icons";

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
      <WaveHeading as="h1" className="titel">
        {title}
        {sub && (
          <>
            <br />
            <span className="text-csp-grau-titel">{sub}</span>
          </>
        )}
      </WaveHeading>
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
          <WaveHeading as="h2" className="zwischentitel">
            {title}
            {sub && <span className="text-csp-grau-titel"> {sub}</span>}
          </WaveHeading>
          {intro && <div className="nebentext mt-3 max-w-3xl">{intro}</div>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Statuspunkt: grün = eingereicht, grau = Entwurf. */
/** Status als Pille: grün «Eingereicht», sandfarben «Entwurf». */
export function StatusPill({ status }: { status: string }) {
  const submitted = status === "SUBMITTED";
  return submitted ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-csp-gruen px-2.5 py-0.5 text-[12px] font-extrabold text-white">
      <IconCheck size={13} strokeWidth={2} />
      Eingereicht
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-csp-sand px-2.5 py-0.5 text-[12px] font-bold text-csp-grau">
      Entwurf
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
