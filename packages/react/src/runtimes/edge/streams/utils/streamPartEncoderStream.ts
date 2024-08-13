import { PipeableTransformStream } from "./PipeableTransformStream";
import { StreamPart } from "./StreamPart";

function encodeStreamPart<T extends Record<string, unknown>>({
  type,
  value,
}: StreamPart<T>): string {
  return `${type as string}:${JSON.stringify(value)}\n`;
}

export function streamPartEncoderStream<T extends Record<string, unknown>>() {
  const encodeStream = new TransformStream<StreamPart<T>, string>({
    transform(chunk, controller) {
      controller.enqueue(encodeStreamPart<T>(chunk));
    },
  });

  return new PipeableTransformStream((readable) => {
    return readable
      .pipeThrough(encodeStream)
      .pipeThrough(new TextEncoderStream());
  });
}
