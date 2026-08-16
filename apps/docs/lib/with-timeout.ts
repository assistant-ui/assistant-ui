export const UPSTREAM_TIMEOUT_MS = 5000;

/**
 * Stops awaiting an upstream request once the deadline passes. The request is
 * deliberately not aborted, and callers treat the rejection as an unavailable
 * upstream.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = UPSTREAM_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Upstream request timed out after ${ms}ms.`)),
          ms,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
