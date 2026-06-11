/** @vitest-environment jsdom */
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = {
  messages: [] as { role: string; content: { type: string; text: string }[] }[],
  composerType: "thread",
  activeAria: null as object | null,
  switchedToHandlers: [] as (() => void)[],
};
const setText = vi.fn();

vi.mock("@assistant-ui/store", () => ({
  useAui: () => ({
    composer: () => ({
      getState: () => ({ type: fixture.composerType }),
      setText,
    }),
    thread: () => ({ getState: () => ({ messages: fixture.messages }) }),
    on: (_event: string, cb: () => void) => {
      fixture.switchedToHandlers.push(cb);
      return () => {};
    },
  }),
}));
vi.mock("@assistant-ui/tap", () => ({
  flushTapSync: (fn: () => void) => fn(),
}));
vi.mock("../primitives/composer/trigger/TriggerPopoverRootContext", () => ({
  useTriggerPopoverRootContextOptional: () => ({
    getActiveAria: () => fixture.activeAria,
  }),
}));

vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
});

import { unstable_useComposerInputHistory } from "./useComposerInputHistory";

const user = (text: string) => ({
  role: "user",
  content: [{ type: "text", text }],
});
const assistant = (text: string) => ({
  role: "assistant",
  content: [{ type: "text", text }],
});

function Harness() {
  const history = unstable_useComposerInputHistory();
  return <textarea data-testid="input" {...history} />;
}

const setup = (value = "") => {
  const utils = render(<Harness />);
  const textarea = screen.getByTestId("input") as HTMLTextAreaElement;
  textarea.value = value;
  textarea.setSelectionRange(value.length, value.length);
  return { ...utils, textarea };
};

const arrow = (
  textarea: HTMLTextAreaElement,
  key: "ArrowUp" | "ArrowDown",
  init: Record<string, unknown> = {},
) => fireEvent.keyDown(textarea, { key, ...init });

beforeEach(() => {
  fixture.messages = [user("first"), assistant("reply"), user("second")];
  fixture.composerType = "thread";
  fixture.activeAria = null;
  fixture.switchedToHandlers = [];
  setText.mockClear();
});

describe("unstable_useComposerInputHistory", () => {
  it("recalls the newest user message on ArrowUp in an empty composer", () => {
    const { textarea } = setup("");
    const notPrevented = arrow(textarea, "ArrowUp");
    expect(notPrevented).toBe(false);
    expect(setText).toHaveBeenCalledWith("second");
  });

  it("steps to older entries and consumes the key at the oldest", () => {
    const { textarea } = setup("");
    arrow(textarea, "ArrowUp");
    textarea.value = "second";
    arrow(textarea, "ArrowUp");
    expect(setText).toHaveBeenLastCalledWith("first");

    textarea.value = "first";
    const notPrevented = arrow(textarea, "ArrowUp");
    expect(notPrevented).toBe(false);
    expect(setText).toHaveBeenCalledTimes(2);
  });

  it("restores the draft snapshot on ArrowDown past the newest", () => {
    const { textarea } = setup("  ");
    arrow(textarea, "ArrowUp");
    textarea.value = "second";
    arrow(textarea, "ArrowDown");
    expect(setText).toHaveBeenLastCalledWith("  ");

    textarea.value = "  ";
    const notPrevented = arrow(textarea, "ArrowDown");
    expect(notPrevented).toBe(true);
    expect(setText).toHaveBeenCalledTimes(2);
  });

  it("ignores ArrowUp when the composer holds a typed draft", () => {
    const { textarea } = setup("draft in progress");
    const notPrevented = arrow(textarea, "ArrowUp");
    expect(notPrevented).toBe(true);
    expect(setText).not.toHaveBeenCalled();
  });

  it("keeps native arrows when the caret is not on the first line", () => {
    fixture.messages = [user("other"), user("line1\nline2")];
    const { textarea } = setup("");
    arrow(textarea, "ArrowUp");
    expect(setText).toHaveBeenLastCalledWith("line1\nline2");
    textarea.value = "line1\nline2";
    textarea.setSelectionRange(8, 8);
    const notPrevented = arrow(textarea, "ArrowUp");
    expect(notPrevented).toBe(true);
    expect(setText).toHaveBeenCalledTimes(1);
  });

  it("yields to an open trigger popover", () => {
    fixture.activeAria = {};
    const { textarea } = setup("");
    const notPrevented = arrow(textarea, "ArrowUp");
    expect(notPrevented).toBe(true);
    expect(setText).not.toHaveBeenCalled();
  });

  it("ignores IME composition, modifiers, selections, and prevented events", () => {
    const { textarea } = setup("");
    fireEvent.keyDown(textarea, { key: "ArrowUp", isComposing: true });
    arrow(textarea, "ArrowUp", { shiftKey: true });
    arrow(textarea, "ArrowUp", { metaKey: true });
    textarea.value = "ab";
    textarea.setSelectionRange(0, 2);
    arrow(textarea, "ArrowUp");

    textarea.value = "";
    textarea.setSelectionRange(0, 0);
    const prevented = createEvent.keyDown(textarea, { key: "ArrowUp" });
    prevented.preventDefault();
    fireEvent(textarea, prevented);
    expect(setText).not.toHaveBeenCalled();
  });

  it("derives the ring from trimmed user texts, newest first, deduped", () => {
    fixture.messages = [
      user("first"),
      user("first"),
      assistant("noise"),
      user("   "),
      user("second"),
    ];
    const { textarea } = setup("");
    arrow(textarea, "ArrowUp");
    expect(setText).toHaveBeenLastCalledWith("second");
    textarea.value = "second";
    arrow(textarea, "ArrowUp");
    expect(setText).toHaveBeenLastCalledWith("first");
    textarea.value = "first";
    arrow(textarea, "ArrowUp");
    expect(setText).toHaveBeenCalledTimes(2);
  });

  it("starts a fresh browse after the composer was cleared externally", () => {
    const { textarea } = setup("");
    arrow(textarea, "ArrowUp");
    fixture.messages = [...fixture.messages, user("third")];
    textarea.value = "";
    arrow(textarea, "ArrowUp");
    expect(setText).toHaveBeenLastCalledWith("third");
  });

  it("is inert on edit composers", () => {
    fixture.composerType = "edit";
    const { textarea } = setup("");
    const notPrevented = arrow(textarea, "ArrowUp");
    expect(notPrevented).toBe(true);
    expect(setText).not.toHaveBeenCalled();
  });

  it("resets browsing when the thread switches", () => {
    const { textarea } = setup("");
    arrow(textarea, "ArrowUp");
    fixture.switchedToHandlers.forEach((cb) => cb());
    textarea.value = "second";
    const notPrevented = arrow(textarea, "ArrowDown");
    expect(notPrevented).toBe(true);
    expect(setText).toHaveBeenCalledTimes(1);
  });
});
