import { describe, expect, it, vi } from "vitest";
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
import { MessagePrimitiveParts } from "../primitives/MessagePrimitiveParts";
import {
  BranchPickerPrimitiveCount,
  BranchPickerPrimitiveNext,
  BranchPickerPrimitiveNumber,
  BranchPickerPrimitivePrevious,
} from "../primitives/branchPicker";
import {
  isUserScrollUp,
  isViewportAtBottom,
  viewportOverflows,
} from "../primitives/viewportScroll";

type DemoMessage = {
  role: "user" | "assistant";
  content: ThreadMessageLike["content"];
};

const createTestRuntime = () => {
  let messages: DemoMessage[] = [];
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
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
  return { runtime, append };
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

  it("computes bottom pinning from viewport metrics", () => {
    expect(
      isViewportAtBottom({
        scrollTop: 900,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(true);
    expect(
      isViewportAtBottom({
        scrollTop: 899,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(true);
    expect(
      isViewportAtBottom({
        scrollTop: 800,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(false);
    expect(
      isViewportAtBottom({ scrollTop: 0, scrollHeight: 80, clientHeight: 100 }),
    ).toBe(true);

    expect(
      viewportOverflows({
        scrollTop: 0,
        scrollHeight: 1000,
        clientHeight: 100,
      }),
    ).toBe(true);
    expect(
      viewportOverflows({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 }),
    ).toBe(false);
  });

  it("distinguishes user scroll-up from content-driven shifts", () => {
    expect(
      isUserScrollUp(
        { scrollTop: 500, scrollHeight: 1000 },
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 100 },
      ),
    ).toBe(true);
    expect(
      isUserScrollUp(
        { scrollTop: 500, scrollHeight: 900 },
        { scrollTop: 400, scrollHeight: 1000, clientHeight: 100 },
      ),
    ).toBe(false);
    expect(
      isUserScrollUp(
        { scrollTop: 400, scrollHeight: 1000 },
        { scrollTop: 500, scrollHeight: 1000, clientHeight: 100 },
      ),
    ).toBe(false);
  });
});
