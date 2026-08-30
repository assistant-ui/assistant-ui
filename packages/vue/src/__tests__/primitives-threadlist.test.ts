import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, type Component } from "vue";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";
import { ThreadPrimitiveViewport } from "../primitives/ThreadPrimitiveViewport";
import {
  ThreadListItemPrimitiveTitle,
  ThreadListItemPrimitiveTrigger,
  ThreadListPrimitiveItems,
  ThreadListPrimitiveNew,
} from "../primitives/threadList";
import { useAuiState } from "../useAuiState";

type DemoMessage = { id: string; role: "user" | "assistant"; text: string };
type DemoThread = { id: string; title: string; messages: DemoMessage[] };

const createMultiThreadRuntime = () => {
  let threads: DemoThread[] = [
    {
      id: "t1",
      title: "First thread",
      messages: [{ id: "m1", role: "user", text: "hello from one" }],
    },
    {
      id: "t2",
      title: "Second thread",
      messages: [{ id: "m2", role: "user", text: "hello from two" }],
    },
  ];
  let currentId = "t1";
  let nextThread = 3;
  const onSwitchToThread = vi.fn((threadId: string) => {
    currentId = threadId;
    sync();
  });
  const onSwitchToNewThread = vi.fn(() => {
    const id = `t${nextThread++}`;
    threads = [...threads, { id, title: "", messages: [] }];
    currentId = id;
    sync();
  });
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
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
        archivedThreads: [
          { status: "archived" as const, id: "ta", title: "Archived one" },
        ],
        onSwitchToThread,
        onSwitchToNewThread,
      },
    },
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const sync = () => core.setAdapter(makeAdapter());
  const removeThread = (threadId: string) => {
    threads = threads.filter((thread) => thread.id !== threadId);
    if (!threads.some((thread) => thread.id === currentId)) {
      currentId = threads[0]!.id;
    }
    sync();
  };
  return { runtime, onSwitchToThread, onSwitchToNewThread, removeThread };
};

const SidebarView = defineComponent({
  setup: () => () => [
    h(ThreadListPrimitiveNew, { class: "new" }, { default: () => "New" }),
    h(ThreadListPrimitiveItems, null, {
      default: () =>
        h(
          ThreadListItemPrimitiveTrigger,
          { class: "item" },
          {
            default: () =>
              h(ThreadListItemPrimitiveTitle, { fallback: "New Chat" }),
          },
        ),
    }),
  ],
});

