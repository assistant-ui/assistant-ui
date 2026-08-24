import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  clearPartWarningsForTesting();
  clearScrollToBottomWarningForTesting();
});
import { createApp, defineComponent, h, nextTick, type Component } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type {
  ExternalStoreAdapter,
  ThreadMessageLike,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";
import { ThreadPrimitiveViewport } from "../primitives/ThreadPrimitiveViewport";
import {
  ThreadPrimitiveScrollToBottom,
  clearScrollToBottomWarningForTesting,
} from "../primitives/ThreadPrimitiveScrollToBottom";
import {
  MessagePrimitiveParts,
  clearPartWarningsForTesting,
} from "../primitives/MessagePrimitiveParts";
import {
  BranchPickerPrimitiveCount,
  BranchPickerPrimitiveNext,
  BranchPickerPrimitiveNumber,
  BranchPickerPrimitivePrevious,
} from "../primitives/branchPicker";

type DemoMessage = {
  role: "user" | "assistant";
  content: ThreadMessageLike["content"];
};

const createTestRuntime = () => {
  let messages: DemoMessage[] = [];
  let isRunning = false;
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning,
    convertMessage: (message) => ({
      role: message.role,
      content: message.content,
    }),
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const append = (message: DemoMessage) => {
    messages = [...messages, message];
    core.setAdapter(makeAdapter());
  };
  const setRunning = (value: boolean) => {
    isRunning = value;
    core.setAdapter(makeAdapter());
  };
  return { runtime, append, setRunning };
};

const mockViewportGeometry = (div: HTMLElement) => {
  Object.defineProperty(div, "scrollHeight", {
    get: () => 500,
    configurable: true,
  });
  Object.defineProperty(div, "clientHeight", {
    get: () => 100,
    configurable: true,
  });
  const scrollTo = vi.fn();
  Object.defineProperty(div, "scrollTo", {
    value: scrollTo,
    configurable: true,
  });
  return scrollTo;
};

const mountChat = (runtime: AssistantRuntimeImpl, view: Component) => {
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          { default: () => h(view) },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, unmount: () => app.unmount() };
};

describe("MessagePrimitiveParts", () => {
  it("renders text parts by default and routes typed slots in order", async () => {
    const { runtime, append } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, {
          default: () =>
            h("li", null, [
              h(MessagePrimitiveParts, null, {
                "tool-call": () => {
                  const ToolProbe = defineComponent({
                    setup() {
                      const name = useAuiState((s) =>
                        s.part.type === "tool-call" ? s.part.toolName : "",
                      );
                      return () => h("span", { class: "tool" }, name.value);
                    },
                  });
                  return h(ToolProbe);
                },
              }),
            ]),
        }),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() =>
      append({
        role: "assistant",
        content: [
          { type: "text", text: "before " },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search",
            args: {},
          },
          { type: "text", text: " after" },
        ],
      }),
    );

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("li")).not.toBeNull();
      expect(el.querySelector("span.tool")?.textContent).toBe("search");
    });
    expect(el.querySelector("li")!.textContent).toBe("before search after");

    unmount();
  });

  it("keeps text rendering when only a default slot is provided", async () => {
    const { runtime, append } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h("li", null, [
          h(ThreadPrimitiveMessages, null, {
            default: () =>
              h(MessagePrimitiveParts, null, {
                default: () => h("span", { class: "fallback" }, "[tool]"),
              }),
          }),
        ]),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() =>
      append({
        role: "assistant",
        content: [
          { type: "text", text: "hello" },
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search",
            args: {},
          },
        ],
      }),
    );

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.fallback")).not.toBeNull();
    });
    expect(el.querySelector("li")!.textContent).toBe("hello[tool]");

    unmount();
  });
});

