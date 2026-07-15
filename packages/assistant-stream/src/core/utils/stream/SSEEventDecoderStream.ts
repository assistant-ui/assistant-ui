import { SSEEventDecoder } from "./SSEEventDecoder";
import type { SSEEvent } from "./SSEEventDecoder";

export type PipelineSSEEvent = {
  event: string;
  data: string;
  id?: string;
  retry?: number;
};

export class SSEEventDecoderStream extends TransformStream<
  string,
  PipelineSSEEvent
> {
  constructor() {
    const decoder = new SSEEventDecoder({ trailing: "drop" });
    const normalize = (event: SSEEvent): PipelineSSEEvent => ({
      ...event,
      event: event.event ?? "message",
    });

    super({
      transform(chunk, controller) {
        for (const event of decoder.push(chunk)) {
          controller.enqueue(normalize(event));
        }
      },
      flush(controller) {
        const event = decoder.flush();
        if (event) controller.enqueue(normalize(event));
      },
    });
  }
}
