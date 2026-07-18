import { describe, it, expect } from "vitest";
import {
  createAssistantStream,
  createAssistantStreamResponse,
} from "./assistant-stream";
import { AssistantStream } from "../AssistantStream";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import { DataStreamDecoder } from "../serialization/data-stream/DataStream";
import { AssistantMessageAccumulator } from "../accumulators/assistant-message-accumulator";
import type { AssistantMessage } from "../utils/types";

const accumulate = async (response: Response): Promise<AssistantMessage> => {
  const stream = AssistantStream.fromResponse(
    response,
    new DataStreamDecoder(),
  );
  let last: AssistantMessage | undefined;
  await stream.pipeThrough(new AssistantMessageAccumulator()).pipeTo(
    new WritableStream({
      write(message) {
        last = message;
      },
    }),
  );
  return last!;
};

const collectChunks = async (
  stream: AssistantStream,
): Promise<AssistantStreamChunk[]> => {
  const chunks: AssistantStreamChunk[] = [];
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        chunks.push(chunk);
      },
    }),
  );
  return chunks;
};

const captureUnhandledRejections = async (
  callback: () => Promise<void>,
): Promise<unknown[]> => {
  const reasons: unknown[] = [];
  const listener = (reason: unknown) => reasons.push(reason);
  process.on("unhandledRejection", listener);
  try {
    await callback();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return reasons;
  } finally {
    process.off("unhandledRejection", listener);
  }
};

describe("createAssistantStream task settlement", () => {
  it("emits callback failures without leaking an unhandled rejection", async () => {
    let chunks: AssistantStreamChunk[] = [];
    const unhandledRejections = await captureUnhandledRejections(async () => {
      chunks = await collectChunks(
        createAssistantStream(async () => {
          throw new Error("provider failed");
        }),
      );
    });

    expect(chunks).toEqual([
      {
        type: "error",
        path: [],
        error: "Error: provider failed",
      },
    ]);
    expect(unhandledRejections).toEqual([]);
  });

  it("does not settle the stream again after cancellation", async () => {
    let finishCallback!: () => void;
    const callbackPending = new Promise<void>((resolve) => {
      finishCallback = resolve;
    });

    const unhandledRejections = await captureUnhandledRejections(async () => {
      const reader = createAssistantStream(() => callbackPending).getReader();
      await reader.cancel("consumer stopped");
      finishCallback();
      await callbackPending;
    });

    expect(unhandledRejections).toEqual([]);
  });
});

describe("AssistantStreamController withParentId", () => {
  it("attaches parentId to text parts across a data-stream round trip", async () => {
    const response = createAssistantStreamResponse((controller) => {
      controller.appendText("intro");
      const group = controller.withParentId("group-1");
      group.appendSource({
        type: "source",
        sourceType: "url",
        id: "s1",
        url: "https://example.com",
        title: "Example",
      });
      group.appendText("grouped text");
    });

    const message = await accumulate(response);
    const intro = message.parts.find(
      (p) => p.type === "text" && p.text === "intro",
    );
    const grouped = message.parts.find(
      (p) => p.type === "text" && p.text === "grouped text",
    );
    const source = message.parts.find((p) => p.type === "source");

    expect(intro?.parentId).toBeUndefined();
    expect(grouped?.parentId).toBe("group-1");
    expect(source?.parentId).toBe("group-1");
  });

  it("attaches parentId to reasoning parts across a data-stream round trip", async () => {
    const response = createAssistantStreamResponse((controller) => {
      controller.appendReasoning("thinking out loud");
      const group = controller.withParentId("group-1");
      group.appendReasoning("grouped reasoning");
    });

    const message = await accumulate(response);
    const ungrouped = message.parts.find(
      (p) => p.type === "reasoning" && p.text === "thinking out loud",
    );
    const grouped = message.parts.find(
      (p) => p.type === "reasoning" && p.text === "grouped reasoning",
    );

    expect(ungrouped?.parentId).toBeUndefined();
    expect(grouped?.parentId).toBe("group-1");
  });

  it("opens a new text part when withParentId switches between ids", async () => {
    const response = createAssistantStreamResponse((controller) => {
      controller.withParentId("group-1").appendText("first");
      controller.withParentId("group-2").appendText("second");
    });

    const message = await accumulate(response);
    const first = message.parts.find(
      (p) => p.type === "text" && p.text === "first",
    );
    const second = message.parts.find(
      (p) => p.type === "text" && p.text === "second",
    );

    expect(first?.parentId).toBe("group-1");
    expect(second?.parentId).toBe("group-2");
  });

  it("attaches parentId on addTextPart called directly inside a withParentId scope", async () => {
    const response = createAssistantStreamResponse((controller) => {
      const part = controller.withParentId("group-1").addTextPart();
      part.append("explicit");
      part.close();
    });

    const message = await accumulate(response);
    const text = message.parts.find(
      (p) => p.type === "text" && p.text === "explicit",
    );

    expect(text?.parentId).toBe("group-1");
  });
});
