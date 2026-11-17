import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, createSignal, type JSX } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAuiState } from "../useAuiState";
import { ThreadPrimitiveMessages } from "./ThreadPrimitiveMessages";
import { ThreadPrimitiveViewport } from "./ThreadPrimitiveViewport";
import { MessagePrimitiveRoot } from "./message";
import { MessagePrimitiveParts } from "./MessagePrimitiveParts";
import { ThreadListPrimitiveNew } from "./ThreadListPrimitiveNew";
import { ThreadListItemPrimitiveTrigger } from "./ThreadListItemPrimitiveTrigger";
import {
  ThreadListItemByIndexProvider,
  ThreadListItemPrimitiveTitle,
  ThreadListPrimitiveItems,
} from "./threadList";

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
    messages: threads.find((thread) => thread.id === currentId)?.messages ?? [],
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
      currentId = threads[0]?.id ?? "";
    }
    sync();
  };
  const reverseThreads = () => {
    threads = [...threads].reverse();
    sync();
  };
  const renameThread = (id: string, title: string) => {
    threads = threads.map((thread) =>
      thread.id === id ? { ...thread, title } : thread,
    );
    sync();
  };
  return {
    runtime,
    onSwitchToThread,
    onSwitchToNewThread,
    removeThread,
    reverseThreads,
    renameThread,
  };
};

const SidebarView = () => [
  createComponent(ThreadListPrimitiveNew, { class: "new", children: "New" }),
  createComponent(ThreadListPrimitiveItems, {
    get children() {
      return createComponent(ThreadListItemPrimitiveTrigger, {
        class: "item",
        get children() {
          return createComponent(ThreadListItemPrimitiveTitle, {
            fallback: "New Chat",
          });
        },
      });
    },
  }),
];

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  vi.restoreAllMocks();
});

const mountView = (runtime: AssistantRuntimeImpl, view: () => JSX.Element) => {
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
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return el;
};

const items = (el: HTMLElement) => [
  ...el.querySelectorAll<HTMLButtonElement>("button.item"),
];

