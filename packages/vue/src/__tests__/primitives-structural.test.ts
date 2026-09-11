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
import { ErrorPrimitiveMessage, ErrorPrimitiveRoot } from "../primitives/error";
import { MessagePrimitiveRoot } from "../primitives/message";
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";
import { ThreadPrimitiveRoot } from "../primitives/thread";
import {
  ThreadListItemPrimitiveArchive,
  ThreadListItemPrimitiveDelete,
  ThreadListItemPrimitiveUnarchive,
  ThreadListPrimitiveLoadMore,
} from "../primitives/threadListStructural";
import {
  ThreadListItemPrimitiveTitle,
  ThreadListPrimitiveItems,
} from "../primitives/threadList";

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  content: ThreadMessageLike["content"];
  status?: ThreadMessageLike["status"];
};

type DemoThread = { id: string; title: string };

const createTestRuntime = ({ hasMore = false } = {}) => {
  let messages: DemoMessage[] = [];
  let threads: DemoThread[] = [
    { id: "t1", title: "First thread" },
    { id: "t2", title: "Second thread" },
  ];
  let archivedThreads: DemoThread[] = [{ id: "ta", title: "Archived thread" }];
  let hasMoreValue = hasMore;
  let isLoading = false;
  let isLoadingMoreValue = false;
  let core!: ExternalStoreRuntimeCore;
  const sync = () => core.setAdapter(makeAdapter());
  const onArchive = vi.fn((threadId: string) => {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) return;
    threads = threads.filter((item) => item.id !== threadId);
    archivedThreads = [...archivedThreads, thread];
    sync();
  });
  const onUnarchive = vi.fn((threadId: string) => {
    const thread = archivedThreads.find((item) => item.id === threadId);
    if (!thread) return;
    archivedThreads = archivedThreads.filter((item) => item.id !== threadId);
    threads = [...threads, thread];
    sync();
  });
  const onDelete = vi.fn((threadId: string) => {
    threads = threads.filter((item) => item.id !== threadId);
    archivedThreads = archivedThreads.filter((item) => item.id !== threadId);
    sync();
  });
  const loadMore = vi.fn(async () => {});
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    convertMessage: (message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      status: message.status,
    }),
    onNew: async () => {},
    adapters: {
      threadList: {
        threadId: "t1",
        isLoading,
        threads: threads.map((thread) => ({
          status: "regular" as const,
          id: thread.id,
          title: thread.title,
        })),
        archivedThreads: archivedThreads.map((thread) => ({
          status: "archived" as const,
          id: thread.id,
          title: thread.title,
        })),
        onArchive,
        onUnarchive,
        onDelete,
      },
    },
  });
  core = new ExternalStoreRuntimeCore(makeAdapter());
  const threadList = core.threads as typeof core.threads & {
    hasMore: boolean;
    isLoadingMore: boolean;
    loadMore: () => Promise<void>;
  };
  Object.defineProperties(threadList, {
    hasMore: {
      configurable: true,
      get: () => hasMoreValue,
    },
    isLoadingMore: {
      configurable: true,
      get: () => isLoadingMoreValue,
    },
    loadMore: {
      configurable: true,
      value: loadMore,
    },
  });
  const runtime = new AssistantRuntimeImpl(core);
  const append = (message: DemoMessage) => {
    messages = [...messages, message];
    sync();
  };
  const setHasMore = (value: boolean) => {
    hasMoreValue = value;
    sync();
  };
  const setLoading = (value: boolean) => {
    isLoading = value;
    sync();
  };
  const setLoadingMore = (value: boolean) => {
    isLoadingMoreValue = value;
    sync();
  };
  return {
    runtime,
    append,
    setHasMore,
    setLoading,
    setLoadingMore,
    loadMore,
    onArchive,
    onUnarchive,
    onDelete,
  };
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

const findThreadItem = (el: HTMLElement, selector: string, title: string) => {
  const item = [...el.querySelectorAll<HTMLElement>(selector)].find(
    (node) => node.querySelector(".title")?.textContent === title,
  );
  if (!item) throw new Error(`Could not find ${title}`);
  return item;
};

