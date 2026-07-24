export type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

async function* streamGeneratorPolyfill<T>(
  this: ReadableStream<T>,
): AsyncGenerator<T, undefined, unknown> {
  const reader = this.getReader();
  let shouldCancel = true;
  try {
    while (true) {
      let result: ReadableStreamReadResult<T>;
      try {
        result = await reader.read();
      } catch (error) {
        shouldCancel = false;
        throw error;
      }
      if (result.done) {
        shouldCancel = false;
        break;
      }
      const { value } = result;
      yield value;
    }
  } finally {
    try {
      if (shouldCancel) await reader.cancel();
    } finally {
      reader.releaseLock();
    }
  }
}

export function asAsyncIterableStream<T>(
  source: ReadableStream<T>,
): AsyncIterableStream<T> {
  (source as AsyncIterableStream<T>)[Symbol.asyncIterator] ??=
    streamGeneratorPolyfill;
  return source as AsyncIterableStream<T>;
}
