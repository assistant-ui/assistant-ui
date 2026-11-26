/**
 * Reads a positive integer setting (a flag or an environment variable),
 * falling back when it is unset and refusing anything else, so a typo can't
 * turn into zero workers or a 1 ms timeout.
 */
export function positiveInt(
  name: string,
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`${name} must be a positive integer, got "${raw}"`);
  }
  return n;
}

/** Maps `items` through `fn` with at most `concurrency` calls in flight, keeping the input order. */
export async function pool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(
      `concurrency must be a positive integer, got ${concurrency}`,
    );
  }
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return out;
}
