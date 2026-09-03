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
  it("titles a tick with the first line and previews the rest", async () => {
    mocks.state.thread.messages = [
      {
        id: "m1",
        role: "assistant",
        content: [
          { type: "text", text: "## Chat ready\n\nI'll use that label next." },
        ],
      },
    ];
    mountViewport({ m1: 0 });

    await renderMap();

    expect(labels()).toEqual(["Chat ready"]);
  });

  it("continues a single long line into the preview", async () => {
    const line = "a".repeat(100);
    mocks.state.thread.messages = [
      { id: "m1", role: "user", content: [{ type: "text", text: line }] },
    ];
    mountViewport({ m1: 0 });

    await renderMap();

    expect(labels()).toEqual(["a".repeat(72)]);
  });

  it("cuts a long title on a word boundary", async () => {
    mocks.state.thread.messages = [
      {
        id: "m1",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Confirmed. PR #33109 is merged into staging and the staging release workflow has started.",
          },
        ],
      },
    ];
    mountViewport({ m1: 0 });

    await renderMap();

    expect(labels()).toEqual([
      "Confirmed. PR #33109 is merged into staging and the staging release",
    ]);
  });

  it("names the tool when a message carries no text", async () => {
    mocks.state.thread.messages = [
      {
        id: "m1",
        role: "assistant",
        content: [{ type: "tool-call", toolName: "read_file" }],
      },
      {
        id: "m2",
        role: "assistant",
        content: [
          { type: "tool-call", toolName: "read_file" },
          { type: "tool-call", toolName: "grep" },
        ],
      },
    ];
    mountViewport({ m1: 0, m2: 60 });

    await renderMap();

    expect(labels()).toEqual(["read_file", "2 tool calls"]);
  });

  it("names an attachment-only turn from its attachments", async () => {
    mocks.state.thread.messages = [
      {
        id: "m1",
        role: "user",
        content: [],
        attachments: [{ id: "a1", type: "image", name: "shot.png" }],
      },
      {
        id: "m2",
        role: "user",
        content: [],
        attachments: [{ id: "a2", type: "document", name: "spec.pdf" }],
      },
    ];
    mountViewport({ m1: 0, m2: 60 });

    await renderMap();

    expect(labels()).toEqual(["Image", "Attachment"]);
  });

  it("leaves system messages off the rail and out of the active tick", async () => {
    mocks.state.thread.messages = [
      { id: "s1", role: "system", content: [{ type: "text", text: "rules" }] },
      { id: "m1", role: "user", content: [{ type: "text", text: "hello" }] },
    ];
    mountViewport({ s1: -10, m1: 200 });

    await renderMap();

    expect(labels()).toEqual(["hello"]);
    expect(ticks()[0]?.getAttribute("aria-current")).toBe("true");
  });

  it("marks the message that owns the top of the viewport", async () => {
    mocks.state.thread.messages = [
      { id: "m1", role: "user", content: [{ type: "text", text: "first" }] },
      {
        id: "m2",
        role: "assistant",
        content: [{ type: "text", text: "second" }],
      },
      { id: "m3", role: "user", content: [{ type: "text", text: "third" }] },
    ];
    mountViewport({ m1: -120, m2: -10, m3: 200 });

    await renderMap();

    expect(ticks().map((tick) => tick.getAttribute("aria-current"))).toEqual([
      null,
      "true",
      null,
    ]);
  });

  it("falls back to the first message above the top of the thread", async () => {
    mocks.state.thread.messages = [
      { id: "m1", role: "user", content: [{ type: "text", text: "first" }] },
      {
        id: "m2",
        role: "assistant",
        content: [{ type: "text", text: "second" }],
      },
    ];
    mountViewport({ m1: 40, m2: 100 });

    await renderMap();

    expect(ticks().map((tick) => tick.getAttribute("aria-current"))).toEqual([
      "true",
      null,
    ]);
  });

  it("scrolls only the thread viewport to the selected message", async () => {
    mocks.state.thread.messages = [
      { id: "m1", role: "user", content: [{ type: "text", text: "first" }] },
      {
        id: "m2",
        role: "assistant",
        content: [{ type: "text", text: "second" }],
      },
    ];
    const viewport = mountViewport({ m1: 0, m2: 60 });
    viewport.scrollTop = 100;

    await renderMap();
    fireEvent.click(ticks()[1]!);

    expect(viewport.scrollTo).toHaveBeenCalledWith({
      top: 160,
      behavior: "smooth",
    });

    const target = viewport.querySelector<HTMLElement>(
      '[data-message-id="m2"]',
    );
    expect(target?.scrollIntoView).not.toHaveBeenCalled();
  });

  it("follows the thread as it scrolls", async () => {
    mocks.state.thread.messages = [
      { id: "m1", role: "user", content: [{ type: "text", text: "first" }] },
      {
        id: "m2",
        role: "assistant",
        content: [{ type: "text", text: "second" }],
      },
    ];
    const tops = { m1: 0, m2: 200 };
    const viewport = mountViewport(tops);

    await renderMap();
    expect(ticks()[0]?.getAttribute("aria-current")).toBe("true");

    tops.m1 = -220;
    tops.m2 = -20;
    await act(async () => {
      viewport.dispatchEvent(new Event("scroll"));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(ticks()[1]?.getAttribute("aria-current")).toBe("true");
  });

  it("reaches the last message when the thread is scrolled to the end", async () => {
    mocks.state.thread.messages = [
      { id: "m1", role: "user", content: [{ type: "text", text: "first" }] },
      {
        id: "m2",
        role: "assistant",
        content: [{ type: "text", text: "second" }],
      },
      { id: "m3", role: "user", content: [{ type: "text", text: "third" }] },
      {
        id: "m4",
        role: "assistant",
        content: [{ type: "text", text: "fourth" }],
      },
    ];
    // The last two never reach the top of the viewport, whatever the scroll.
    const viewport = mountViewport(
      { m1: -200, m2: -50, m3: 100, m4: 250 },
      VIEWPORT_HEIGHT * 2,
    );
    viewport.scrollTop = VIEWPORT_HEIGHT;

    await renderMap();

    expect(ticks().map((tick) => tick.getAttribute("aria-current"))).toEqual([
      null,
      null,
      null,
      "true",
    ]);
  });

  it("sweeps the last screenful instead of stalling on one tick", async () => {
    mocks.state.thread.messages = [
      { id: "m1", role: "user", content: [{ type: "text", text: "first" }] },
      {
        id: "m2",
        role: "assistant",
        content: [{ type: "text", text: "second" }],
      },
      { id: "m3", role: "user", content: [{ type: "text", text: "third" }] },
      {
        id: "m4",
        role: "assistant",
        content: [{ type: "text", text: "fourth" }],
      },
    ];
    const viewport = mountViewport(
      { m1: -200, m2: -50, m3: 100, m4: 250 },
      VIEWPORT_HEIGHT * 2,
    );
    viewport.scrollTop = VIEWPORT_HEIGHT / 2;

    await renderMap();

    expect(ticks().map((tick) => tick.getAttribute("aria-current"))).toEqual([
      null,
      null,
      "true",
      null,
    ]);
  });

  it("renders the rail unmarked before the viewport is registered", async () => {
    mocks.state.thread.messages = [
      { id: "m1", role: "user", content: [{ type: "text", text: "hello" }] },
    ];

    await renderMap();

    expect(labels()).toEqual(["hello"]);
    expect(ticks()[0]?.getAttribute("aria-current")).toBeNull();
  });
});
