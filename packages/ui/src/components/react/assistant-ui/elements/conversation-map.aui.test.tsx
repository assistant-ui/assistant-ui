import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ConversationMapAui } from "./conversation-map.aui";

const mocks = vi.hoisted(() => ({
  state: { thread: { messages: [] as unknown[] } },
  viewport: {
    element: { viewport: null as HTMLElement | null },
    height: { viewport: 400 },
  },
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAuiState: (selector: (s: typeof mocks.state) => unknown) =>
    selector(mocks.state),
  useThreadViewport: (selector: (s: typeof mocks.viewport) => unknown) =>
    selector(mocks.viewport),
}));

const rect = (top: number, height: number) =>
  ({ top, height, bottom: top + height }) as DOMRect;

const VIEWPORT_HEIGHT = 300;

/**
 * A stand-in for `ThreadPrimitive.Viewport` and the message roots it renders.
 * `scrollHeight` defaults to a thread far longer than one screen, so the
 * reading line sits at the top unless a test scrolls into the last screenful.
 */
const mountViewport = (
  tops: Record<string, number>,
  scrollHeight = VIEWPORT_HEIGHT * 4,
) => {
  const viewport = document.createElement("div");
  viewport.getBoundingClientRect = () => rect(0, VIEWPORT_HEIGHT);
  Object.defineProperty(viewport, "clientHeight", {
    configurable: true,
    value: VIEWPORT_HEIGHT,
  });
  Object.defineProperty(viewport, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  viewport.scrollTop = 0;
  viewport.scrollTo = vi.fn();

  for (const id of Object.keys(tops)) {
    const message = document.createElement("div");
    message.dataset["messageId"] = id;
    message.getBoundingClientRect = () => rect(tops[id]!, 50);
    message.scrollIntoView = vi.fn();
    viewport.append(message);
  }

  document.body.append(viewport);
  mocks.viewport.element.viewport = viewport;
  return viewport;
};

const ticks = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-slot="conversation-map-tick"]',
    ),
  );

const labels = () => ticks().map((tick) => tick.getAttribute("aria-label"));
const lit = () => ticks().map((tick) => tick.hasAttribute("data-active"));
const onScreen = () => ticks().map((tick) => tick.hasAttribute("data-in-view"));

const user = (id: string, text: string) => ({
  id,
  role: "user",
  content: [{ type: "text", text }],
});

const assistant = (id: string, text: string) => ({
  id,
  role: "assistant",
  content: [{ type: "text", text }],
});

const renderMap = async () => {
  const result = render(<ConversationMapAui />);
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
  return result;
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  mocks.state.thread.messages = [];
  mocks.viewport.element.viewport = null;
});

