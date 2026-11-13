/**
 * Sends a JSON request and reduces the outcome to an error message for display.
 * @param url - API route
 * @param method - HTTP method
 * @param body - JSON body; omitted when undefined
 * @returns null on success, otherwise the problem+json `detail` or a generic Dutch message
 */
export async function verstuurJson(url: string, method: 'POST' | 'PATCH' | 'PUT', body?: unknown): Promise<string | null> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.ok) return null;
    const problem: unknown = await response.json().catch(() => null);
    return leesDetail(problem) ?? 'De actie is mislukt.';
  } catch {
    return 'De server is niet bereikbaar.';
  }
}

/**
 * Reads the `detail` field of a problem+json body.
 * @param problem - Parsed response body
 * @returns the detail text, or null when absent
 */
export function leesDetail(problem: unknown): string | null {
  if (typeof problem !== 'object' || problem === null || !('detail' in problem)) return null;
  return typeof problem.detail === 'string' ? problem.detail : null;
}
