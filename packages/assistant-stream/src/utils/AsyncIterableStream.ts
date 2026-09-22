export type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

function streamIteratorPolyfill<T>(
  this: ReadableStream<T>,
): AsyncIterableIterator<T> {
  const reader = this.getReader();
  let finished = false;
  let ongoing = Promise.resolve();

  const enqueue = (operation: () => Promise<IteratorResult<T>>) => {
    const result = ongoing.then(operation);
    ongoing = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const cancel = async (reason: unknown) => {
    if (finished) return;
    finished = true;
    try {
      return reader.cancel(reason);
    } finally {
      reader.releaseLock();
    }
  };

  const iterator: AsyncIterableIterator<T> & Partial<AsyncDisposable> = {
    next: () =>
      enqueue(async () => {
        if (finished) return { done: true, value: undefined };
        try {
          const result = await reader.read();
          if (result.done) {
            finished = true;
            reader.releaseLock();
          }
          return result;
        } catch (error) {
          finished = true;
          reader.releaseLock();
          throw error;
        }
      }),
    return: (value: unknown) =>
      enqueue(async () => {
        await cancel(value);
        return { done: true, value };
      }),
    throw: (error: unknown) =>
      enqueue(async () => {
        await cancel(undefined);
        throw error;
      }),
    [Symbol.asyncIterator]() {
      return this;
    },
  };
  if (Symbol.asyncDispose) {
    iterator[Symbol.asyncDispose] = async () => {
      await iterator.return!();
    };
  }
  return iterator;
}

export function asAsyncIterableStream<T>(
  source: ReadableStream<T>,
): AsyncIterableStream<T> {
  (source as AsyncIterable<T>)[Symbol.asyncIterator] ??= streamIteratorPolyfill;
  return source as AsyncIterableStream<T>;
}
