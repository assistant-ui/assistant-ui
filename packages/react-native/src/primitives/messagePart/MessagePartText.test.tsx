import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/core";
import {
  AssistantRuntimeProvider,
  MessageByIndexProvider,
  PartByIndexProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/core/react";
import { MessagePartPrimitiveText } from "./MessagePartText";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const messages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      { type: "text", text: "Answer" },
      { type: "reasoning", text: "Thinking" },
      { type: "image", image: "https://example.com/image.png" },
    ],
  },
];

const App = ({ partIndex }: { partIndex: number }) => {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message) => message,
    onNew: async () => {
      throw new Error("This thread is read-only");
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MessageByIndexProvider index={0}>
        <PartByIndexProvider index={partIndex}>
          <MessagePartPrimitiveText testID="text" />
        </PartByIndexProvider>
      </MessageByIndexProvider>
    </AssistantRuntimeProvider>
  );
};

describe("MessagePartPrimitiveText", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const mount = async (partIndex: number) => {
    await act(async () => root.render(<App partIndex={partIndex} />));
    return container.querySelector('[data-testid="text"]') as HTMLElement;
  };

  it("renders text from the current text part", async () => {
    const text = await mount(0);
    expect(text.textContent).toBe("Answer");
  });

  it("renders text from the current reasoning part", async () => {
    const text = await mount(1);
    expect(text.textContent).toBe("Thinking");
  });

  it("renders empty text for a non-text part", async () => {
    const text = await mount(2);
    expect(text.textContent).toBe("");
  });
});
