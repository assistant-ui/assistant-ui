import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadIf } from "./ThreadIf";

const h = vi.hoisted(() => ({
  thread: {
    messages: [] as unknown[],
    isEmpty: true,
    isRunning: false,
    isDisabled: false,
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: <T,>(selector: (s: { thread: typeof h.thread }) => T) =>
    selector({ thread: h.thread }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ThreadIf", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.thread.messages = [];
    h.thread.isEmpty = true;
    h.thread.isRunning = false;
    h.thread.isDisabled = false;

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

  it("renders children when no guard is set", async () => {
    h.thread.isEmpty = false;
    expect(await mount()).not.toBeNull();
  });

  describe("empty guard", () => {
    it("renders children when empty:true matches an empty thread", async () => {
      h.thread.isEmpty = true;
      expect(await mount({ empty: true })).not.toBeNull();
    });

    it("hides children when empty:true but the thread is not empty", async () => {
      h.thread.isEmpty = false;
      expect(await mount({ empty: true })).toBeNull();
    });

    it("renders children when empty:false matches a non-empty thread", async () => {
      h.thread.isEmpty = false;
      expect(await mount({ empty: false })).not.toBeNull();
    });

    it("hides children when empty:false but the thread is empty", async () => {
      h.thread.isEmpty = true;
      expect(await mount({ empty: false })).toBeNull();
    });

    it("follows thread.isEmpty rather than the message count", async () => {
      h.thread.messages = [];
      h.thread.isEmpty = false;

      expect(await mount({ empty: true })).toBeNull();
      expect(await mount({ empty: false })).not.toBeNull();
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

  describe("disabled guard", () => {
    it("renders children when disabled:true matches a disabled thread", async () => {
      h.thread.isDisabled = true;
      expect(await mount({ disabled: true })).not.toBeNull();
    });

    it("hides children when disabled:true but the thread is enabled", async () => {
      h.thread.isDisabled = false;
      expect(await mount({ disabled: true })).toBeNull();
    });

    it("renders children when disabled:false matches an enabled thread", async () => {
      h.thread.isDisabled = false;
      expect(await mount({ disabled: false })).not.toBeNull();
    });

    it("hides children when disabled:false but the thread is disabled", async () => {
      h.thread.isDisabled = true;
      expect(await mount({ disabled: false })).toBeNull();
    });
  });

  describe("combined guards", () => {
    it("renders children only when both empty and running match", async () => {
      h.thread.isEmpty = true;
      h.thread.isRunning = true;
      expect(await mount({ empty: true, running: true })).not.toBeNull();
    });

    it("hides children when empty matches but running does not", async () => {
      h.thread.isEmpty = true;
      h.thread.isRunning = false;
      expect(await mount({ empty: true, running: true })).toBeNull();
    });

    it("hides children when running matches but empty does not", async () => {
      h.thread.isEmpty = false;
      h.thread.isRunning = true;
      expect(await mount({ empty: true, running: true })).toBeNull();
    });
  });
});
