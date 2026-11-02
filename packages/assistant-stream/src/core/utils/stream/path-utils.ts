import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { Counter } from "../Counter";

export class PathAppendEncoder extends TransformStream<
  AssistantStreamChunk,
  AssistantStreamChunk
> {
  constructor(
    idx: number | { value: number | undefined; promise: Promise<number> },
  ) {
    super({
      transform(chunk, controller) {
        const append = (partIndex: number) =>
          controller.enqueue({
            ...chunk,
            path: [partIndex, ...chunk.path],
          });

        if (typeof idx === "number") {
          return append(idx);
        } else if (idx.value !== undefined) {
          return append(idx.value);
        } else {
          return idx.promise.then(append);
        }
      },
    });
  }
}

export class PathAppendDecoder extends TransformStream<
  AssistantStreamChunk,
  AssistantStreamChunk
> {
  constructor(idx: number) {
    super({
      transform(chunk, controller) {
        const {
          path: [idx2, ...path],
        } = chunk;

        if (idx !== idx2)
          throw new Error(`Path mismatch: expected ${idx}, got ${idx2}`);

        controller.enqueue({
          ...chunk,
          path,
        });
      },
    });
  }
}

export class PathMergeEncoder extends TransformStream<
  AssistantStreamChunk,
  AssistantStreamChunk
> {
  constructor(counter: Counter) {
    const mapChunk = createPathMergeMapper(() => counter.up());
    super({
      transform(chunk, controller) {
        controller.enqueue(mapChunk(chunk));
      },
    });
  }
}

export const createPathMergeMapper = (
  nextPartIndex: () => number,
): ((chunk: AssistantStreamChunk) => AssistantStreamChunk) => {
  const innerCounter = new Counter();
  const mapping = new Map<number, number>();

  return (chunk) => {
    if (chunk.type === "part-start" && chunk.path.length === 0) {
      mapping.set(innerCounter.up(), nextPartIndex());
    }

    const [idx, ...path] = chunk.path;
    if (idx === undefined) return chunk;

    const mappedIdx = mapping.get(idx);
    if (mappedIdx === undefined) throw new Error("Path not found");

    return {
      ...chunk,
      path: [mappedIdx, ...path],
    };
  };
};
