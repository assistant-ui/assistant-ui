import { chunkByLineStream } from "./chunkByLineStream";
import { PipeableTransformStream } from "./PipeableTransformStream";
import { StreamPart } from "./StreamPart";

const decodeStreamPart = <T extends Record<string, unknown>>(
  part: string,
): StreamPart<T> => {
  const index = part.indexOf(":");
  if (index === -1) throw new Error("Invalid stream part");
  return {
    type: part.slice(0, index),
    value: JSON.parse(part.slice(index + 1)),
  };
};

export function streamPartDecoderStream<T extends Record<string, unknown>>() {
  const decodeStream = new TransformStream<string, StreamPart<T>>({
    transform(chunk, controller) {
      controller.enqueue(decodeStreamPart<T>(chunk));
    },
  });

  return new PipeableTransformStream((readable) => {
    return readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(chunkByLineStream())
      .pipeThrough(decodeStream);
  });
}
