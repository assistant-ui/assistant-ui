import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadIf } from "./ThreadIf";

const h = vi.hoisted(() => ({
  thread: { messages: [] as unknown[], isRunning: false },
}));

vi.mock("@assistant-ui/store", () => ({
  useAuiState: <T,>(selector: (s: { thread: typeof h.thread }) => T) =>
    selector({ thread: h.thread }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ThreadIf", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.thread.messages = [];
    h.thread.isRunning = false;

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

  const mount = async (props: Partial<Parameters<typeof ThreadIf>[0]> = {}) => {
    await act(async () => {
      root.render(
        <ThreadIf {...props}>
          <Text testID="child">visible</Text>
        </ThreadIf>,
      );
    });
    return container.querySelector('[data-testid="child"]');
  };

  const setMessages = (count: number) => {
    h.thread.messages = Array.from({ length: count }, (_, i) => i);
  };

  it("renders children when no guard is set", async () => {
    setMessages(2);
    expect(await mount()).not.toBeNull();
  });

  describe("empty guard", () => {
    it("renders children when empty:true matches an empty thread", async () => {
      setMessages(0);
      expect(await mount({ empty: true })).not.toBeNull();
    });

    it("hides children when empty:true but the thread has messages", async () => {
      setMessages(3);
      expect(await mount({ empty: true })).toBeNull();
    });

    it("renders children when empty:false matches a non-empty thread", async () => {
      setMessages(3);
      expect(await mount({ empty: false })).not.toBeNull();
    });

    it("hides children when empty:false but the thread is empty", async () => {
      setMessages(0);
      expect(await mount({ empty: false })).toBeNull();
    });
  });

  describe("running guard", () => {
    it("renders children when running:true matches a running thread", async () => {
      h.thread.isRunning = true;
      expect(await mount({ running: true })).not.toBeNull();
    });

    it("hides children when running:true but the thread is idle", async () => {
      h.thread.isRunning = false;
      expect(await mount({ running: true })).toBeNull();
    });

    it("renders children when running:false matches an idle thread", async () => {
      h.thread.isRunning = false;
      expect(await mount({ running: false })).not.toBeNull();
    });

    it("hides children when running:false but the thread is running", async () => {
      h.thread.isRunning = true;
      expect(await mount({ running: false })).toBeNull();
    });
  });

  describe("combined guards", () => {
    it("renders children only when both empty and running match", async () => {
      setMessages(0);
      h.thread.isRunning = true;
      expect(await mount({ empty: true, running: true })).not.toBeNull();
    });

    it("hides children when empty matches but running does not", async () => {
      setMessages(0);
      h.thread.isRunning = false;
      expect(await mount({ empty: true, running: true })).toBeNull();
    });

    it("hides children when running matches but empty does not", async () => {
      setMessages(2);
      h.thread.isRunning = true;
      expect(await mount({ empty: true, running: true })).toBeNull();
    });
  });
});
