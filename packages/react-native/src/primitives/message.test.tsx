import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import * as MessagePrimitive from "./message";

const h = vi.hoisted(() => ({
  message: { metadata: { custom: {} } as { custom: Record<string, unknown> } },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: <T,>(selector: (state: typeof h) => T) => selector(h),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("MessagePrimitive.Quote", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.message = { metadata: { custom: {} } };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const render = async (element: ReactElement) => {
    await act(async () => {
      root.render(element);
    });
  };

  it("renders nothing for a message without a quote", async () => {
    await render(
      <MessagePrimitive.Quote>
        {({ text }) => <Text testID="quote">{text}</Text>}
      </MessagePrimitive.Quote>,
    );

    expect(container.querySelector('[data-testid="quote"]')).toBeNull();
  });

  it("passes the quote text and source message id to its child", async () => {
    h.message = {
      metadata: { custom: { quote: { text: "quoted text", messageId: "m1" } } },
    };

    await render(
      <MessagePrimitive.Quote>
        {({ text, messageId }) => (
          <Text testID="quote">
            {messageId}: {text}
          </Text>
        )}
      </MessagePrimitive.Quote>,
    );

    expect(container.querySelector('[data-testid="quote"]')?.textContent).toBe(
      "m1: quoted text",
    );
  });
});
