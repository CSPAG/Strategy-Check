export function CspLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/branding/logo-csp.png"
      alt="CSP"
      width={280}
      height={88}
      className={className ?? "h-8 w-auto shrink-0"}
    />
  );
}
