"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-sekundaer">
      PDF / Drucken
    </button>
  );
}