describe("ConversationMapAui", () => {
  it("puts one tick on each turn rather than each message", async () => {
    mocks.state.thread.messages = [
      user("u1", "Can you check the extension build?"),
      assistant("a1", "It is the unpacked one."),
      user("u2", "Ready to reload?"),
      assistant("a2", "Not yet."),
    ];
    mountViewport({ u1: 0, a1: 60, u2: 120, a2: 180 });

    await renderMap();

    expect(labels()).toEqual([
      "Can you check the extension build?",
      "Ready to reload?",
    ]);
  });

  it("keeps several assistant messages inside one turn", async () => {
    mocks.state.thread.messages = [
      user("u1", "Go"),
      {
        id: "a1",
        role: "assistant",
        content: [{ type: "tool-call", toolName: "read_file" }],
      },
      assistant("a2", "Done."),
      user("u2", "Thanks"),
    ];
    mountViewport({ u1: 0, a1: 60, a2: 120, u2: 180 });

    await renderMap();

    expect(labels()).toEqual(["Go", "Thanks"]);
  });

  it("gives a leading assistant message a turn of its own", async () => {
    mocks.state.thread.messages = [
      assistant("a0", "How can I help?"),
      user("u1", "Check the build"),
      assistant("a1", "Sure."),
    ];
    mountViewport({ a0: 0, u1: 60, a1: 120 });

    await renderMap();

    expect(labels()).toEqual(["How can I help?", "Check the build"]);
  });

  it("starts a turn per consecutive user message", async () => {
    mocks.state.thread.messages = [
      user("u1", "First"),
      user("u2", "Second"),
      assistant("a1", "Answering both."),
    ];
    mountViewport({ u1: 0, u2: 60, a1: 120 });

    await renderMap();

    expect(labels()).toEqual(["First", "Second"]);
  });

  it("leaves system messages off the rail", async () => {
    mocks.state.thread.messages = [
      { id: "s1", role: "system", content: [{ type: "text", text: "rules" }] },
      user("u1", "hello"),
    ];
    mountViewport({ s1: -10, u1: 200 });

    await renderMap();

    expect(labels()).toEqual(["hello"]);
    expect(lit()).toEqual([true]);
  });

  it("names an attachment-only turn from its attachments", async () => {
    mocks.state.thread.messages = [
      {
        id: "u1",
        role: "user",
        content: [],
        attachments: [{ id: "a", type: "image", name: "shot.png" }],
      },
      {
        id: "u2",
        role: "user",
        content: [],
        attachments: [{ id: "b", type: "document", name: "spec.pdf" }],
      },
    ];
    mountViewport({ u1: 0, u2: 60 });

    await renderMap();

    expect(labels()).toEqual(["Image", "Attachment"]);
  });

  it("marks the turn that owns the top of the viewport", async () => {
    mocks.state.thread.messages = [
      user("u1", "First"),
      assistant("a1", "One."),
      user("u2", "Second"),
      assistant("a2", "Two."),
    ];
    mountViewport({ u1: -220, a1: -120, u2: -10, a2: 200 });

    await renderMap();

    expect(lit()).toEqual([false, true]);
  });

  it("marks a turn from its assistant message too", async () => {
    mocks.state.thread.messages = [
      user("u1", "First"),
      assistant("a1", "One."),
      user("u2", "Second"),
    ];
    mountViewport({ u1: -220, a1: -10, u2: 200 });

    await renderMap();

    expect(lit()).toEqual([true, false]);
  });

  it("falls back to the first turn above the top of the thread", async () => {
    mocks.state.thread.messages = [user("u1", "First"), user("u2", "Second")];
    mountViewport({ u1: 40, u2: 100 });

    await renderMap();

    expect(lit()).toEqual([true, false]);
  });

  it("reaches the last turn when the thread is scrolled to the end", async () => {
    mocks.state.thread.messages = [
      user("u1", "First"),
      user("u2", "Second"),
      user("u3", "Third"),
      user("u4", "Fourth"),
    ];
    // The last two never reach the top of the viewport, whatever the scroll.
    const viewport = mountViewport(
      { u1: -200, u2: -50, u3: 100, u4: 250 },
      VIEWPORT_HEIGHT * 2,
    );
    viewport.scrollTop = VIEWPORT_HEIGHT;

    await renderMap();

    expect(lit()).toEqual([false, false, false, true]);
  });

  it("follows the thread as it scrolls", async () => {
    mocks.state.thread.messages = [user("u1", "First"), user("u2", "Second")];
    const tops = { u1: 0, u2: 200 };
    const viewport = mountViewport(tops);

    await renderMap();
    expect(lit()).toEqual([true, false]);

    tops.u1 = -220;
    tops.u2 = -20;
    await act(async () => {
      viewport.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(lit()).toEqual([false, true]);
  });

  it("marks every turn the viewport holds, not just the one being read", async () => {
    mocks.state.thread.messages = [
      user("u1", "First"),
      assistant("a1", "One."),
      user("u2", "Second"),
      assistant("a2", "Two."),
      user("u3", "Third"),
    ];
    // The first turn's answer still straddles the top edge; u3 is below the fold.
    mountViewport({ u1: -220, a1: -30, u2: -10, a2: 120, u3: 400 });

    await renderMap();

    expect(lit()).toEqual([false, true, false]);
    expect(onScreen()).toEqual([true, true, false]);
  });

  it("scrolls only the thread viewport to the turn's question", async () => {
    mocks.state.thread.messages = [
      user("u1", "First"),
      assistant("a1", "One."),
      user("u2", "Second"),
    ];
    const viewport = mountViewport({ u1: 0, a1: 60, u2: 120 });
    viewport.scrollTop = 100;

    await renderMap();
    fireEvent.click(ticks()[1]!);

    expect(viewport.scrollTo).toHaveBeenCalledWith({
      top: 220,
      behavior: "smooth",
    });
    expect(
      viewport.querySelector<HTMLElement>('[data-message-id="u2"]')
        ?.scrollIntoView,
    ).not.toHaveBeenCalled();
  });

  it("renders the rail unlit before the viewport is registered", async () => {
    mocks.state.thread.messages = [user("u1", "hello")];

    await renderMap();

    expect(labels()).toEqual(["hello"]);
    expect(lit()).toEqual([false]);
  });
});
