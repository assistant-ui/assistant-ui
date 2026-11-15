import { describe, expect, it } from "vitest";
import { createAssistantStream } from "../../modules/assistant-stream";
import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { DataStreamDecoder } from "../../serialization/data-stream/DataStream";
import { AssistantMessageAccumulator } from "../../accumulators/assistant-message-accumulator";

const collect = async (stream: ReadableStream<AssistantStreamChunk>) => {
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

describe("merge stream with many open parts", () => {
  it("keeps a write from an idle part after a later part-start", async () => {
    const chunks = await collect(
      createAssistantStream(async (controller) => {
        const first = controller.addTextPart();
        first.append("a");
        // let "a" be delivered so the first part is idle
        await new Promise((resolve) => setTimeout(resolve, 0));
        const second = controller.addTextPart();
        first.append("b");
        second.append("c");
        first.close();
        second.close();
      }),
    );

    const summary = chunks.map((chunk) =>
      chunk.type === "part-start"
        ? `start:${chunk.path.join(".")}`
        : chunk.type === "text-delta"
          ? `${chunk.path.join(".")}:${chunk.textDelta}`
          : `${chunk.type}:${chunk.path.join(".")}`,
    );
    const starts = summary
      .map((item, index) => (item === "start:" ? index : -1))
      .filter((index) => index >= 0);
    expect(starts).toHaveLength(2);
    // "b" was written after the second part-start, so it follows it
    expect(summary.indexOf("0:b")).toBeGreaterThan(starts[1]!);
    expect(summary.indexOf("0:a")).toBeLessThan(starts[1]!);
  });

  it("delivers every chunk of many open tool calls in order per part", async () => {
    const count = 500;
    const chunks = await collect(
      createAssistantStream((controller) => {
        const calls = Array.from({ length: count }, (_, i) =>
          controller.addToolCallPart({ toolCallId: `t${i}`, toolName: "x" }),
        );
        for (const call of calls) call.argsText.append("{}");
        for (const call of calls) call.argsText.close();
        for (const call of calls) call.close();
      }),
    );

    const starts = chunks.filter((chunk) => chunk.type === "part-start");
    expect(starts).toHaveLength(count);
    for (let i = 0; i < count; i++) {
      const own = chunks.filter((chunk) => chunk.path[0] === i);
      const types = own.map((chunk) => chunk.type);
      expect(types[0]).toBe("text-delta");
      expect(types.at(-1)).toBe("part-finish");
      expect(types.indexOf("tool-call-args-text-finish")).toBeGreaterThan(0);
    }
  });

  it("decodes thousands of tool-call starts without slowing down per part", async () => {
    const count = 5000;
    let body = "";
    for (let i = 0; i < count; i++) {
      body += `b:${JSON.stringify({ toolCallId: `t${i}`, toolName: "x" })}\n`;
    }
    const bytes = new TextEncoder().encode(body);

    const started = performance.now();
    let parts = 0;
    await new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    })
      .pipeThrough(new DataStreamDecoder())
      .pipeThrough(new AssistantMessageAccumulator())
      .pipeTo(
        new WritableStream({
          write(message) {
            parts = message.parts.length;
          },
        }),
      );

    expect(parts).toBe(count);
    // took about 10 s before merging stopped visiting every open part
    expect(performance.now() - started).toBeLessThan(5000);
  });
});
