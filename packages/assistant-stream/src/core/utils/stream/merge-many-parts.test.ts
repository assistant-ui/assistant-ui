import { describe, expect, it } from "vitest";
import {
  createAssistantStream,
  createAssistantStreamController,
} from "../../modules/assistant-stream";
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
  it("keeps a write from an idle part behind a part-start that waits on a busy part", async () => {
    const [stream, controller] = createAssistantStreamController();
    const reader = stream.getReader();
    const seen: string[] = [];
    const read = async (limit = Infinity) => {
      for (let i = 0; i < limit; i++) {
        const { done, value } = await reader.read();
        if (done) return;
        seen.push(
          value.type === "part-start"
            ? "start"
            : value.type === "text-delta"
              ? `${value.path.join(".")}:${value.textDelta}`
              : `${value.type}:${value.path.join(".")}`,
        );
      }
    };

    const busy = controller.addTextPart();
    const idle = controller.addTextPart();
    idle.append("i0");
    await read(3);
    busy.append("a1");
    busy.append("a2");
    busy.append("a3");
    const third = controller.addTextPart();
    idle.append("late");
    third.append("c");
    busy.close();
    idle.close();
    third.close();
    controller.close();
    await read();

    const starts = seen.flatMap((item, index) =>
      item === "start" ? [index] : [],
    );
    expect(starts).toHaveLength(3);
    expect(seen.indexOf("1:late")).toBeGreaterThan(starts[2]!);
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
    expect(performance.now() - started).toBeLessThan(5000);
  });
});
