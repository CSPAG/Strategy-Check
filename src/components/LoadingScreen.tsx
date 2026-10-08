import { IconLoader } from "@/components/icons";

/** Ladeanzeige im CSP-Stil: drehender Kreis, Titel nach Titelregel, kurzer Hinweis. */
export function LoadingScreen({ title, sub, hint }: { title: string; sub: string; hint?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[55vh] flex-col items-center justify-center text-center">
      <IconLoader size={40} strokeWidth={1.6} className="animate-spin text-csp-blau" />
      <p className="mt-6 text-[26px] font-extrabold leading-tight tracking-titel sm:text-[32px]">
        {title}
        <br />
        <span className="text-csp-grau-titel">{sub}</span>
      </p>
      {hint && <p className="nebentext mt-4 max-w-md">{hint}</p>}
    </div>
  );
}
