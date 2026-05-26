import { describe, it, expect } from "vitest";
import { createAssistantStreamResponse } from "./assistant-stream";
import { AssistantStream } from "../AssistantStream";
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
});
