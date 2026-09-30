import { useCallback, useEffect, useState } from "react";

/**
 * Delays a promise until the client has committed a render of the source
 * state current at settlement, so a caller awaiting it reads the result from
 * the client's `getState()`. `getLatestState` must be stable.
 */
export const useAfterStateCommit = <TState>(
  renderedState: TState,
  getLatestState: () => TState,
) => {
  const [session] = useState(() => ({
    committed: undefined as { state: TState } | undefined,
    waiters: new Set<() => void>(),
  }));

  useEffect(() => {
    session.committed = { state: renderedState };
    if (!Object.is(renderedState, getLatestState())) return;
    const waiters = [...session.waiters];
    session.waiters.clear();
    for (const resolve of waiters) resolve();
  });

  useEffect(
    () => () => {
      session.committed = undefined;
      const waiters = [...session.waiters];
      session.waiters.clear();
      for (const resolve of waiters) resolve();
    },
    [session],
  );

  return useCallback(
    <T>(promise: Promise<T>): Promise<T> =>
      promise.then(
        (value) =>
          new Promise<T>((resolve) => {
            const committed = session.committed;
            if (
              committed === undefined ||
              Object.is(committed.state, getLatestState())
            ) {
              resolve(value);
              return;
            }
            session.waiters.add(() => resolve(value));
          }),
      ),
    [session, getLatestState],
  );
};
