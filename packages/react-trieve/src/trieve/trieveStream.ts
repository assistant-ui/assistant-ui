import { ChunkMetadata } from "trieve-ts-sdk";

export type TrieveStreamPart =
  | {
      type: "text-delta";
      textDelta: string;
    }
  | {
      type: "citations";
      citations: ChunkMetadata[];
    };

function readerToReadableStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
    cancel() {
      reader.releaseLock();
    },
  });
}

function trieveStream() {
  let citationsJsonText = "";
  let isHandlingCitations = true;

  return new TransformStream<string, TrieveStreamPart>({
    transform(chunk, controller) {
      if (!isHandlingCitations) {
        return controller.enqueue({
          type: "text-delta",
          textDelta: chunk,
        });
      }

      const chunkParts = chunk.split("||");
      while (chunkParts.length > 0) {
        const citationPart = chunkParts.shift();
        citationsJsonText += citationPart;

        if (chunkParts.length > 0) {
          // we got a || marker, try to parse citation
          try {
            const citations = JSON.parse(citationsJsonText);
            isHandlingCitations = false;

            controller.enqueue({
              type: "citations",
              citations: citations,
            });

            controller.enqueue({
              type: "text-delta",
              textDelta: chunkParts.join("||"),
            });

            chunkParts.length = 0;
          } catch (e) {
            // not a valid json
          }
        }
      }
    },
  });
}

export type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;
export function makeAsyncIterable<T>(
  source: ReadableStream<T>,
): AsyncIterableStream<T> {
  (source as AsyncIterableStream<T>)[Symbol.asyncIterator] = () => {
    const reader = source.getReader();
    return {
      async next(): Promise<IteratorResult<T, undefined>> {
        const { done, value } = await reader.read();
        return done ? { done: true, value: undefined } : { done: false, value };
      },
    };
  };

  return source as AsyncIterableStream<T>;
}

export const toTrieveStream = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
) =>
  makeAsyncIterable(
    readerToReadableStream(reader)
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(trieveStream()),
  );
