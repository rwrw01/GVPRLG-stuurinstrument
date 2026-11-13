/** Outcome of an operation that can fail with a typed, expected error. */
export type Result<T, E> = { ok: true; data: T } | { ok: false; error: E };

/**
 * Wraps a successful value.
 * @param data - The value produced by the operation
 * @returns A successful result
 */
export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

/**
 * Wraps an expected failure.
 * @param error - The failure reason
 * @returns A failed result
 */
export function fail<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}
