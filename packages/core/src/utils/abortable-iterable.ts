const done = <T>(): IteratorResult<T> => ({ done: true, value: undefined });

export const openAbortableIterable = async <T>(
  source: AsyncIterable<T> | Promise<AsyncIterable<T>>,
  signal: AbortSignal,
): Promise<AsyncIterable<T> | undefined> => {
  const opened = Promise.resolve(source);
  let release = () => {};
  const aborted = new Promise<undefined>((resolve) => {
    const onAbort = () => resolve(undefined);
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    release = () => signal.removeEventListener("abort", onAbort);
  });
  try {
    const iterable = await Promise.race([opened, aborted]);
    if (!iterable) {
      void opened
        .then((late) => late[Symbol.asyncIterator]().return?.(undefined))
        .catch(() => {});
    }
    return iterable;
  } finally {
    release();
  }
};

/**
 * Presents a stream as exhausted once the signal aborts, so a consumer stops
 * waiting on it.
 *
 * A caller's stream is free to ignore the abort signal it is handed. One that
 * also stops yielding, because it is awaiting its own work, leaves `for await`
 * parked on `next()` with nothing left to wake it: the run never settles and
 * whatever is serialized behind it never starts. Reporting the stream as
 * exhausted ends the loop at cancellation instead.
 *
 * The source is finalized on the way out, but never awaited, since a stream
 * that is already parked would not settle that either.
 */
export const abortableIterable = <T>(
  source: AsyncIterable<T>,
  signal: AbortSignal,
): AsyncIterable<T> => ({
  [Symbol.asyncIterator]: () => {
    const iterator = source[Symbol.asyncIterator]();
    let finished = false;
    const finalize = () => {
      if (finished) return;
      finished = true;
      try {
        iterator.return?.(undefined)?.catch(() => {});
      } catch {
        // a source that throws on finalize has nothing left to clean up
      }
    };

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      next: () => {
        if (finished || signal.aborted) {
          finalize();
          return Promise.resolve(done<T>());
        }

        return new Promise<IteratorResult<T>>((resolve, reject) => {
          // Registered per chunk and released as soon as the chunk settles, so
          // a long stream does not accumulate one reaction per chunk.
          const onAbort = () => {
            finalize();
            resolve(done<T>());
          };
          signal.addEventListener("abort", onAbort, { once: true });
          const release = () => signal.removeEventListener("abort", onAbort);

          const onError = (error: unknown) => {
            release();
            finalize();
            reject(error);
          };
          try {
            void iterator.next().then((result) => {
              release();
              if (finished) return resolve(done<T>());
              if (result.done) finished = true;
              resolve(result);
            }, onError);
          } catch (error) {
            onError(error);
          }
        });
      },
      // The consumer breaks out of the loop to stop a cancelled run, so this is
      // reached on the same path as an abort and finalizes the same way: a
      // source whose own cleanup parks must not stall the break either.
      return: async () => {
        finalize();
        return done<T>();
      },
    };
  },
});