describe("structural primitives", () => {
  it("renders the thread root and survives Escape without a thread scope", async () => {
    const { runtime } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadPrimitiveRoot,
          { class: "thread-root" },
          { default: () => [h("p", "content")] },
        ),
    });
    const { el, unmount } = mountChat(runtime, View);

    expect(el.querySelector("div.thread-root")).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    unmount();

    const bare = createApp(
      defineComponent({
        setup: () => () =>
          h(
            AuiProvider,
            { config: AuiConfig({}) },
            {
              default: () =>
                h(ThreadPrimitiveRoot, null, {
                  default: () => [h("p", "scopeless")],
                }),
            },
          ),
      }),
    );
    const bareEl = document.createElement("div");
    bare.mount(bareEl);
    expect(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    ).not.toThrow();
    bare.unmount();
  });

  it("adds the current message id and tracks message hover state", async () => {
    const { runtime, append } = createTestRuntime();
    const HoverState = defineComponent({
      setup() {
        const hovering = useAuiState((s) => s.message.isHovering);
        return () =>
          h("span", { class: "hover", "data-hovering": hovering.value });
      },
    });
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, {
          default: () =>
            h(
              MessagePrimitiveRoot,
              { class: "message" },
              {
                default: () => h(HoverState),
              },
            ),
        }),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() =>
      append({
        id: "message-id",
        role: "assistant",
        content: [{ type: "text", text: "Hello" }],
      }),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(
        el.querySelector(".message")?.getAttribute("data-message-id"),
      ).toBe("message-id");
    });

    const message = el.querySelector<HTMLElement>(".message")!;
    message.dispatchEvent(new Event("mouseenter"));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector(".hover")?.getAttribute("data-hovering")).toBe(
        "true",
      );
    });
    message.dispatchEvent(new Event("mouseleave"));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector(".hover")?.getAttribute("data-hovering")).toBe(
        "false",
      );
    });

    unmount();
  });

  it("renders the assistant error text inside an alert root", async () => {
    const { runtime, append } = createTestRuntime();
    const View = defineComponent({
      setup: () => () =>
        h(ThreadPrimitiveMessages, null, {
          default: () =>
            h(
              ErrorPrimitiveRoot,
              { class: "error" },
              {
                default: () => h(ErrorPrimitiveMessage),
              },
            ),
        }),
    });
    const { el, unmount } = mountChat(runtime, View);

    flushTapSync(() =>
      append({
        id: "error-id",
        role: "assistant",
        content: [{ type: "text", text: "" }],
        status: {
          type: "incomplete",
          reason: "error",
          error: { message: "Connection lost" },
        },
      }),
    );
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector(".error")?.textContent).toBe("Connection lost");
    });
    expect(el.querySelector(".error")?.getAttribute("role")).toBe("alert");

    unmount();
  });

  it("keeps load more mounted, disables it when unavailable, and calls the runtime", async () => {
    const { runtime, loadMore, setHasMore, setLoading, setLoadingMore } =
      createTestRuntime({
        hasMore: true,
      });
    const View = defineComponent({
      setup: () => () =>
        h(
          ThreadListPrimitiveLoadMore,
          { class: "load-more" },
          {
            default: () => "Load more",
          },
        ),
    });
    const { el, unmount } = mountChat(runtime, View);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("button.load-more")).not.toBeNull();
    });
    el.querySelector<HTMLButtonElement>("button.load-more")!.click();
    await vi.waitFor(() => {
      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    flushTapSync(() => setLoading(true));
    await vi.waitFor(async () => {
      await nextTick();
      expect(
        el.querySelector<HTMLButtonElement>("button.load-more")!.disabled,
      ).toBe(true);
    });
    flushTapSync(() => setLoading(false));
    flushTapSync(() => setLoadingMore(true));
    await vi.waitFor(async () => {
      await nextTick();
      expect(
        el.querySelector<HTMLButtonElement>("button.load-more")!.disabled,
      ).toBe(true);
    });
    flushTapSync(() => setLoadingMore(false));
    flushTapSync(() => setHasMore(false));
    await vi.waitFor(async () => {
      await nextTick();
      expect(
        el.querySelector<HTMLButtonElement>("button.load-more")!.disabled,
      ).toBe(true);
    });

    unmount();
  });

  it("archives, unarchives, and deletes thread list items", async () => {
    const { runtime, onArchive, onUnarchive, onDelete } = createTestRuntime();
    const Item = defineComponent({
      props: {
        archived: {
          type: Boolean,
          default: false,
        },
      },
      setup: (props) => () =>
        h(
          "div",
          { class: props.archived ? "archived-item" : "regular-item" },
          {
            default: () => [
              h("span", { class: "title" }, [h(ThreadListItemPrimitiveTitle)]),
              props.archived
                ? h(
                    ThreadListItemPrimitiveUnarchive,
                    { class: "unarchive" },
                    { default: () => "Unarchive" },
                  )
                : h(
                    ThreadListItemPrimitiveArchive,
                    { class: "archive" },
                    { default: () => "Archive" },
                  ),
              h(
                ThreadListItemPrimitiveDelete,
                { class: "delete" },
                { default: () => "Delete" },
              ),
            ],
          },
        ),
    });
    const View = defineComponent({
      setup: () => () => [
        h(ThreadListPrimitiveItems, null, {
          default: () => h(Item),
        }),
        h(
          ThreadListPrimitiveItems,
          { archived: true },
          {
            default: () => h(Item, { archived: true }),
          },
        ),
      ],
    });
    const { el, unmount } = mountChat(runtime, View);

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelectorAll(".regular-item")).toHaveLength(2);
    });

    findThreadItem(el, ".regular-item", "First thread")
      .querySelector<HTMLButtonElement>("button.archive")!
      .click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(onArchive).toHaveBeenCalledWith("t1");
      expect(
        findThreadItem(el, ".archived-item", "First thread"),
      ).toBeDefined();
    });

    findThreadItem(el, ".archived-item", "First thread")
      .querySelector<HTMLButtonElement>("button.unarchive")!
      .click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(onUnarchive).toHaveBeenCalledWith("t1");
      expect(findThreadItem(el, ".regular-item", "First thread")).toBeDefined();
    });

    findThreadItem(el, ".regular-item", "First thread")
      .querySelector<HTMLButtonElement>("button.delete")!
      .click();
    await vi.waitFor(async () => {
      await nextTick();
      expect(onDelete).toHaveBeenCalledWith("t1");
      expect(
        [...el.querySelectorAll<HTMLElement>(".regular-item")].some(
          (item) =>
            item.querySelector(".title")?.textContent === "First thread",
        ),
      ).toBe(false);
    });

    unmount();
  });
});
