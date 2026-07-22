import { describe, expect, it, vi } from "vitest";
import { createAssistantStreamController } from "./assistant-stream";
import { ToolResponse } from "../tool/ToolResponse";
import { toolResultStream } from "../tool/toolResultStream";
import type { ToolCallReader } from "../tool/tool-types";

type Reader = ToolCallReader<Record<string, unknown>, unknown>;

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
    const drain = output.pipeTo(new WritableStream());

    const toolCall = controller.addToolCallPart({
      toolCallId: "tool-1",
      toolName: "weatherSearch",
    });
    toolCall.argsText.append('{"query":"London","longitude":0');
    const reader = await toolReaderPromise;
    expect(await reader.args.get("query")).toBe("London");

    toolCall.setResponse(new ToolResponse({ result: { source: "backend" } }));
    toolCall.close();
    controller.close();

    const response = await reader.response.get();
    expect(response.result).toEqual({ source: "backend" });
    expect(response.isError).toBe(false);
    expect(execute).not.toHaveBeenCalled();
    await drain;
  });
});
