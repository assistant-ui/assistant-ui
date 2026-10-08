import { getClientId } from "@assistant-ui/store";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { flushTapSync } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import { AssistantRuntimeImpl } from "../../runtime/api/assistant-runtime";
import type { ThreadMessageLike } from "../../runtime/utils/thread-message-like";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";
import { ExternalStoreRuntimeCore } from "../../runtimes/external-store/external-store-runtime-core";
import { MessageClient } from "./message-runtime-client";

const createMessageClient = (content: ThreadMessageLike["content"]) => {
  const adapter = (
    content: ThreadMessageLike["content"],
  ): ExternalStoreAdapter<ThreadMessageLike> => ({
    messages: [{ id: "message", role: "assistant", content }],
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(adapter(content));
  const runtime = new AssistantRuntimeImpl(core);
  const handle = createAssistantClient(
    AuiConfig({
      message: MessageClient({
        runtime: runtime.thread.getMessageByIndex(0),
        threadId: "thread",
        threadIdRef: { current: "thread" },
      }),
    }),
  );
  const unsubscribe = handle.subscribe(() => {});
  return {
    message: handle.getClient().message,
    setContent: (content: ThreadMessageLike["content"]) =>
      flushTapSync(() => core.setAdapter(adapter(content))),
    destroy: () => {
      unsubscribe();
      handle.destroy();
    },
  };
};

describe("MessageClient part identity", () => {
  it.each([
    { type: "text", text: "old" },
    { type: "reasoning", text: "old" },
    { type: "data", name: "value", data: "old" },
    { type: "file", mimeType: "text/plain", data: "old" },
    { type: "image", image: "https://example.com/old.png" },
    { type: "source", sourceType: "url", url: "https://example.com" },
    { type: "generative-ui", spec: { root: "old" } },
  ] as const)(
    "replaces the $type client when the id at its index changes",
    (part) => {
      const client = createMessageClient([{ ...part, id: "p1" }]);
      try {
        const first = getClientId(client.message.part({ index: 0 }));
        client.setContent([{ ...part, id: "p2" }]);
        expect(getClientId(client.message.part({ index: 0 }))).not.toBe(first);
        expect(client.message.part({ index: 0 }).getState()).toMatchObject({
          id: "p2",
        });
      } finally {
        client.destroy();
      }
    },
  );

  it("keeps clients with their ids on reorder and resolves tool calls by id", () => {
    const tool = {
      type: "tool-call",
      toolCallId: "p1",
      toolName: "task",
      args: {},
    } as const;
    const client = createMessageClient([
      { type: "text", id: "p1", text: "old" },
      { type: "text", id: "p2", text: "other" },
      tool,
    ]);
    try {
      const first = getClientId(client.message.part({ index: 0 }));
      const second = getClientId(client.message.part({ index: 1 }));
      const toolClient = getClientId(client.message.part({ toolCallId: "p1" }));
      expect(toolClient).toBe(getClientId(client.message.part({ index: 2 })));
      expect(toolClient).not.toBe(first);
      client.setContent([
        tool,
        { type: "text", id: "p2", text: "other streamed" },
        { type: "text", id: "p1", text: "old streamed" },
      ]);
      expect(getClientId(client.message.part({ toolCallId: "p1" }))).toBe(
        toolClient,
      );
      expect(getClientId(client.message.part({ index: 0 }))).toBe(toolClient);
      expect(getClientId(client.message.part({ index: 1 }))).toBe(second);
      expect(getClientId(client.message.part({ index: 2 }))).toBe(first);
      expect(client.message.part({ index: 2 }).getState()).toMatchObject({
        text: "old streamed",
      });
    } finally {
      client.destroy();
    }
  });

  it("uses type and position for empty ids and replaces clients on type changes", () => {
    const client = createMessageClient([{ type: "text", text: "old" }]);
    try {
      const first = getClientId(client.message.part({ index: 0 }));
      client.setContent([{ type: "text", id: "", text: "streamed" }]);
      expect(getClientId(client.message.part({ index: 0 }))).toBe(first);
      client.setContent([
        { type: "image", image: "https://example.com/new.png" },
      ]);
      expect(getClientId(client.message.part({ index: 0 }))).not.toBe(first);
    } finally {
      client.destroy();
    }
  });

  it("gives duplicate tool ids separate clients and resolves the first claim", () => {
    const tool = {
      type: "tool-call",
      toolCallId: "call",
      toolName: "task",
      args: {},
    } as const;
    const client = createMessageClient([tool, tool]);
    try {
      const first = getClientId(client.message.part({ index: 0 }));
      const second = getClientId(client.message.part({ index: 1 }));
      expect(second).not.toBe(first);
      expect(getClientId(client.message.part({ toolCallId: "call" }))).toBe(
        first,
      );
      expect(client.message.getState().parts).toHaveLength(2);
    } finally {
      client.destroy();
    }
  });
});
