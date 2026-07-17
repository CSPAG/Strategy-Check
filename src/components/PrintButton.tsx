"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-csp-cyan px-3 py-1.5 text-sm text-csp-cyan hover:bg-csp-cyan/5"
    >
      PDF / Drucken
    </button>
  );
}
