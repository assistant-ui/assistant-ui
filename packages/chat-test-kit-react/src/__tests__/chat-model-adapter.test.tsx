import type { ChatModelAdapter } from "@assistant-ui/react";
import { describe, expect, it } from "vitest";
import { EventBridge } from "../harness/bridge";
import { buildChatModelAdapter } from "../harness/chat-model-adapter";

function fakeOptions(): Parameters<ChatModelAdapter["run"]>[0] {
  return {} as unknown as Parameters<ChatModelAdapter["run"]>[0];
}

describe("buildChatModelAdapter", () => {
  it("accumulates text-delta into cumulative content", async () => {
    const bridge = new EventBridge();
    const adapter = buildChatModelAdapter({ bridge });

    bridge.push({ type: "text-delta", delta: "Hel" });
    bridge.push({ type: "text-delta", delta: "lo" });
    bridge.push({ type: "finish", reason: "stop" });
    bridge.end();

    const yields = [];
    const gen = adapter.run(fakeOptions()) as AsyncGenerator<{
      content?: ReadonlyArray<{ type: string; text?: string }>;
      status?: unknown;
    }>;
    for await (const update of gen) yields.push(update);

    const texts = yields.map(
      (y) => y.content?.find((part) => part.type === "text")?.text ?? "",
    );
    expect(texts).toEqual(["Hel", "Hello", "Hello"]);
    expect(yields.at(-1)?.status).toEqual({ type: "complete", reason: "stop" });
  });

  it("yields tool-call without result, then with result on tool-result event", async () => {
    const bridge = new EventBridge();
    const adapter = buildChatModelAdapter({ bridge });

    bridge.push({
      type: "tool-call",
      toolCallId: "tc_1",
      toolName: "x",
      args: { a: 1 },
      argsText: '{"a":1}',
    });
    bridge.push({
      type: "tool-result",
      toolCallId: "tc_1",
      value: { ok: true },
    });
    bridge.push({ type: "finish", reason: "stop" });
    bridge.end();

    const yields: Array<{
      content?: ReadonlyArray<{ type: string; result?: unknown }>;
    }> = [];
    const gen = adapter.run(fakeOptions()) as AsyncGenerator<{
      content?: ReadonlyArray<{ type: string; result?: unknown }>;
    }>;
    for await (const update of gen) yields.push(update);

    const toolParts = yields.map((y) =>
      y.content?.find((part) => part.type === "tool-call"),
    );
    expect(toolParts[0]).toMatchObject({
      type: "tool-call",
      toolCallId: "tc_1",
      toolName: "x",
    });
    expect(toolParts[1]).toMatchObject({ result: { ok: true } });
  });

  it("transport-error event terminates the run with status reason 'error'", async () => {
    const bridge = new EventBridge();
    const adapter = buildChatModelAdapter({ bridge });

    bridge.push({ type: "transport-error", code: 500, message: "boom" });

    const yields = [] as Array<{ status?: { reason?: string } }>;
    const gen = adapter.run(fakeOptions()) as AsyncGenerator<{
      status?: { reason?: string };
    }>;
    for await (const update of gen) yields.push(update);

    expect(yields.at(-1)?.status?.reason).toBe("error");
  });

  it("disconnect event terminates the run with status reason 'error'", async () => {
    const bridge = new EventBridge();
    const adapter = buildChatModelAdapter({ bridge });

    bridge.push({ type: "disconnect" });

    const yields = [] as Array<{ status?: { reason?: string } }>;
    const gen = adapter.run(fakeOptions()) as AsyncGenerator<{
      status?: { reason?: string };
    }>;
    for await (const update of gen) yields.push(update);

    expect(yields.at(-1)?.status?.reason).toBe("error");
  });
});