describe("thread list primitives", () => {
  it("scrolls the viewport to the bottom on thread switch", async () => {
    const { runtime } = createMultiThreadRuntime();
    const el = mountView(runtime, () => [
      createComponent(SidebarView, {}),
      createComponent(ThreadPrimitiveViewport, {
        class: "viewport",
        scrollToBottomOnInitialize: false,
        get children() {
          return createComponent(ThreadPrimitiveMessages, {
            get children() {
              return createComponent(MessagePrimitiveRoot, {
                get children() {
                  return createComponent(MessagePrimitiveParts, {});
                },
              });
            },
          });
        },
      }),
    ]);
    const div = el.querySelector<HTMLElement>("div.viewport")!;
    Object.defineProperties(div, {
      scrollHeight: { get: () => 500, configurable: true },
      clientHeight: { get: () => 100, configurable: true },
    });
    const scrollTo = vi.fn();
    Object.defineProperty(div, "scrollTo", {
      value: scrollTo,
      configurable: true,
    });
    expect(div.textContent).toBe("hello from one");
    expect(scrollTo).not.toHaveBeenCalled();
    flushTapSync(() => items(el)[1]!.click());
    await vi.waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: "instant" });
      expect(div.textContent).toBe("hello from two");
      expect(div.querySelector('[data-message-id="m1"]')).toBeNull();
      expect(div.querySelector('[data-message-id="m2"]')).not.toBeNull();
    });
  });

  it("renders one scoped item per thread with titles", () => {
    const { runtime } = createMultiThreadRuntime();
    const el = mountView(runtime, SidebarView);
    expect(items(el).map((item) => item.textContent)).toEqual([
      "First thread",
      "Second thread",
    ]);
  });

  it("keeps component state with a thread after an earlier row is removed", async () => {
    const { runtime, removeThread } = createMultiThreadRuntime();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const StatefulItem = () => {
      const initialTitle = useAuiState((s) => s.threadListItem.title)();
      return createComponent(Dynamic, {
        component: "span",
        class: "stateful-item",
        children: initialTitle,
      });
    };
    const el = mountView(runtime, () =>
      createComponent(ThreadListPrimitiveItems, {
        get children() {
          return createComponent(StatefulItem, {});
        },
      }),
    );
    const second = el.querySelectorAll(".stateful-item")[1];
    flushTapSync(() => removeThread("t1"));
    await vi.waitFor(() => {
      expect(el.querySelectorAll(".stateful-item")).toHaveLength(1);
      expect(el.querySelector(".stateful-item")).toBe(second);
      expect(second!.textContent).toBe("Second thread");
    });
    expect(error).not.toHaveBeenCalled();
  });

  it("switches threads through the item trigger and swaps the thread state", () => {
    const { runtime, onSwitchToThread } = createMultiThreadRuntime();
    const el = mountView(runtime, SidebarView);
    const [first, second] = items(el);
    expect(first!.getAttribute("data-active")).toBe("true");
    expect(second!.hasAttribute("data-active")).toBe(false);
    flushTapSync(() => second!.click());
    expect(onSwitchToThread).toHaveBeenCalledWith("t2");
    expect(second!.getAttribute("aria-current")).toBe("true");
    expect(first!.hasAttribute("data-active")).toBe(false);
    expect(first!.hasAttribute("aria-current")).toBe(false);
    expect(runtime.thread.getState().messages[0]!.content[0]).toMatchObject({
      type: "text",
      text: "hello from two",
    });
  });

  it("starts a new thread through the new button", () => {
    const { runtime, onSwitchToNewThread } = createMultiThreadRuntime();
    const el = mountView(runtime, SidebarView);
    expect(items(el)).toHaveLength(2);
    flushTapSync(() =>
      el.querySelector<HTMLButtonElement>("button.new")!.click(),
    );
    expect(onSwitchToNewThread).toHaveBeenCalledTimes(1);
    expect(items(el)).toHaveLength(3);
    expect(items(el)[2]!.textContent).toBe("New Chat");
  });

  it("renders archived items separately with archived", () => {
    const { runtime } = createMultiThreadRuntime();
    const el = mountView(runtime, () => [
      createComponent(SidebarView, {}),
      createComponent(ThreadListPrimitiveItems, {
        archived: true,
        get children() {
          return createComponent(ThreadListItemPrimitiveTrigger, {
            class: "arch",
            get children() {
              return createComponent(ThreadListItemPrimitiveTitle, {});
            },
          });
        },
      }),
    ]);
    expect(items(el)).toHaveLength(2);
    expect(el.querySelectorAll("button.arch")).toHaveLength(1);
    expect(el.querySelector("button.arch")!.textContent).toBe("Archived one");
  });

  it("ignores clicks while disabled or default-prevented", () => {
    const { runtime, onSwitchToThread, onSwitchToNewThread } =
      createMultiThreadRuntime();
    const el = mountView(runtime, () => [
      createComponent(ThreadListPrimitiveNew, { class: "new", disabled: true }),
      createComponent(ThreadListPrimitiveItems, {
        get children() {
          return createComponent(ThreadListItemPrimitiveTrigger, {
            class: "item",
            onClick: (event) => event.preventDefault(),
          });
        },
      }),
    ]);
    const newButton = el.querySelector<HTMLButtonElement>("button.new")!;
    expect(newButton.disabled).toBe(true);
    newButton.disabled = false;
    flushTapSync(() => {
      newButton.click();
      items(el)[1]!.click();
    });
    expect(onSwitchToNewThread).not.toHaveBeenCalled();
    expect(onSwitchToThread).not.toHaveBeenCalled();
  });

  it("ignores item trigger clicks while disabled", () => {
    const { runtime, onSwitchToThread } = createMultiThreadRuntime();
    const el = mountView(runtime, () =>
      createComponent(ThreadListPrimitiveItems, {
        get children() {
          return createComponent(ThreadListItemPrimitiveTrigger, {
            class: "item",
            disabled: true,
          });
        },
      }),
    );
    const trigger = items(el)[1]!;
    expect(trigger.disabled).toBe(true);
    trigger.disabled = false;
    flushTapSync(() => trigger.click());
    expect(onSwitchToThread).not.toHaveBeenCalled();
  });

  it("renders children as the title fallback", () => {
    const { runtime } = createMultiThreadRuntime();
    const el = mountView(runtime, () => [
      createComponent(ThreadListPrimitiveNew, {
        class: "new",
        children: "New",
      }),
      createComponent(ThreadListPrimitiveItems, {
        get children() {
          return createComponent(ThreadListItemPrimitiveTrigger, {
            class: "item",
            get children() {
              return createComponent(ThreadListItemPrimitiveTitle, {
                fallback: "unused",
                get children() {
                  return createComponent(Dynamic, {
                    component: "em",
                    children: "Untitled",
                  });
                },
              });
            },
          });
        },
      }),
    ]);
    expect(items(el)[0]!.textContent).toBe("First thread");
    expect(el.querySelector("em")).toBeNull();
    flushTapSync(() =>
      el.querySelector<HTMLButtonElement>("button.new")!.click(),
    );
    expect(items(el)).toHaveLength(3);
    expect(items(el)[2]!.querySelector("em")!.textContent).toBe("Untitled");
  });

  it("keeps keyed rows and their live scopes through reorders", async () => {
    const { runtime, reverseThreads, onSwitchToThread } =
      createMultiThreadRuntime();
    const el = mountView(runtime, SidebarView);
    const [first, second] = items(el);
    flushTapSync(reverseThreads);
    await vi.waitFor(() => {
      expect(items(el)).toEqual([second, first]);
      expect(items(el).map((item) => item.textContent)).toEqual([
        "Second thread",
        "First thread",
      ]);
    });
    flushTapSync(() => items(el)[0]!.click());
    expect(onSwitchToThread).toHaveBeenCalledWith("t2");
  });

  it("updates a provider's live index and archived props", async () => {
    const { runtime } = createMultiThreadRuntime();
    const [index, setIndex] = createSignal(0);
    const [archived, setArchived] = createSignal(false);
    const el = mountView(runtime, () =>
      createComponent(ThreadListItemByIndexProvider, {
        get index() {
          return index();
        },
        get archived() {
          return archived();
        },
        get children() {
          return createComponent(ThreadListItemPrimitiveTitle, {});
        },
      }),
    );
    expect(el.textContent).toBe("First thread");
    setIndex(1);
    await vi.waitFor(() => expect(el.textContent).toBe("Second thread"));
    setIndex(0);
    setArchived(true);
    await vi.waitFor(() => expect(el.textContent).toBe("Archived one"));
  });

  it("changes the rendered list when archived changes and handles an empty list", async () => {
    const { runtime, removeThread } = createMultiThreadRuntime();
    const [archived, setArchived] = createSignal(false);
    const el = mountView(runtime, () =>
      createComponent(ThreadListPrimitiveItems, {
        get archived() {
          return archived();
        },
        get children() {
          return createComponent(ThreadListItemPrimitiveTrigger, {
            class: "item",
            get children() {
              return createComponent(ThreadListItemPrimitiveTitle, {});
            },
          });
        },
      }),
    );
    setArchived(true);
    expect(items(el).map((item) => item.textContent)).toEqual(["Archived one"]);
    setArchived(false);
    flushTapSync(() => {
      removeThread("t1");
      removeThread("t2");
    });
    await vi.waitFor(() => expect(items(el)).toHaveLength(0));
  });

  it("reacts to title and fallback changes without replacing the row", () => {
    const { runtime, renameThread } = createMultiThreadRuntime();
    const [fallback, setFallback] = createSignal("Untitled");
    const el = mountView(runtime, () =>
      createComponent(ThreadListItemByIndexProvider, {
        index: 0,
        get children() {
          return createComponent(ThreadListItemPrimitiveTitle, {
            get fallback() {
              return fallback();
            },
          });
        },
      }),
    );
    expect(el.textContent).toBe("First thread");
    flushTapSync(() => renameThread("t1", ""));
    expect(el.textContent).toBe("Untitled");
    setFallback("New Chat");
    expect(el.textContent).toBe("New Chat");
    flushTapSync(() => renameThread("t1", "Renamed"));
    expect(el.textContent).toBe("Renamed");
  });

  it("renders an empty title without a fallback and honors empty children", () => {
    const { runtime, renameThread } = createMultiThreadRuntime();
    flushTapSync(() => renameThread("t1", ""));
    const el = mountView(runtime, () =>
      createComponent(ThreadListItemByIndexProvider, {
        index: 0,
        get children() {
          return [
            createComponent(ThreadListItemPrimitiveTitle, {}),
            createComponent(ThreadListItemPrimitiveTitle, {
              fallback: "unused",
              get children() {
                return null;
              },
            }),
          ];
        },
      }),
    );
    expect(el.textContent).toBe("");
  });

  it("forwards trigger refs and runs a bound handler before switching", () => {
    const { runtime, onSwitchToThread } = createMultiThreadRuntime();
    const ref = vi.fn();
    const onClick = vi.fn((data: string, event: MouseEvent) => {
      expect(data).toBe("bound");
      expect(onSwitchToThread).not.toHaveBeenCalled();
      expect(event.currentTarget).toBe(ref.mock.calls[0]![0]);
    });
    const el = mountView(runtime, () =>
      createComponent(ThreadListItemByIndexProvider, {
        index: 1,
        get children() {
          return createComponent(ThreadListItemPrimitiveTrigger, {
            ref,
            onClick: [onClick, "bound"],
            children: "Switch",
          });
        },
      }),
    );
    expect(ref).toHaveBeenCalledWith(el.querySelector("button"));
    flushTapSync(() => el.querySelector("button")!.click());
    expect(onClick).toHaveBeenCalledOnce();
    expect(onSwitchToThread).toHaveBeenCalledWith("t2");
  });
});
