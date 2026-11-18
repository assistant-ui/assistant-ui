import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createComponent,
  createSignal,
  For,
  type Component,
  type JSX,
} from "solid-js";
import { Dynamic, render } from "solid-js/web";
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
import { flushEvents } from "../testUtils";
import { ThreadPrimitiveViewport } from "./ThreadPrimitiveViewport";
import { ThreadPrimitiveViewportFooter } from "./ThreadPrimitiveViewportFooter";

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

const unmounts: (() => void)[] = [];

const mountChat = (runtime: AssistantRuntimeImpl, view: Component) => {
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime) }),
        get children() {
          return createComponent(view, {});
        },
      }),
    el,
  );
  const unmount = () => {
    dispose();
    el.remove();
  };
  unmounts.push(unmount);
  return { el, unmount };
};

const installGeometry = (div: HTMLElement, initialTop = 0) => {
  let scrollHeight = 500;
  let scrollTop = initialTop;
  Object.defineProperties(div, {
    scrollHeight: { get: () => scrollHeight, configurable: true },
    clientHeight: { get: () => 100, configurable: true },
    scrollTop: {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
      configurable: true,
    },
  });
  const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
    scrollTop = Math.max(0, Math.min(top ?? 0, scrollHeight - 100));
    div.dispatchEvent(new Event("scroll"));
  });
  Object.defineProperty(div, "scrollTo", {
    value: scrollTo,
    configurable: true,
  });
  return {
    scrollTo,
    setScrollHeight: (value: number) => {
      scrollHeight = value;
    },
    setScrollTop: (value: number) => {
      scrollTop = value;
    },
  };
};

const Rows = (props: { disclosure?: boolean }) => {
  const messages = useAuiState((s) => s.thread.messages);
  return createComponent(For<ReturnType<typeof messages>, JSX.Element>, {
    get each() {
      return messages();
    },
    children: (message) =>
      createComponent(Dynamic, {
        component: "div",
        "data-message-id": message.id,
        get children() {
          return props.disclosure
            ? createComponent(Dynamic, {
                component: "button",
                class: "disclosure",
                "aria-expanded": "false",
                children: "Expand",
              })
            : createComponent(Dynamic, { component: "p", children: "row" });
        },
      }),
  });
};

const flushFrame = async () => {
  await flushEvents();
  vi.advanceTimersToNextFrame();
  await Promise.resolve();
};