const mountView = (runtime: AssistantRuntimeImpl, view: Component) => {
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

describe("thread list primitives", () => {
  it("renders one scoped item per thread with titles", async () => {
    const { runtime } = createMultiThreadRuntime();
    const { el, unmount } = mountView(runtime, SidebarView);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.item")).toHaveLength(2);
    });
    expect(
      [...el.querySelectorAll("button.item")].map((item) => item.textContent),
    ).toEqual(["First thread", "Second thread"]);

    unmount();
  });

  it("keeps component state with a thread after an earlier row is removed", async () => {
    const { runtime, removeThread } = createMultiThreadRuntime();
    const useStatefulItem = () => {
      const initialTitle = useAuiState((s) => s.threadListItem.title).value;
      return () => h("span", { class: "stateful-item" }, initialTitle);
    };
    const StatefulItem = defineComponent({
      setup: useStatefulItem,
    });
    const View = defineComponent({
      setup: () => () =>
        h(ThreadListPrimitiveItems, null, {
          default: () => h(StatefulItem),
        }),
    });
    const { el, unmount } = mountView(runtime, View);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll(".stateful-item")).toHaveLength(2);
    });

    removeThread("t1");
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll(".stateful-item")).toHaveLength(1);
    });
    expect(el.querySelector(".stateful-item")!.textContent).toBe(
      "Second thread",
    );

    unmount();
  });

  it("switches threads through the item trigger and swaps the thread state", async () => {
    const { runtime, onSwitchToThread } = createMultiThreadRuntime();
    const View = defineComponent({
      setup: () => () => [
        h(SidebarView),
        h("ol", null, [
          h(ThreadPrimitiveMessages, null, {
            default: () => h("li", "row"),
          }),
        ]),
      ],
    });
    const { el, unmount } = mountView(runtime, View);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.item")).toHaveLength(2);
    });

    expect(
      el
        .querySelectorAll<HTMLButtonElement>("button.item")[0]!
        .getAttribute("data-active"),
    ).toBe("true");
    expect(
      el
        .querySelectorAll<HTMLButtonElement>("button.item")[1]!
        .hasAttribute("data-active"),
    ).toBe(false);

    el.querySelectorAll<HTMLButtonElement>("button.item")[1]!.click();
    await vi.waitFor(() => {
      expect(onSwitchToThread).toHaveBeenCalledWith("t2");
    });
    await vi.waitFor(async () => {
      await nextTick();
      expect(
        el
          .querySelectorAll<HTMLButtonElement>("button.item")[1]!
          .getAttribute("aria-current"),
      ).toBe("true");
    });
    expect(
      el
        .querySelectorAll<HTMLButtonElement>("button.item")[0]!
        .hasAttribute("data-active"),
    ).toBe(false);
    await vi.waitFor(() => {
      expect(runtime.thread.getState().messages[0]!.content[0]).toMatchObject({
        type: "text",
        text: "hello from two",
      });
    });

    unmount();
  });

  it("starts a new thread through the new button", async () => {
    const { runtime, onSwitchToNewThread } = createMultiThreadRuntime();
    const { el, unmount } = mountView(runtime, SidebarView);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.item")).toHaveLength(2);
    });

    el.querySelector<HTMLButtonElement>("button.new")!.click();
    await vi.waitFor(() => {
      expect(onSwitchToNewThread).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.item")).toHaveLength(3);
    });
    expect(
      el.querySelectorAll<HTMLButtonElement>("button.item")[2]!.textContent,
    ).toBe("New Chat");

    unmount();
  });

  it("renders archived items separately with archived", async () => {
    const { runtime } = createMultiThreadRuntime();
    const View = defineComponent({
      setup: () => () => [
        h(SidebarView),
        h(
          ThreadListPrimitiveItems,
          { archived: true },
          {
            default: () =>
              h(
                ThreadListItemPrimitiveTrigger,
                { class: "arch" },
                { default: () => h(ThreadListItemPrimitiveTitle) },
              ),
          },
        ),
      ],
    });
    const { el, unmount } = mountView(runtime, View);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.arch")).toHaveLength(1);
    });
    expect(el.querySelectorAll("button.item")).toHaveLength(2);
    expect(el.querySelector("button.arch")!.textContent).toBe("Archived one");

    unmount();
  });

  it("ignores clicks while disabled or default-prevented", async () => {
    const { runtime, onSwitchToThread, onSwitchToNewThread } =
      createMultiThreadRuntime();
    const View = defineComponent({
      setup: () => () => [
        h(
          ThreadListPrimitiveNew,
          { class: "new", disabled: true },
          { default: () => "New" },
        ),
        h(ThreadListPrimitiveItems, null, {
          default: () =>
            h(ThreadListItemPrimitiveTrigger, {
              class: "item",
              onClick: (event: MouseEvent) => event.preventDefault(),
            }),
        }),
      ],
    });
    const { el, unmount } = mountView(runtime, View);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.item")).toHaveLength(2);
    });
    const newButton = el.querySelector<HTMLButtonElement>("button.new")!;
    expect(newButton.disabled).toBe(true);

    newButton.disabled = false;
    newButton.click();
    el.querySelectorAll<HTMLButtonElement>("button.item")[1]!.click();
    await nextTick();
    await Promise.resolve();
    expect(onSwitchToNewThread).not.toHaveBeenCalled();
    expect(onSwitchToThread).not.toHaveBeenCalled();

    unmount();
  });

  it("ignores item trigger clicks while disabled", async () => {
    const { runtime, onSwitchToThread } = createMultiThreadRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ThreadListPrimitiveItems, null, {
          default: () =>
            h(ThreadListItemPrimitiveTrigger, {
              class: "item",
              disabled: true,
            }),
        }),
    });
    const { el, unmount } = mountView(runtime, View);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.item")).toHaveLength(2);
    });

    const trigger = el.querySelectorAll<HTMLButtonElement>("button.item")[1]!;
    expect(trigger.disabled).toBe(true);
    trigger.disabled = false;
    trigger.click();
    await nextTick();
    await Promise.resolve();
    expect(onSwitchToThread).not.toHaveBeenCalled();

    unmount();
  });

  it("renders the default slot as the title fallback", async () => {
    const { runtime } = createMultiThreadRuntime();
    const View = defineComponent({
      setup: () => () => [
        h(ThreadListPrimitiveNew, { class: "new" }, { default: () => "New" }),
        h(ThreadListPrimitiveItems, null, {
          default: () =>
            h(
              ThreadListItemPrimitiveTrigger,
              { class: "item" },
              {
                default: () =>
                  h(
                    ThreadListItemPrimitiveTitle,
                    { fallback: "unused" },
                    { default: () => h("em", "Untitled") },
                  ),
              },
            ),
        }),
      ],
    });
    const { el, unmount } = mountView(runtime, View);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.item")).toHaveLength(2);
    });
    expect(
      el.querySelectorAll<HTMLButtonElement>("button.item")[0]!.textContent,
    ).toBe("First thread");

    el.querySelector<HTMLButtonElement>("button.new")!.click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.item")).toHaveLength(3);
    });
    expect(
      el
        .querySelectorAll<HTMLButtonElement>("button.item")[2]!
        .querySelector("em")!.textContent,
    ).toBe("Untitled");

    unmount();
  });

  it("scrolls the viewport to the bottom on thread switch", async () => {
    const { runtime } = createMultiThreadRuntime();
    const View = defineComponent({
      setup: () => () => [
        h(SidebarView),
        h(
          ThreadPrimitiveViewport,
          { class: "viewport", scrollToBottomOnInitialize: false },
          {
            default: () =>
              h(ThreadPrimitiveMessages, null, {
                default: () => h("p", "row"),
              }),
          },
        ),
      ],
    });
    const { el, unmount } = mountView(runtime, View);

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

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll("button.item")).toHaveLength(2);
    });
    expect(scrollTo).not.toHaveBeenCalled();

    el.querySelectorAll<HTMLButtonElement>("button.item")[1]!.click();
    await vi.waitFor(() => {
      expect(scrollTo).toHaveBeenCalled();
    });

    unmount();
  });
});
