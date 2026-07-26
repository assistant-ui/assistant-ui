import sjson from "secure-json-parse";
import type { DataStreamChunk, DataStreamStreamChunkType } from "./chunk-types";

export class DataStreamChunkEncoder extends TransformStream<
  DataStreamChunk,
  string
> {
  constructor() {
    super({
      transform: (chunk, controller) => {
        controller.enqueue(`${chunk.type}:${JSON.stringify(chunk.value)}\n`);
      },
    });
  }
}

export class DataStreamChunkDecoder extends TransformStream<
  string,
  DataStreamChunk
> {
  constructor() {
    super({
      transform: (chunk, controller) => {
        const index = chunk.indexOf(":");
        if (index === -1) throw new Error("Invalid stream part");
        let value;
        try {
          value = sjson.parse(chunk.slice(index + 1));
        } catch {
          console.warn(
            `Dropped invalid data-stream chunk: ${chunk.slice(0, 200)}`,
          );
          return;
        }
        controller.enqueue({
          type: chunk.slice(0, index) as DataStreamStreamChunkType,
          value,
        });
      },
    });
  }
}
