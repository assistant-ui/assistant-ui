import { useCallback, useEffect, useState } from "react";

/**
 * How long a settled promise waits for the client to commit before resolving
 * anyway. The client cannot commit while a Suspense boundary hides it, so a
 * reader suspended on the promise inside that boundary would otherwise wait
 * forever. There is no hide signal to release it sooner: React cleans up
 * layout effects in hidden content, but tap does not pass that through to this
 * hook (a layout effect cleanup here ran only on unmount when tested). The
 * value is a bound on that wait, not a tuned delay.
 */
const COMMIT_TIMEOUT_MS = 100;

/**
 * Delays a promise until the client has committed a render of the source
 * state current at settlement, so a caller awaiting it reads the result from
 * the client's `getState()`. A promise that settles before the first commit
 * waits for it. The wait ends after `COMMIT_TIMEOUT_MS`, and at once after
 * unmount. Each source promise maps to one delayed promise, keeping it stable
 * for `use()` and Suspense caches. `getLatestState` must be stable.
 */
export const useAfterStateCommit = <TState>(
  renderedState: TState,
  getLatestState: () => TState,
) => {
  const [session] = useState(() => ({
    committed: undefined as { state: TState } | undefined,
    unmounted: false,
    waiters: new Set<() => void>(),
    delayed: new WeakMap<Promise<unknown>, Promise<unknown>>(),
  }));

  useEffect(() => {
    session.committed = { state: renderedState };
    if (!Object.is(renderedState, getLatestState())) return;
    const waiters = [...session.waiters];
    session.waiters.clear();
    for (const resolve of waiters) resolve();
  });

  useEffect(() => {
    session.unmounted = false;
    return () => {
      session.unmounted = true;
      session.committed = undefined;
      const waiters = [...session.waiters];
      session.waiters.clear();
      for (const resolve of waiters) resolve();
    };
  }, [session]);

  return useCallback(
    <T>(promise: Promise<T>): Promise<T> => {
      const cached = session.delayed.get(promise);
      if (cached) return cached as Promise<T>;
      const delayed = promise.then(
        (value) =>
          new Promise<T>((resolve) => {
            const committed = session.committed;
            if (
              session.unmounted ||
              (committed !== undefined &&
                Object.is(committed.state, getLatestState()))
            ) {
              resolve(value);
              return;
            }
            const release = () => {
              clearTimeout(timeout);
              session.waiters.delete(release);
              resolve(value);
            };
            const timeout = setTimeout(release, COMMIT_TIMEOUT_MS);
            session.waiters.add(release);
          }),
      );
      session.delayed.set(promise, delayed);
      return delayed;
    },
    [session, getLatestState],
  );
};
