import { describe, expect, it } from "vitest";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ThreadMessageLike } from "@assistant-ui/core";
import { useExternalMessageConverter } from "@assistant-ui/core/react";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type Metadata = useExternalMessageConverter.Metadata & {
  uiByParentId: Record<string, { value: number }>;
};

const MESSAGE_COUNT = 1_000;
const messages: Message[] = Array.from(
  { length: MESSAGE_COUNT },
  (_, index) => ({
    id: `message-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    text: `Message ${index}`,
  }),
);

describe("LangGraph-style UI metadata invalidation", () => {
  it("re-converts only the parent whose UI metadata changes", () => {
    let conversions = 0;
    let updateLastParentUI!: () => void;
    const callback = (message: Message): ThreadMessageLike => {
      conversions += 1;
      return {
        id: message.id,
        role: message.role,
        content: [{ type: "text", text: message.text }],
      };
    };
    const getMetadataKey: useExternalMessageConverter.GetMetadataKey<
      Message
    > = (message, metadata) => (metadata as Metadata).uiByParentId[message.id];

    const App = () => {
      const [uiByParentId, setUIByParentId] = useState<
        Metadata["uiByParentId"]
      >({});
      updateLastParentUI = () =>
        setUIByParentId({
          [`message-${MESSAGE_COUNT - 1}`]: { value: 1 },
        });
      useExternalMessageConverter({
        callback,
        messages,
        isRunning: false,
        metadata: { uiByParentId } as Metadata,
        getMetadataKey,
      });
      return null;
    };

    const root = createRoot(document.createElement("div"));
    act(() => root.render(createElement(App)));
    expect(conversions).toBe(MESSAGE_COUNT);

    act(updateLastParentUI);
    expect(conversions).toBe(MESSAGE_COUNT + 1);

    act(() => root.unmount());
  });

  it("re-converts the full history without a message metadata key", () => {
    let conversions = 0;
    let updateLastParentUI!: () => void;
    const callback = (message: Message): ThreadMessageLike => {
      conversions += 1;
      return {
        id: message.id,
        role: message.role,
        content: [{ type: "text", text: message.text }],
      };
    };

    const App = () => {
      const [uiByParentId, setUIByParentId] = useState<
        Metadata["uiByParentId"]
      >({});
      updateLastParentUI = () =>
        setUIByParentId({
          [`message-${MESSAGE_COUNT - 1}`]: { value: 1 },
        });
      useExternalMessageConverter({
        callback,
        messages,
        isRunning: false,
        metadata: { uiByParentId } as Metadata,
      });
      return null;
    };

    const root = createRoot(document.createElement("div"));
    act(() => root.render(createElement(App)));
    expect(conversions).toBe(MESSAGE_COUNT);

    act(updateLastParentUI);
    expect(conversions).toBe(2 * MESSAGE_COUNT);

    act(() => root.unmount());
  });
});