describe("MessagePrimitiveParts dev warning", () => {
  it("warns once in dev for a part type without a slot", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { runtime, append } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, {
          default: () => h(MessagePrimitiveParts),
        }),
    });
    const { unmount } = mountChat(runtime, View);

    flushTapSync(() =>
      append({
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search",
            args: {},
          },
        ],
      }),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(warn).toHaveBeenCalledTimes(1);
    });
    expect(warn.mock.calls[0]![0]).toContain(
      'no slot for part type "tool-call"',
    );

    unmount();
  });
});

describe("BranchPickerPrimitive", () => {
  it("disables both directions and renders 1/1 on a single branch", async () => {
    const { runtime, append } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, {
          default: () => [
            h(
              BranchPickerPrimitivePrevious,
              { class: "prev" },
              { default: () => "<" },
            ),
            h("span", { class: "pos" }, [
              h(BranchPickerPrimitiveNumber),
              " / ",
              h(BranchPickerPrimitiveCount),
            ]),
            h(
              BranchPickerPrimitiveNext,
              { class: "next" },
              { default: () => ">" },
            ),
          ],
        }),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "hi" }] }),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector(".pos")).not.toBeNull();
    });

    expect(el.querySelector(".pos")!.textContent).toBe("1 / 1");
    expect(el.querySelector<HTMLButtonElement>(".prev")!.disabled).toBe(true);
    expect(el.querySelector<HTMLButtonElement>(".next")!.disabled).toBe(true);

    unmount();
  });
});

