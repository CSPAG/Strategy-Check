/** Kleine Fetch-Hilfe für die KI-Endpunkte mit verständlichen Fehlermeldungen. */
export async function callAi<T>(url: string, body: FormData | Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    ...(body instanceof FormData
      ? { body }
      : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Die KI-Anfrage ist fehlgeschlagen.");
  return json as T;
}

export function AiBadge() {
  return (
    <span className="mr-1 inline-flex gap-[3px]" aria-hidden>
      <span className="h-[6px] w-[6px] rounded-full bg-csp-blau" />
      <span className="h-[6px] w-[6px] rounded-full bg-csp-blau" />
      <span className="h-[6px] w-[6px] rounded-full bg-csp-blau" />
    </span>
  );
}
