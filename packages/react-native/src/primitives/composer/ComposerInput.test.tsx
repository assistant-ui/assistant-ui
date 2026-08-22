import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerInput } from "./ComposerInput";

const h = vi.hoisted(() => ({
  send: vi.fn<() => void>(),
  setText: vi.fn<(value: string) => void>(),
  canSend: true,
  isRunning: false,
  queue: false,
  text: "hello",
}));

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({
    composer: {
      send: h.send,
      setText: h.setText,
      getState: () => ({ canSend: h.canSend }),
    },
    thread: {
      getState: () => ({
        isRunning: h.isRunning,
        capabilities: { queue: h.queue },
      }),
    },
  }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ composer: { text: h.text } }),
}));

vi.mock("@assistant-ui/tap", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  flushTapSync: (fn: () => void) => fn(),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const pressEnter = (el: Element, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  el.dispatchEvent(event);
  return event;
};

describe("ComposerInput enter-to-send", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.send.mockReset();
    h.setText.mockReset();
    h.canSend = true;
    h.isRunning = false;
    h.queue = false;

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

  const mount = async () => {
    await act(async () => {
      root.render(<ComposerInput testID="input" />);
    });
    const el = container.querySelector('[data-testid="input"]');
    expect(el).not.toBeNull();
    return el as Element;
  };

  it("sends on plain Enter when idle", async () => {
    const el = await mount();

    await act(async () => {
      const event = pressEnter(el);
      expect(event.defaultPrevented).toBe(true);
    });

    expect(h.send).toHaveBeenCalledTimes(1);
  });

  it("does not send while the thread is running without queue support", async () => {
    h.isRunning = true;
    const el = await mount();

    await act(async () => {
      const event = pressEnter(el);
      expect(event.defaultPrevented).toBe(false);
    });

    expect(h.send).not.toHaveBeenCalled();
  });

  it("sends while running when the thread supports queueing", async () => {
    h.isRunning = true;
    h.queue = true;
    const el = await mount();

    await act(async () => {
      pressEnter(el);
    });

    expect(h.send).toHaveBeenCalledTimes(1);
  });

  it("does not send when the composer cannot send", async () => {
    h.canSend = false;
    const el = await mount();

    await act(async () => {
      const event = pressEnter(el);
      expect(event.defaultPrevented).toBe(true);
    });

    expect(h.send).not.toHaveBeenCalled();
  });

  it("inserts a newline on Shift+Enter", async () => {
    const el = await mount();

    await act(async () => {
      const event = pressEnter(el, { shiftKey: true });
      expect(event.defaultPrevented).toBe(false);
    });

    expect(h.send).not.toHaveBeenCalled();
  });
});