describe("ThreadPrimitiveViewport", () => {
  it("mounts as a scroll container and renders its slot", async () => {
    const { runtime, append } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          { class: "viewport" },
          { default: () => h("p", { class: "content" }, "hello") },
        ),
    });
    const { el, unmount } = mountChat(runtime, View);

    expect(el.querySelector("div.viewport p.content")?.textContent).toBe(
      "hello",
    );

    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "hi" }] }),
    );
    await nextTick();

    unmount();
  });

  it("follows content growth while pinned and stops after a user scrolls up", async () => {
    const { runtime, append } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          { class: "viewport" },
          {
            default: () =>
              h(ThreadPrimitiveMessages, null, {
                default: () => h("p", "row"),
              }),
          },
        ),
    });
    const { el, unmount } = mountChat(runtime, View);

    const div = el.querySelector<HTMLElement>("div.viewport")!;
    let scrollHeight = 500;
    let scrollTop = 0;
    Object.defineProperty(div, "scrollHeight", {
      get: () => scrollHeight,
      configurable: true,
    });
    Object.defineProperty(div, "clientHeight", {
      get: () => 100,
      configurable: true,
    });
    Object.defineProperty(div, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
      configurable: true,
    });
    const scrollTo = vi.fn(({ top }: { top: number }) => {
      scrollTop = Math.max(0, Math.min(top, scrollHeight - 100));
    });
    Object.defineProperty(div, "scrollTo", {
      value: scrollTo,
      configurable: true,
    });

    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "one" }] }),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(scrollTo).toHaveBeenCalled();
    });
    div.dispatchEvent(new Event("scroll"));
    const callsWhilePinned = scrollTo.mock.calls.length;

    scrollHeight = 600;
    flushTapSync(() =>
      append({ role: "assistant", content: [{ type: "text", text: "two" }] }),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(scrollTo.mock.calls.length).toBeGreaterThan(callsWhilePinned);
    });
    div.dispatchEvent(new Event("scroll"));
    await new Promise((resolve) => setTimeout(resolve, 30));

    div.dispatchEvent(new Event("pointerdown"));
    scrollTop = 50;
    div.dispatchEvent(new Event("scroll"));
    const callsAfterUnpin = scrollTo.mock.calls.length;

    scrollHeight = 700;
    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "three" }] }),
    );
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(scrollTo.mock.calls.length).toBe(callsAfterUnpin);

    unmount();
  });

  it("stays put when every scroll option is disabled", async () => {
    const { runtime, append } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          {
            class: "viewport",
            autoScroll: false,
            scrollToBottomOnInitialize: false,
            scrollToBottomOnRunStart: false,
          },
          {
            default: () =>
              h(ThreadPrimitiveMessages, null, {
                default: () => h("p", "row"),
              }),
          },
        ),
    });
    const { el, unmount } = mountChat(runtime, View);

    const div = el.querySelector<HTMLElement>("div.viewport")!;
    Object.defineProperty(div, "scrollHeight", {
      get: () => 500,
      configurable: true,
    });
    Object.defineProperty(div, "clientHeight", {
      get: () => 100,
      configurable: true,
    });
    const scrollTo = vi.fn();
    Object.defineProperty(div, "scrollTo", {
      value: scrollTo,
      configurable: true,
    });

    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "one" }] }),
    );
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(scrollTo).not.toHaveBeenCalled();

    unmount();
  });

  it("scrolls on run start and stays put when that option is disabled", async () => {
    const active = createTestRuntime();
    const ActiveView = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          { class: "viewport" },
          { default: () => h("p", "row") },
        ),
    });
    const mountedActive = mountChat(active.runtime, ActiveView);
    const activeScrollTo = mockViewportGeometry(
      mountedActive.el.querySelector<HTMLElement>("div.viewport")!,
    );

    flushTapSync(() => active.setRunning(true));
    await vi.waitFor(() => {
      expect(activeScrollTo).toHaveBeenCalled();
    });
    mountedActive.unmount();

    const disabled = createTestRuntime();
    const DisabledView = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          {
            class: "viewport",
            autoScroll: false,
            scrollToBottomOnInitialize: false,
            scrollToBottomOnRunStart: false,
          },
          { default: () => h("p", "row") },
        ),
    });
    const mountedDisabled = mountChat(disabled.runtime, DisabledView);
    const disabledScrollTo = mockViewportGeometry(
      mountedDisabled.el.querySelector<HTMLElement>("div.viewport")!,
    );

    flushTapSync(() => disabled.setRunning(true));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(disabledScrollTo).not.toHaveBeenCalled();

    mountedDisabled.unmount();
  });

  it("enables scroll-to-bottom only while scrolled up and scrolls on click", async () => {
    const { runtime } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveViewport,
          { class: "viewport" },
          {
            default: () => [
              h(ThreadPrimitiveMessages, null, {
                default: () => h("p", "row"),
              }),
              h(
                ThreadPrimitiveScrollToBottom,
                { class: "jump" },
                { default: () => "Jump" },
              ),
            ],
          },
        ),
    });
    const { el, unmount } = mountChat(runtime, View);

    const div = el.querySelector<HTMLElement>("div.viewport")!;
    let scrollTop = 400;
    Object.defineProperty(div, "scrollHeight", {
      get: () => 500,
      configurable: true,
    });
    Object.defineProperty(div, "clientHeight", {
      get: () => 100,
      configurable: true,
    });
    Object.defineProperty(div, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
      configurable: true,
    });
    const scrollTo = vi.fn(({ top }: { top: number }) => {
      scrollTop = Math.max(0, Math.min(top, 400));
    });
    Object.defineProperty(div, "scrollTo", {
      value: scrollTo,
      configurable: true,
    });

    div.dispatchEvent(new Event("scroll"));
    const button = el.querySelector<HTMLButtonElement>("button.jump")!;
    expect(button.disabled).toBe(true);

    scrollTop = 50;
    div.dispatchEvent(new Event("scroll"));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
        false,
      );
    });

    el.querySelector<HTMLButtonElement>("button.jump")!.click();
    expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: "auto" });
    div.dispatchEvent(new Event("scroll"));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
        true,
      );
    });

    unmount();
  });

  it("renders scroll-to-bottom disabled outside a viewport and warns in dev", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { runtime } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveScrollToBottom,
          { class: "jump" },
          { default: () => "Jump" },
        ),
    });
    const { el, unmount } = mountChat(runtime, View);
    expect(el.querySelector<HTMLButtonElement>("button.jump")!.disabled).toBe(
      true,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("no surrounding");
    unmount();
  });
});
