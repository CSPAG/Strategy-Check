import "server-only";

/**
 * Schlanker OpenAI-Client (Responses API, strukturierte JSON-Antworten).
 * Konfiguration: OPENAI_API_KEY, optional OPENAI_MODEL (Standard gpt-5-mini).
 */

export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export class AiError extends Error {}

type InputPart =
  | { type: "input_text"; text: string }
  | { type: "input_file"; filename: string; file_data: string };

const SYSTEM_BASE =
  "Du unterstützt die CSP AG (Schweizer Beratungs- und Softwarefirma, Circles und Units) beim halbjährlichen " +
  "Strategie-Check zur CSPstrategie 2026+. Schreibe Schweizer Hochdeutsch (ss statt ß, Anführungszeichen «»), " +
  "knapp, konkret, ohne Floskeln. Erfinde keine Fakten, Zahlen oder Namen, die nicht im Input stehen.";

export async function aiJson<T>({
  instructions,
  input,
  schemaName,
  schema,
}: {
  instructions: string;
  input: string | InputPart[];
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AiError("KI ist nicht konfiguriert (OPENAI_API_KEY fehlt).");
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  const content: InputPart[] = typeof input === "string" ? [{ type: "input_text", text: input }] : input;

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      instructions: `${SYSTEM_BASE}\n\n${instructions}`,
      input: [{ role: "user", content }],
      ...(model.startsWith("gpt-5") ? { reasoning: { effort: "low" } } : {}),
      text: { format: { type: "json_schema", name: schemaName, schema, strict: true } },
    }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("[ai]", res.status, body?.error?.message);
    throw new AiError("Die KI-Anfrage ist fehlgeschlagen. Bitte später erneut versuchen.");
  }

  const text: string | undefined =
    body?.output_text ??
    body?.output
      ?.flatMap((o: { content?: { type: string; text?: string }[] }) => o.content ?? [])
      .find((c: { type: string }) => c.type === "output_text")?.text;
  if (!text) throw new AiError("Die KI hat keine Antwort geliefert.");
  return JSON.parse(text) as T;
}

/** Hilfen für strikte JSON-Schemas. */
export const str = { type: "string" } as const;
export const strArr = { type: "array", items: { type: "string" } } as const;
export function obj(properties: Record<string, unknown>) {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false };
}
