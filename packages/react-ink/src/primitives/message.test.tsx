import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "ink";
import { cleanup } from "ink-testing-library";
import { renderFrame } from "../tests/helpers";
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

beforeEach(() => {
  h.message = { metadata: { custom: {} } };
});

afterEach(() => {
  cleanup();
});

describe("MessagePrimitive.Quote", () => {
  it("renders nothing for a message without a quote", async () => {
    const frame = await renderFrame(
      <MessagePrimitive.Quote>
        {({ text }) => <Text>quote: {text}</Text>}
      </MessagePrimitive.Quote>,
    );

    expect(frame).not.toContain("quote:");
  });

  it("passes the quote text and source message id to its child", async () => {
    h.message = {
      metadata: { custom: { quote: { text: "quoted text", messageId: "m1" } } },
    };

    const frame = await renderFrame(
      <MessagePrimitive.Quote>
        {({ text, messageId }) => (
          <Text>
            {messageId}: {text}
          </Text>
        )}
      </MessagePrimitive.Quote>,
    );

    expect(frame).toContain("m1: quoted text");
  });
});
