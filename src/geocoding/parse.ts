/** Fetches JSON, rejecting on a network failure, an abort, or a non-2xx answer. */
export async function fetchJson(url: URL, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url.host} answered ${response.status}`);
  const data: unknown = await response.json();
  return data;
}

/** The fields of a JSON object, or no fields for anything else. */
export function fields(value: unknown): Map<string, unknown> {
  return new Map(typeof value === 'object' && value ? Object.entries(value) : []);
}

/** A non-blank string, trimmed, or nothing. */
export function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** The values that are present, in order, without repeats. */
export function distinct(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value) => value !== undefined))];
}