beforeEach(() =>
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame"],
  }),
);
afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ThreadPrimitiveViewport", () => {
  it("mounts as a scroll container, composes the caller's ref, and renders reactive children and attributes", () => {
    const { runtime, append } = createTestRuntime();
    const ref = vi.fn();
    const [text, setText] = createSignal("hello");
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        ref,
        get "aria-label"() {
          return text();
        },
        get children() {
          return createComponent(Dynamic, {
            component: "p",
            class: "content",
            get children() {
              return text();
            },
          });
        },
      });
    const { el } = mountChat(runtime, View);
    const div = el.querySelector<HTMLDivElement>("div.viewport")!;
    expect(ref).toHaveBeenCalledWith(div);
    expect(div.querySelector("p.content")!.textContent).toBe("hello");
    setText("updated");
    expect(div.getAttribute("aria-label")).toBe("updated");
    expect(div.querySelector("p.content")!.textContent).toBe("updated");
    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "hi" }] }),
    );
    expect(div.hasAttribute("autoScroll")).toBe(false);
  });

  it("follows content growth while pinned and stops after a user scrolls up", async () => {
    const { runtime, append } = createTestRuntime();
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        get children() {
          return createComponent(Rows, {});
        },
      });
    const { el } = mountChat(runtime, View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installGeometry(div);
    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "one" }] }),
    );
    await flushFrame();
    expect(geometry.scrollTo).toHaveBeenCalled();
    div.dispatchEvent(new Event("scroll"));
    const callsWhilePinned = geometry.scrollTo.mock.calls.length;

    geometry.setScrollHeight(600);
    flushTapSync(() =>
      append({ role: "assistant", content: [{ type: "text", text: "two" }] }),
    );
    await flushFrame();
    expect(geometry.scrollTo.mock.calls.length).toBeGreaterThan(
      callsWhilePinned,
    );
    div.dispatchEvent(new Event("scroll"));
    await flushFrame();

    div.dispatchEvent(new Event("pointerdown"));
    geometry.setScrollTop(50);
    div.dispatchEvent(new Event("scroll"));
    const callsAfterUnpin = geometry.scrollTo.mock.calls.length;
    geometry.setScrollHeight(700);
    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "three" }] }),
    );
    await flushFrame();
    expect(el.querySelectorAll("p")).toHaveLength(3);
    expect(geometry.scrollTo.mock.calls.length).toBe(callsAfterUnpin);
  });

  it("pauses following when a message disclosure expands", async () => {
    const { runtime, append } = createTestRuntime();
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        scrollToBottomOnInitialize: false,
        get children() {
          return createComponent(Rows, { disclosure: true });
        },
      });
    const { el } = mountChat(runtime, View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installGeometry(div, 400);
    flushTapSync(() =>
      append({ role: "assistant", content: [{ type: "text", text: "one" }] }),
    );
    await flushFrame();
    expect(el.querySelector("[data-message-id]")).not.toBeNull();
    expect(geometry.scrollTo).toHaveBeenCalled();
    geometry.scrollTo.mockClear();

    const disclosure =
      el.querySelector<HTMLButtonElement>("button.disclosure")!;
    disclosure.addEventListener("click", (event) => {
      disclosure.setAttribute("aria-expanded", "true");
      event.stopPropagation();
    });
    disclosure.click();
    geometry.setScrollHeight(600);
    el.querySelector("[data-message-id]")!.append(document.createElement("p"));
    await flushFrame();
    expect(geometry.scrollTo).not.toHaveBeenCalled();
    expect(div.scrollTop).toBe(400);
  });

  it("stays put when every scroll option is disabled", async () => {
    const { runtime, append, setRunning } = createTestRuntime();
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        autoScroll: false,
        scrollToBottomOnInitialize: false,
        scrollToBottomOnRunStart: false,
        scrollToBottomOnThreadSwitch: false,
        get children() {
          return createComponent(Rows, {});
        },
      });
    const { el } = mountChat(runtime, View);
    const { scrollTo } = installGeometry(
      el.querySelector<HTMLElement>("div.viewport")!,
    );
    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "one" }] }),
    );
    await flushFrame();
    expect(el.querySelectorAll("p")).toHaveLength(1);
    expect(scrollTo).not.toHaveBeenCalled();
    flushTapSync(() => setRunning(true));
    await flushFrame();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "scrolls on run start only when enabled (%s)",
    async (enabled) => {
      const { runtime, setRunning } = createTestRuntime();
      const View = () =>
        createComponent(ThreadPrimitiveViewport, {
          class: "viewport",
          autoScroll: false,
          scrollToBottomOnInitialize: false,
          ...(enabled ? {} : { scrollToBottomOnRunStart: false }),
          get children() {
            return createComponent(Dynamic, {
              component: "p",
              children: "row",
            });
          },
        });
      const { el } = mountChat(runtime, View);
      const { scrollTo } = installGeometry(
        el.querySelector<HTMLElement>("div.viewport")!,
      );
      flushTapSync(() => setRunning(true));
      await flushFrame();
      expect(scrollTo.mock.calls).toEqual(
        enabled ? [[{ top: 500, behavior: "auto" }]] : [],
      );
    },
  );

  it("keeps MutationObserver content observation when ResizeObserver is unavailable", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { runtime } = createTestRuntime();
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        get children() {
          return [
            createComponent(ThreadPrimitiveViewportFooter, { class: "footer" }),
            createComponent(Dynamic, { component: "p", children: "content" }),
          ];
        },
      });
    const { el } = mountChat(runtime, View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installGeometry(div, 400);
    expect(el.querySelector("div.footer")).not.toBeNull();
    div.dispatchEvent(new Event("scroll"));
    geometry.setScrollHeight(600);
    div.append(document.createElement("span"));
    await vi.waitFor(() =>
      expect(geometry.scrollTo).toHaveBeenCalledWith({
        top: 600,
        behavior: "instant",
      }),
    );
  });

  it("reacts to initialization and auto-scroll option changes", async () => {
    const { runtime, append } = createTestRuntime();
    const [initialize, setInitialize] = createSignal(false);
    const [autoScroll, setAutoScroll] = createSignal(false);
    const View = () =>
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        get autoScroll() {
          return autoScroll();
        },
        get scrollToBottomOnInitialize() {
          return initialize();
        },
        get children() {
          return createComponent(Rows, {});
        },
      });
    const { el } = mountChat(runtime, View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installGeometry(div);
    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "one" }] }),
    );
    await flushFrame();
    expect(geometry.scrollTo).not.toHaveBeenCalled();

    setInitialize(true);
    await flushFrame();
    expect(geometry.scrollTo).toHaveBeenCalledWith({
      top: 500,
      behavior: "instant",
    });
    geometry.scrollTo.mockClear();
    geometry.setScrollHeight(600);
    flushTapSync(() =>
      append({ role: "assistant", content: [{ type: "text", text: "two" }] }),
    );
    await flushFrame();
    expect(geometry.scrollTo).not.toHaveBeenCalled();

    geometry.setScrollTop(500);
    div.dispatchEvent(new Event("scroll"));
    setAutoScroll(true);
    geometry.setScrollHeight(700);
    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "three" }] }),
    );
    await flushFrame();
    expect(geometry.scrollTo).toHaveBeenCalledWith({
      top: 700,
      behavior: "instant",
    });
  });

  it("detaches observers and listeners and cancels a pending scroll on unmount", async () => {
    const { runtime, append, setRunning } = createTestRuntime();
    const View = () =>
      createComponent(ThreadPrimitiveViewport, { class: "viewport" });
    const { el, unmount } = mountChat(runtime, View);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    const geometry = installGeometry(div);
    flushTapSync(() =>
      append({ role: "user", content: [{ type: "text", text: "one" }] }),
    );
    unmount();
    await flushFrame();
    geometry.setScrollHeight(600);
    div.append(document.createElement("p"));
    div.dispatchEvent(new Event("scroll"));
    flushTapSync(() => setRunning(true));
    await flushFrame();
    expect(geometry.scrollTo).not.toHaveBeenCalled();
  });
});

