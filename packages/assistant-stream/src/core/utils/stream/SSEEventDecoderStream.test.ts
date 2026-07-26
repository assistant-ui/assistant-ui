import { describe, expect, it } from "vitest";
import {
  SSEEventDecoderStream,
  type PipelineSSEEvent,
} from "./SSEEventDecoderStream";

const collectEvents = async (chunks: string[]): Promise<PipelineSSEEvent[]> => {
  const stream = new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  }).pipeThrough(new SSEEventDecoderStream());

  const events: PipelineSSEEvent[] = [];
  for await (const event of stream as unknown as AsyncIterable<PipelineSSEEvent>) {
    events.push(event);
  }
  return events;
};

describe("SSEEventDecoderStream", () => {
  it("defaults unnamed events to message", async () => {
    const events = await collectEvents(["data: hello\n\n"]);
    expect(events).toEqual([{ event: "message", data: "hello" }]);
  });

  it("normalizes an explicit empty event field to message", async () => {
    const events = await collectEvents(["event:\ndata: hello\n\n"]);
    expect(events).toEqual([{ event: "message", data: "hello" }]);
  });

  it("passes named events through", async () => {
    const events = await collectEvents(["event: custom\ndata: hello\n\n"]);
    expect(events).toEqual([{ event: "custom", data: "hello" }]);
  });

  it("drops an unterminated trailing frame", async () => {
    const events = await collectEvents(["data: partial\n"]);
    expect(events).toEqual([]);
  });
});
