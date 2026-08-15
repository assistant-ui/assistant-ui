import { describe, expect, it } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import { provideAui } from "../provideAui";
import { useAuiState } from "../useAuiState";
import { messageParts } from "../primitives/messageParts";
import { threadMessages } from "../primitives/threadMessages";
import Host from "./fixtures/Host.svelte";
import { createEchoRuntime, type AnyClient } from "./clients";

const toolCall = (overrides?: Record<string, unknown>) => ({
  type: "tool-call",
  toolCallId: "call-1",
  toolName: "get_weather",
  args: { city: "Berlin" },
  argsText: '{"city":"Berlin"}',
  ...overrides,
});

const mountParts = (
  seed: Parameters<ReturnType<typeof createEchoRuntime>["setMessages"]>[0],
) => {
  const echo = createEchoRuntime();
  echo.setMessages(seed);
  let aui!: AnyClient;
  let messages!: ReturnType<typeof threadMessages>;
  const app = mount(Host, {
    target: document.createElement("div"),
    props: {
      setup: () => {
        aui = provideAui(
          AuiConfig({ threads: RuntimeAdapter(echo.runtime) }),
        ) as AnyClient;
        messages = threadMessages();
      },
    },
  });
  return { app, echo, aui, messages: () => messages };
};

describe("messageParts", () => {
  it("exposes the status-bearing part states of the scoped message", () => {
    const { app, messages } = mountParts([
      {
        id: "a0",
        role: "assistant",
        text: "",
        parts: [
          { type: "reasoning", text: "thinking it through" },
          { type: "text", text: "The weather is sunny." },
          toolCall(),
        ],
      },
    ]);
    const item = messages().item(0);
    item.source.subscribe(() => {});
    const parts = messageParts({ item });

    expect(parts.items.map((part) => part.type)).toEqual([
      "reasoning",
      "text",
      "tool-call",
    ]);
    expect(parts.items[1]).toMatchObject({ text: "The weather is sunny." });
    expect(parts.items[2]).toMatchObject({ toolName: "get_weather" });
    expect(parts.items[0]!.status).toBeDefined();

    flushSync(() => void unmount(app));
  });

  it("scopes s.part reads and updates through the item handle", () => {
    const { app, echo, messages } = mountParts([
      {
        id: "a0",
        role: "assistant",
        text: "",
        parts: [{ type: "text", text: "first" }],
      },
    ]);
    const message = messages().item(0);
    message.source.subscribe(() => {});
    const parts = messageParts({ item: message });
    const part = parts.item(0);
    part.source.subscribe(() => {});
    const text = useAuiState(
      (s) => (s.part.type === "text" ? s.part.text : ""),
      { item: part },
    );

    expect(text.current).toBe("first");

    flushTapSync(() =>
      echo.setMessages([
        {
          id: "a0",
          role: "assistant",
          text: "",
          parts: [{ type: "text", text: "second" }],
        },
      ]),
    );
    expect(text.current).toBe("second");

    flushSync(() => void unmount(app));
  });

  it("routes addToolResult through the part scope", () => {
    const { app, echo, messages } = mountParts([
      {
        id: "a0",
        role: "assistant",
        text: "",
        parts: [toolCall()],
      },
    ]);
    const message = messages().item(0);
    message.source.subscribe(() => {});
    const parts = messageParts({ item: message });
    const tool = parts.item(0);
    tool.source.subscribe(() => {});

    flushTapSync(() => tool.aui.part.addToolResult({ temperature: 21 }));
    expect(echo.onAddToolResult).toHaveBeenCalledTimes(1);
    expect(echo.onAddToolResult.mock.calls[0]![0]).toMatchObject({
      toolCallId: "call-1",
    });

    flushSync(() => void unmount(app));
  });

  it("keeps the last valid part while observed after a shrink", () => {
    const { app, echo, messages } = mountParts([
      {
        id: "a0",
        role: "assistant",
        text: "",
        parts: [
          { type: "text", text: "one" },
          { type: "text", text: "two" },
        ],
      },
    ]);
    const message = messages().item(0);
    message.source.subscribe(() => {});
    const parts = messageParts({ item: message });
    const second = parts.item(1);
    second.source.subscribe(() => {});
    const text = useAuiState(
      (s) => (s.part.type === "text" ? s.part.text : ""),
      { item: second },
    );
    expect(text.current).toBe("two");

    flushTapSync(() =>
      echo.setMessages([
        {
          id: "a0",
          role: "assistant",
          text: "",
          parts: [{ type: "text", text: "one" }],
        },
      ]),
    );
    expect(text.current).toBe("two");

    flushSync(() => void unmount(app));
  });
});
