import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageIf } from "./MessageIf";

const h = vi.hoisted(() => ({
  message: {
    role: "assistant" as "user" | "assistant" | "system",
    status: { type: "complete" as "running" | "complete" | "incomplete" },
    isLast: false,
  },
}));

vi.mock("@assistant-ui/store", () => ({
  useAuiState: <T,>(selector: (s: { message: typeof h.message }) => T) =>
    selector({ message: h.message }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("MessageIf", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.message.role = "assistant";
    h.message.status = { type: "complete" };
    h.message.isLast = false;

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

  const mount = async (
    props: Partial<Parameters<typeof MessageIf>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <MessageIf {...props}>
          <Text testID="child">visible</Text>
        </MessageIf>,
      );
    });
    return container.querySelector('[data-testid="child"]');
  };

  it("renders children when no guard is set", async () => {
    expect(await mount()).not.toBeNull();
  });

  describe("user guard", () => {
    it("renders children when user:true matches a user message", async () => {
      h.message.role = "user";
      expect(await mount({ user: true })).not.toBeNull();
    });

    it("hides children when user:true but the message is from the assistant", async () => {
      h.message.role = "assistant";
      expect(await mount({ user: true })).toBeNull();
    });

    it("renders children when user:false matches a non-user message", async () => {
      h.message.role = "assistant";
      expect(await mount({ user: false })).not.toBeNull();
    });

    it("hides children when user:false but the message is from the user", async () => {
      h.message.role = "user";
      expect(await mount({ user: false })).toBeNull();
    });
  });

  describe("assistant guard", () => {
    it("renders children when assistant:true matches an assistant message", async () => {
      h.message.role = "assistant";
      expect(await mount({ assistant: true })).not.toBeNull();
    });

    it("hides children when assistant:true but the message is from the user", async () => {
      h.message.role = "user";
      expect(await mount({ assistant: true })).toBeNull();
    });

    it("renders children when assistant:false matches a non-assistant message", async () => {
      h.message.role = "user";
      expect(await mount({ assistant: false })).not.toBeNull();
    });
  });

  describe("running guard", () => {
    it("renders children when an assistant message is running", async () => {
      h.message.role = "assistant";
      h.message.status = { type: "running" };
      expect(await mount({ running: true })).not.toBeNull();
    });

    it("hides children when running:true but the assistant message is complete", async () => {
      h.message.role = "assistant";
      h.message.status = { type: "complete" };
      expect(await mount({ running: true })).toBeNull();
    });

    it("treats a running user message as not running", async () => {
      h.message.role = "user";
      h.message.status = { type: "running" };
      expect(await mount({ running: true })).toBeNull();
      expect(await mount({ running: false })).not.toBeNull();
    });
  });

  describe("last guard", () => {
    it("renders children when last:true matches the last message", async () => {
      h.message.isLast = true;
      expect(await mount({ last: true })).not.toBeNull();
    });

    it("hides children when last:true but the message is not last", async () => {
      h.message.isLast = false;
      expect(await mount({ last: true })).toBeNull();
    });

    it("renders children when last:false matches a non-last message", async () => {
      h.message.isLast = false;
      expect(await mount({ last: false })).not.toBeNull();
    });
  });

  describe("combined guards", () => {
    it("renders children only when assistant and last both match", async () => {
      h.message.role = "assistant";
      h.message.isLast = true;
      expect(await mount({ assistant: true, last: true })).not.toBeNull();
    });

    it("hides children when assistant matches but last does not", async () => {
      h.message.role = "assistant";
      h.message.isLast = false;
      expect(await mount({ assistant: true, last: true })).toBeNull();
    });

    it("hides children when last matches but assistant does not", async () => {
      h.message.role = "user";
      h.message.isLast = true;
      expect(await mount({ assistant: true, last: true })).toBeNull();
    });
  });
});