describe("ThreadPrimitiveViewport thread switching", () => {
  it.each([true, false])(
    "scrolls on thread switch only when enabled (%s)",
    async (enabled) => {
      type Message = { id: string; role: "user"; text: string };
      const threads = [
        {
          id: "t1",
          title: "First thread",
          messages: [
            { id: "m1", role: "user" as const, text: "hello from one" },
          ],
        },
        {
          id: "t2",
          title: "Second thread",
          messages: [
            { id: "m2", role: "user" as const, text: "hello from two" },
          ],
        },
      ];
      let currentId = "t1";
      const makeAdapter = (): ExternalStoreAdapter<Message> => ({
        messages: threads.find((thread) => thread.id === currentId)!.messages,
        convertMessage: (message) => ({
          id: message.id,
          role: message.role,
          content: [{ type: "text", text: message.text }],
        }),
        onNew: async () => {},
        adapters: {
          threadList: {
            threadId: currentId,
            threads: threads.map((thread) => ({
              status: "regular" as const,
              id: thread.id,
              title: thread.title,
            })),
            onSwitchToThread: (id: string) => {
              currentId = id;
              core.setAdapter(makeAdapter());
            },
          },
        },
      });
      const core = new ExternalStoreRuntimeCore(makeAdapter());
      const runtime = new AssistantRuntimeImpl(core);
      const View = () =>
        createComponent(ThreadPrimitiveViewport, {
          class: "viewport",
          autoScroll: false,
          scrollToBottomOnInitialize: false,
          ...(enabled ? {} : { scrollToBottomOnThreadSwitch: false }),
          get children() {
            return createComponent(Rows, {});
          },
        });
      const { el } = mountChat(runtime, View);
      const { scrollTo } = installGeometry(
        el.querySelector<HTMLElement>("div.viewport")!,
      );
      await flushFrame();
      expect(scrollTo).not.toHaveBeenCalled();
      flushTapSync(() => runtime.threads.switchToThread("t2"));
      await flushFrame();
      expect(scrollTo.mock.calls).toEqual(
        enabled ? [[{ top: 500, behavior: "instant" }]] : [],
      );
      expect(el.querySelector("[data-message-id='m2']")).not.toBeNull();
    },
  );
});
