import { describe, expect, it, vi } from "vitest";
import type { AssistantMessage } from "../utils/types";
import { AssistantMessageStream } from "./AssistantMessageStream";

const message: AssistantMessage = {
  role: "assistant",
  status: { type: "running" },
  parts: [],
  content: [],
  metadata: {
    unstable_state: null,
    unstable_data: [],
    unstable_annotations: [],
    steps: [],
    custom: {},
  },
};

describe("AssistantMessageStream", () => {
  it("cancels and unlocks the source when iteration stops early", async () => {
    const cancel = vi.fn();
    const readable = new ReadableStream<AssistantMessage>({
      start(controller) {
        controller.enqueue(message);
        controller.enqueue(message);
      },
      cancel,
    });
    const stream = new AssistantMessageStream(readable);

    const values: AssistantMessage[] = [];
    for await (const value of stream) {
      values.push(value);
      break;
    }

    expect(values).toEqual([message]);
    expect(cancel).toHaveBeenCalledOnce();
    expect(readable.locked).toBe(false);
  });

  it("unlocks a fully consumed source without cancelling it", async () => {
    const cancel = vi.fn();
    const readable = new ReadableStream<AssistantMessage>({
      start(controller) {
        controller.enqueue(message);
        controller.close();
      },
      cancel,
    });
    const stream = new AssistantMessageStream(readable);

    const values: AssistantMessage[] = [];
    for await (const value of stream) {
      values.push(value);
    }

    expect(values).toEqual([message]);
    expect(cancel).not.toHaveBeenCalled();
    expect(readable.locked).toBe(false);
  });
});
