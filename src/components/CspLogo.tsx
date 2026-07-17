import { CSP_LOGO_HEIGHT, CSP_LOGO_SRC, CSP_LOGO_WIDTH } from "@/lib/csp-logo-data";

export function CspLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={CSP_LOGO_SRC}
      alt="CSP"
      width={CSP_LOGO_WIDTH}
      height={CSP_LOGO_HEIGHT}
      className={className ?? "h-9 w-auto shrink-0"}
    />
  );
}
