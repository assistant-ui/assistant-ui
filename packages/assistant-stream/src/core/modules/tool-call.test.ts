import { afterEach, describe, expect, it, vi } from "vitest";
import { createAssistantStreamController } from "./assistant-stream";
import { createToolCallStreamController } from "./tool-call";
import { ToolResponse } from "../tool/ToolResponse";
import { toolResultStream } from "../tool/toolResultStream";
import type { ToolCallReader } from "../tool/tool-types";
import type { AssistantStream } from "../AssistantStream";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";

type Reader = ToolCallReader<Record<string, unknown>, unknown>;

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

describe("ToolCallStreamController argsText strict flag", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when appending args after close by default", () => {
    const [stream, controller] = createToolCallStreamController();
    void stream;
    controller.argsText.close();
    expect(() => controller.argsText.append("late")).toThrow(TypeError);
  });

  it("drops args appended after close with strict: false", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const [stream, controller] = createToolCallStreamController({
      strict: false,
    });
    void stream;
    controller.argsText.close();
    expect(() => controller.argsText.append("late")).not.toThrow();
    expect(error).toHaveBeenCalledOnce();
  });

  it("inherits strict: false from the assistant stream controller", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const [stream, controller] = createAssistantStreamController({
      strict: false,
    });
    void stream;
    const toolCall = controller.addToolCallPart("lookup");
    toolCall.argsText.close();
    expect(() => toolCall.argsText.append("late")).not.toThrow();
  });
});

describe("ToolCallStreamController", () => {
  it("delivers a backend response before an args parse failure", async () => {
    const [stream, controller] = createAssistantStreamController();
    let resolveToolReader!: (reader: Reader) => void;
    const toolReaderPromise = new Promise<Reader>((resolve) => {
      resolveToolReader = resolve;
    });
    const streamCall = vi.fn((reader: Reader) => {
      resolveToolReader(reader);
    });
    const execute = vi.fn();
    const output = stream.pipeThrough(
      toolResultStream(
        {
          weatherSearch: {
            parameters: { type: "object", properties: {} },
            execute,
            streamCall,
          },
        },
        new AbortController().signal,
        async () => undefined,
      ),
    );
    const chunks: AssistantStreamChunk[] = [];
    const drain = output.pipeTo(
      new WritableStream({
        write(chunk) {
          chunks.push(chunk);
        },
      }),
    );

    const toolCall = controller.addToolCallPart({
      toolCallId: "tool-1",
      toolName: "weatherSearch",
    });
    toolCall.argsText.append('{"query":"London","longitude":0');
    const reader = await toolReaderPromise;
    expect(await reader.args.get("query")).toBe("London");

    toolCall.setResponse(
      new ToolResponse({
        result: { source: "backend" },
        messages: [{ role: "assistant", content: [] }],
      }),
    );
    toolCall.close();
    controller.close();

    const response = await reader.response.get();
    expect(response.result).toEqual({ source: "backend" });
    expect(response.isError).toBe(false);
    expect(response.messages).toEqual([{ role: "assistant", content: [] }]);
    expect(execute).not.toHaveBeenCalled();
    await drain;
    const results = chunks.filter((chunk) => chunk.type === "result");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      result: { source: "backend" },
      isError: false,
      messages: [{ role: "assistant", content: [] }],
    });
  });

  it("setResponse settles the part without an explicit close", async () => {
    const [stream, controller] = createToolCallStreamController();
    controller.setResponse({ result: "done" });

    const chunks = await collectChunks(stream);

    expect(chunks.map((c) => c.type)).toContain("result");
    expect(chunks.at(-1)?.type).toBe("part-finish");
  });

  it("ignores a second setResponse after the part is settled", async () => {
    const [stream, controller] = createToolCallStreamController();
    controller.setResponse({ result: "first" });
    controller.setResponse({ result: "second" });

    const chunks = await collectChunks(stream);

    const results = chunks.filter((c) => c.type === "result");
    expect(results).toEqual([expect.objectContaining({ result: "first" })]);
    expect(chunks.filter((c) => c.type === "part-finish")).toHaveLength(1);
  });

  it("ignores setResponse after an explicit close", async () => {
    const [stream, controller] = createToolCallStreamController();
    controller.argsText.append('{"query":"x"}');
    controller.close();
    controller.setResponse({ result: "late" });

    const chunks = await collectChunks(stream);

    expect(chunks.filter((c) => c.type === "result")).toHaveLength(0);
    expect(chunks.at(-1)?.type).toBe("part-finish");
  });
});
